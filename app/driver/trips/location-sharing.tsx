"use client";

import { useEffect, useState } from "react";
import { shareTripLocation } from "./actions";

const updateInterval = 3000;

export function LocationSharing({ offerId }: { offerId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!enabled) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage("Location sharing needs a supported browser on a secure connection.");
      setEnabled(false);
      return;
    }

    let active = true;
    let latest: GeolocationPosition | undefined;
    let lastAttempt = 0;
    let inProgress = false;
    let lastSentFix = 0;

    async function upload() {
      const now = Date.now();
      if (!active || !latest || latest.timestamp <= lastSentFix || now - latest.timestamp > 20000 || inProgress || now - lastAttempt < updateInterval
        || document.visibilityState !== "visible" || !navigator.onLine) return;

      lastAttempt = now;
      inProgress = true;
      const fix = latest;
      const { latitude, longitude, accuracy } = fix.coords;
      try {
        const saved = await shareTripLocation(offerId, latitude, longitude, accuracy);
        if (saved) lastSentFix = fix.timestamp;
        if (active) setMessage(saved ? "Sharing location with the company." : "Location could not be sent. Check your trip status.");
      } catch {
        if (active) setMessage("Location could not be sent. We'll try again when connected.");
      } finally {
        inProgress = false;
      }
    }

    const watch = navigator.geolocation.watchPosition((position) => {
      latest = position;
      void upload();
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setMessage("Location permission is off. Allow location in your browser, then try again.");
        setEnabled(false);
      } else {
        setMessage("Waiting for your phone to find its location.");
      }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });

    const interval = window.setInterval(() => void upload(), 2000);
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(interval);
    };
  }, [enabled, offerId]);

  return (
    <div className="rounded-xl bg-[#edf4ef] p-4">
      <p className="text-sm">The company can see your latest location while you share it. Keep this page open during the trip.</p>
      {message && <p role="status" className="mt-2 text-sm font-semibold">{message}</p>}
      <button type="button" className="button-outline mt-3" onClick={() => {
        setMessage(enabled ? "Location sharing paused." : "Waiting for location permission and a GPS fix.");
        setEnabled(!enabled);
      }}>{enabled ? "Pause location sharing" : "Share my location"}</button>
    </div>
  );
}
