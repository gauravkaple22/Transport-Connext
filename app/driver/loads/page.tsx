import Link from "next/link";
import { formatLoadingDate, indiaToday, isLoadingDate, truckTypes } from "../../../lib/load-fields";
import { formatExpectedPayment } from "../../../lib/load-offers";
import { requireDriver } from "../../../lib/driver";
import { InterestForm } from "./interest-form";

export const dynamic = "force-dynamic";

type Load = {
  load_id: string;
  company_name: string;
  pickup_city: string;
  destination_city: string;
  loading_date: string;
  cargo_type: string;
  truck_type: string;
  vehicle_size_feet?: number | null;
  interest_sent?: boolean;
  requested_paise?: number | null;
  expected_min_paise?: number | null;
  expected_max_paise?: number | null;
};

const pageSize = 20;
const lastPage = 501;
const loadsPath = "/driver/loads";

function getFilter(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function DriverLoads({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireDriver();
  const params = await searchParams;
  const pickup = getFilter(params.pickup).trim().slice(0, 80);
  const dateInput = getFilter(params.date);
  const date = isLoadingDate(dateInput) ? dateInput : "";
  const truckInput = getFilter(params.truck);
  const truck = truckTypes.some(({ value }) => value === truckInput) ? truckInput : "";
  const pageNumber = Number(getFilter(params.page));
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= lastPage ? pageNumber : 1;
  const filterKey = JSON.stringify([pickup, date, truck]);

  const { data, error } = await supabase.rpc("browse_driver_loads", {
    pickup_filter: pickup || null, date_filter: date || null,
    truck_filter: truck || null, page_offset: (page - 1) * pageSize,
  });

  const rows: Load[] = Array.isArray(data) ? data : [];
  const loads = rows.slice(0, pageSize);
  function pageHref(destination: number) {
    const query = new URLSearchParams();
    if (pickup) query.set("pickup", pickup);
    if (date) query.set("date", date);
    if (truck) query.set("truck", truck);
    query.set("page", String(destination));
    return `${loadsPath}?${query}`;
  }

  return (
    <section className="w-full">
      <div className="flex flex-wrap gap-5">
        <Link href="/driver/dashboard" className="text-link inline-block py-2 text-sm">Back to dashboard</Link>
        <Link href="/driver/offers" className="text-link inline-block py-2 text-sm">My offers</Link>
      </div>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Browse loads</h1>
      <p className="mt-2 text-[#50645c]">Find an open load, then request a payment within the company's range.</p>

      <form key={filterKey} action={loadsPath} method="get" className="panel mt-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field">
            Pickup city
            <input name="pickup" defaultValue={pickup} placeholder="e.g. Pune" maxLength={80} />
          </label>
          <label className="field">
            Loading date
            <input type="date" name="date" min={indiaToday()} defaultValue={date} />
          </label>
          <label className="field">
            Truck type
            <select name="truck" defaultValue={truck}>
              <option value="">All trucks</option>
              {truckTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button className="button" type="submit">Find loads</button>
          {(pickup || date || truck) && <Link href={loadsPath} className="text-link py-2 text-sm">Clear filters</Link>}
        </div>
      </form>

      {error ? (
        <div className="panel mt-5 p-6">
          <p role="alert">Loads are temporarily unavailable. Please try again.</p>
          <Link href={pageHref(page)} className="text-link mt-3 inline-block">Try again</Link>
        </div>
      ) : loads.length === 0 ? (
        <div className="panel mt-5 p-6">
          <h2 className="text-xl font-bold">No loads found</h2>
          <p className="mt-2 text-[#50645c]">
            {pickup || date || truck ? "Try changing or clearing your filters." : "Check back when companies post new loads."}
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2" aria-label="Open loads">
          {loads.map((load, index) => (
            <li key={`${load.load_id}-${index}`} className="panel min-w-0 p-5 sm:p-6">
              <p className="break-words text-sm font-semibold text-[#50645c]">{load.company_name}</p>
              <h2 className="mt-1 break-words text-xl font-bold">{load.pickup_city} to {load.destination_city}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Loading date</dt>
                  <dd className="mt-1 text-[#50645c]">{formatLoadingDate(load.loading_date)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Truck required</dt>
                  <dd className="mt-1 text-[#50645c]">{truckTypes.find(({ value }) => value === load.truck_type)?.label}{load.vehicle_size_feet != null && ` · ${load.vehicle_size_feet} ft`}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Expected payment</dt>
                  <dd className="mt-1 font-semibold text-[#164e43]">{formatExpectedPayment(load.expected_min_paise, load.expected_max_paise)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Cargo</dt>
                  <dd className="mt-1 break-words text-[#50645c]">{load.cargo_type}</dd>
                </div>
              </dl>
              {typeof load.interest_sent === "boolean" && (
                <div className="mt-4 border-t border-[#dbe4dc] pt-3">
                  {typeof load.expected_min_paise === "number" && typeof load.expected_max_paise === "number" ? (
                    <InterestForm loadId={load.load_id} min={load.expected_min_paise} max={load.expected_max_paise}
                      requested={load.requested_paise} interestSent={load.interest_sent} />
                  ) : (
                    <p className="text-sm text-[#50645c]">Payment requests are unavailable until a payment range is provided.</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!error && (page > 1 || rows.length > pageSize) && (
        <nav aria-label="Loads pages" className="mt-6 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && rows.length > pageSize &&
            <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
    </section>
  );
}
