import Link from "next/link";
import { requireCompany } from "../../../lib/company";
import { formatExpectedPayment } from "../../../lib/load-offers";
import { CloseLoadForm } from "./close-load-form";
import { formatLoadingDate, truckTypes } from "../../../lib/load-fields";

export const dynamic = "force-dynamic";
const pageSize = 20;

export default async function CompanyLoads({
  searchParams,
}: { searchParams: Promise<{ notice?: string; page?: string }> }) {
  const { supabase, userId } = await requireCompany("/company/login?next=loads");
  const { notice, page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000 ? requestedPage : 1;
  const start = (page - 1) * pageSize;
  const { data, error } = await supabase.from("company_loads")
    .select("id,pickup_city,destination_city,loading_date,cargo_type,truck_type,vehicle_size_feet,notes,status,expected_min_paise,expected_max_paise,pickup_address,delivery_address")
    .eq("company_id", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + pageSize);

  const loads = data?.slice(0, pageSize) ?? [];
  const statusMessage = notice === "posted" ? "Load posted." : notice === "closed" ? "Load closed." : null;

  return (
    <section className="mx-auto max-w-5xl">
      <Link href="/company/dashboard" className="text-link text-sm">Company dashboard</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">My loads</h1>
          <p className="mt-2 text-[#50645c]">Post transport requirements and manage your loads.</p>
        </div>
        <Link href="/company/loads/new" className="button">+ Post a load</Link>
      </div>

      {statusMessage && <p role="status" className="mt-5 rounded-xl bg-[#edf4ef] p-3 text-sm">{statusMessage}</p>}
      {notice === "close-failed" && (
        <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">Could not close this load. It may already be closed.</p>
      )}

      {error ? (
        <div className="panel mt-6 p-6">
          <p role="alert">We couldn't load your posts right now.</p>
          <Link href="/company/loads" className="text-link mt-3 inline-block">Try again</Link>
        </div>
      ) : loads.length === 0 ? (
        <div className="panel mt-6 p-8 text-center sm:p-12">
          <h2 className="text-xl font-bold">{page === 1 ? "No loads posted yet" : "No loads on this page"}</h2>
          {page === 1 ? (
            <p className="mt-2 text-[#50645c]">Use Post a load to add your first transport requirement.</p>
          ) : <Link href="/company/loads" className="text-link mt-3 inline-block">Back to the first page</Link>}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {loads.map((load) => (
            <li key={load.id} className="panel flex min-w-0 flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-xl font-bold">{load.pickup_city} to {load.destination_city}</h2>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${load.status === "open" ? "bg-[#edf4ef] text-[#164e43]" : "bg-stone-100 text-stone-700"}`}>
                  {load.status === "open" ? "Open" : "Closed"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold">Loading date</dt><dd className="mt-1 text-[#50645c]">{formatLoadingDate(load.loading_date)}</dd></div>
                <div><dt className="font-semibold">Truck required</dt><dd className="mt-1 text-[#50645c]">{truckTypes.find(({ value }) => value === load.truck_type)?.label}{load.vehicle_size_feet != null && ` · ${load.vehicle_size_feet} ft`}</dd></div>
                <div><dt className="font-semibold">Cargo</dt><dd className="mt-1 break-words text-[#50645c]">{load.cargo_type}</dd></div>
                <div>
                  <dt className="font-semibold">Expected payment</dt>
                  <dd className="mt-1 text-[#50645c]">
                    {formatExpectedPayment(load.expected_min_paise, load.expected_max_paise)}
                  </dd>
                </div>
                {load.pickup_address && <div className="sm:col-span-2"><dt className="font-semibold">Pickup address</dt><dd className="mt-1 whitespace-pre-line break-words text-[#50645c]">{load.pickup_address}</dd></div>}
                {load.delivery_address && <div className="sm:col-span-2"><dt className="font-semibold">Delivery address</dt><dd className="mt-1 whitespace-pre-line break-words text-[#50645c]">{load.delivery_address}</dd></div>}
                {load.notes && <div className="sm:col-span-2"><dt className="font-semibold">Loading instructions</dt><dd className="mt-1 whitespace-pre-line break-words text-[#50645c]">{load.notes}</dd></div>}
              </dl>
              <Link href={`/company/loads/${load.id}/interest`} className="text-link mt-4 self-start py-1 text-sm">Driver requests</Link>
              {load.status === "open" && (
                <CloseLoadForm id={load.id} />
              )}
            </li>
          ))}
        </ul>
      )}

      {data && (page > 1 || data.length > pageSize) && (
        <nav aria-label="Loads pages" className="mt-6 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={`/company/loads?page=${page - 1}`} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < 10000 && data.length > pageSize && <Link href={`/company/loads?page=${page + 1}`} className="button-outline">Next</Link>}
        </nav>
      )}
    </section>
  );
}
