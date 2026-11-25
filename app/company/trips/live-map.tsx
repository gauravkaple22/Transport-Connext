"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState } from "react";
import type { Circle, CircleMarker, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type TripPosition = {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  location_at: string;
};

const time = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Kolkata",
});

function positionFromRow(row: Record<string, unknown>): TripPosition | null {
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number" || typeof row.location_at !== "string"
    || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || !Number.isFinite(Date.parse(row.location_at))) return null;
  return {
    latitude: row.latitude, longitude: row.longitude, location_at: row.location_at,
    accuracy_m: typeof row.accuracy_m === "number" ? row.accuracy_m : null,
  };
}

function MapCanvas({ position }: { position: TripPosition }) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(position);
  const layers = useRef<{ map: LeafletMap; marker: CircleMarker; accuracy: Circle } | null>(null);
  const [following, setFollowing] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    latest.current = position;
    const active = layers.current;
    if (!active) return;

    const point: [number, number] = [position.latitude, position.longitude];
    active.marker.setLatLng(point);
    active.accuracy.setLatLng(point).setRadius(position.accuracy_m ?? 0);
    if (following && active.map.distance(active.map.getCenter(), point) > 20) {
      active.map.panTo(point, { animate: false });
    }
  }, [position, following]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    let resize: ResizeObserver | undefined;

    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const location = latest.current;
      const point: [number, number] = [location.latitude, location.longitude];

      map = L.map(container.current, { preferCanvas: true, scrollWheelZoom: false })
        .setView(point, 15);
      L.tileLayer(process.env.NEXT_PUBLIC_TRIP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).on("tileerror", () => setMapError(true))
        .on("tileload", () => setMapError(false))
        .addTo(map);

      const accuracy = L.circle(point, {
        radius: location.accuracy_m ?? 0, color: "#25806e", weight: 1, fillOpacity: 0.12, interactive: false,
      }).addTo(map);
      const marker = L.circleMarker(point, {
        radius: 9, color: "#fff", weight: 3, fill: true, fillColor: "#12715c", fillOpacity: 1, interactive: false,
      }).addTo(map);
      layers.current = { map, marker, accuracy };
      map.on("dragstart", () => setFollowing(false));
      resize = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
      resize.observe(container.current);
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
      layers.current = null;
    };
  }, []);

  return (
    <>
      <div ref={container} role="region" aria-label="Map showing the driver's last shared location"
        className="isolate h-72 overflow-hidden rounded-xl border border-[#dbe4dc] bg-[#e3ede8] sm:h-96" />
      {mapError && <p role="status" className="text-sm text-[#50645c]">Map tiles are temporarily unavailable.</p>}
      {!following && (
        <button type="button" className="button-outline w-fit" onClick={() => {
          layers.current?.map.panTo([position.latitude, position.longitude], { animate: false });
          setFollowing(true);
        }}>Center on driver</button>
      )}
    </>
  );
}

function LiveLocation({ offerId, initial }: { offerId: string; initial: TripPosition | null }) {
  const [livePosition, setLivePosition] = useState<TripPosition | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const position = livePosition && (!initial || Date.parse(livePosition.location_at) > Date.parse(initial.location_at))
    ? livePosition : initial;

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const channel = supabase.channel(`trip-location:${offerId}`);
    let active = true;

    let finished = false;
    let reading = false;
    let lastEvent = 0;

    function applyRow(row: Record<string, unknown>) {
      if (!active || finished) return;
      if (typeof row.delivered_at === "string") {
        finished = true;
        setEnded(true);
        void supabase.removeChannel(channel);
        return;
      }
      const next = positionFromRow(row);
      if (next) setLivePosition((previous) =>
        !previous || Date.parse(next.location_at) >= Date.parse(previous.location_at) ? next : previous);
    }

    async function checkLocation() {
      if (!active || finished || reading || !navigator.onLine || document.visibilityState !== "visible") return;
      reading = true;
      try {
        const { data } = await supabase.from("load_trip_tracking")
          .select("latitude,longitude,accuracy_m,location_at,delivered_at").eq("offer_id", offerId).maybeSingle();
        if (data) applyRow(data);
      } finally {
        reading = false;
      }
    }

    function catchUp() {
      void checkLocation().catch(() => undefined);
    }

    const interval = window.setInterval(() => {
      if (Date.now() - lastEvent > 10000) catchUp();
    }, 5000);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    catchUp();

    async function subscribe() {
      await supabase.realtime.setAuth();
      if (!active) return;
      channel.on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "load_trip_tracking", filter: `offer_id=eq.${offerId}`,
      }, ({ new: row }) => {
        lastEvent = Date.now();
        applyRow(row);
      }).subscribe((status) => {
        if (active) setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") catchUp();
      });
    }
    void subscribe().catch(() => { if (active) setConnected(false); });

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
      void supabase.removeChannel(channel);
    };
  }, [offerId]);

  if (ended) return <p className="mt-3 text-sm text-[#50645c]">Delivered. Location sharing has ended.</p>;

  return (
    <div className="mt-3 grid gap-3">
      {position ? <MapCanvas position={position} /> : <p className="rounded-xl bg-[#edf4ef] p-4 text-sm">Waiting for the driver to share a location.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#50645c]">
        <p>{position ? `Last shared ${time.format(new Date(position.location_at))}` : "The map appears after the first GPS update."}</p>
        <p>{connected ? "Live updates connected" : "Checking periodically for updates"}</p>
      </div>
    </div>
  );
}

export function LiveTripMap({ offerId, initial, initiallyOpen }: {
  offerId: string; initial: TripPosition | null; initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-xl border border-[#dbe4dc] p-3 sm:p-4">
      <summary className="cursor-pointer font-semibold">Driver location map</summary>
      {open && <LiveLocation offerId={offerId} initial={initial} />}
    </details>
  );
}
