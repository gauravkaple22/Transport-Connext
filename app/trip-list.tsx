import Link from "next/link";
import { formatLoadingDate } from "../lib/load-fields";
import { formatFreight } from "../lib/load-offers";
import { AutoRefresh } from "./auto-refresh";
import { DispatchForm } from "./company/trips/dispatch-form";
import { LiveTripMap } from "./company/trips/live-map";
import { TripControls } from "./driver/trips/trip-controls";
import { WorkspaceHeading } from "./workspace";

export type Trip = {
  offer_id: string; load_id?: string | null; advance_recorded?: boolean | null; company_name: string; driver_name: string; pickup_city: string; destination_city: string;
  pickup_address: string | null; delivery_address: string | null; loading_date: string; amount_paise: number;
  status: "assigned" | "dispatched" | "delivered"; dispatched_at: string | null; delivered_at: string | null;
  location_at: string | null; latitude: number | null; longitude: number | null; accuracy_m: number | null;
};

type TripSource = { data: Trip[]; error: boolean; page: number };

const pageSize = 20;
const lastPage = 501;
const statusText = { assigned: "Assigned", dispatched: "Dispatched", delivered: "Delivered" };
const timestamp = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});

export function tripPageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= lastPage ? page : 1;
}

export function TripList({ role, source }: { role: "company" | "driver"; source: TripSource }) {
  const { data, error, page } = source;
  const firstDispatched = data.find((trip) => trip.status === "dispatched")?.offer_id;
  const pageHref = (number: number) => `/${role}/trips?page=${number}`;

  return (
    <>
      {(role === "company" || data.some((trip) => trip.status === "assigned")) && <AutoRefresh />}
      <WorkspaceHeading label={role === "company" ? "Company workspace" : "Driver workspace"}
        title={role === "company" ? "Trips" : "My trips"}
        description={role === "company" ? "Dispatch assigned loads and follow their location and delivery."
          : "Check the full route and share your location once the company dispatches the load."} />
      {error ? <p role="alert" className="panel p-5">Trips are temporarily unavailable. <Link href={pageHref(page)} className="text-link">Try again</Link></p>
        : data.length === 0 ? <p className="panel p-5">{page > 1 ? "No trips on this page." : "Trips appear here after the driver accepts an offer."}</p>
        : (
          <ul className="grid gap-4">
            {data.slice(0, pageSize).map((trip) => (
              <li key={trip.offer_id} className="panel grid min-w-0 gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="break-words text-xl font-bold">{trip.pickup_city} to {trip.destination_city}</h2>
                    <p className="mt-1 break-words text-sm text-[#50645c]">
                      {role === "driver" ? trip.company_name : trip.driver_name} · {formatLoadingDate(trip.loading_date)} · {formatFreight(trip.amount_paise)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#edf4ef] px-3 py-2 text-sm font-semibold">{statusText[trip.status]}</span>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-xl bg-stone-50 p-3">
                    <dt className="text-sm font-bold">Pickup address</dt>
                    <dd className="mt-1 whitespace-pre-line break-words text-sm text-[#50645c]">{trip.pickup_address || "Full address not provided"}</dd>
                  </div>
                  <div className="min-w-0 rounded-xl bg-stone-50 p-3">
                    <dt className="text-sm font-bold">Delivery address</dt>
                    <dd className="mt-1 whitespace-pre-line break-words text-sm text-[#50645c]">{trip.delivery_address || "Full address not provided"}</dd>
                  </div>
                </dl>
                {trip.delivered_at && <p className="text-sm text-[#50645c]">Delivered {timestamp.format(new Date(trip.delivered_at))}</p>}
                {role === "company" && trip.status === "assigned" && (
                  trip.advance_recorded ? <DispatchForm offerId={trip.offer_id} /> : (
                    <div className="rounded-xl bg-[#edf4ef] p-4 text-sm">
                      <p className="font-semibold">70% advance required before dispatch</p>
                      <p className="mt-1 text-[#50645c]">Pay the driver and record the transfer reference to unlock dispatch.</p>
                      <Link href={trip.load_id ? `/company/loads/${trip.load_id}/interest` : "/company/payments"}
                        className="text-link mt-2 inline-block">Record advance</Link>
                    </div>
                  )
                )}
                {role === "company" && trip.status === "dispatched" && (
                  <LiveTripMap offerId={trip.offer_id} initiallyOpen={trip.offer_id === firstDispatched}
                    initial={trip.location_at && trip.latitude != null && trip.longitude != null ? {
                      latitude: trip.latitude, longitude: trip.longitude, accuracy_m: trip.accuracy_m, location_at: trip.location_at,
                    } : null} />
                )}
                {role === "driver" && <TripControls offerId={trip.offer_id} status={trip.status} />}
              </li>
            ))}
          </ul>
        )}
      {!error && (page > 1 || data.length > pageSize) && (
        <nav aria-label="Trips pages" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && data.length > pageSize && <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
    </>
  );
}
