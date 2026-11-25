import Link from "next/link";
import { requireAdmin } from "../../../lib/admin";
import { isLoadId } from "../../../lib/load-fields";
import { formatFreight } from "../../../lib/load-offers";
import { AutoRefresh } from "../../auto-refresh";
import { CommissionForm } from "../../commission-form";
import { CommissionList, commissionPage, commissionPageSize, type Commission } from "../../commission-list";
import { WorkspaceHeading } from "../../workspace";
import { CommissionTotals } from "../commission-totals";
import { recordReceivedCommission, verifyCommission } from "./actions";

const statuses = { outstanding: "All outstanding", pending: "Unpaid", submitted: "Awaiting verification", paid: "Paid" };
const tripStages = { assigned: "Assigned", dispatched: "Dispatched", delivered: "Delivered" };
const path = "/admin/commissions";

type CompanyTotal = {
  company_id: string; company_name: string; booking_count: number;
  total_paise: number; pending_paise: number; paid_paise: number;
};

function validOption(value: string | undefined, options: Record<string, string>) {
  return value && Object.hasOwn(options, value) ? value : "";
}

export default async function AdminCommissions({ searchParams }: {
  searchParams: Promise<{ page?: string; view?: string; company?: string; status?: string; trip?: string; q?: string }>;
}) {
  const supabase = await requireAdmin();
  const params = await searchParams;
  const page = commissionPage(params.page);
  const company = typeof params.company === "string" && isLoadId(params.company) ? params.company : "";
  const view = params.view === "bookings" || company ? "bookings" : "companies";
  const status = validOption(params.status, statuses);
  const trip = validOption(params.trip, tripStages);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const { data, error } = await supabase.rpc("admin_commission_overview", {
    view_kind: view, company_filter: company || null, payment_filter: status || null,
    trip_filter: trip || null, search_text: query || null, page_offset: (page - 1) * commissionPageSize,
  });
  const overview = data && typeof data === "object" ? data as {
    company_name?: string; summary?: unknown; companies?: CompanyTotal[]; bookings?: Commission[];
  } : {};
  const companies = Array.isArray(overview.companies) ? overview.companies : [];
  const records = Array.isArray(overview.bookings) ? overview.bookings : [];
  const filtered = Boolean(company || status || trip || query);

  function url(where: string, id = "", destination = 1) {
    const next = new URLSearchParams({ view: where });
    if (id) next.set("company", id);
    if (status) next.set("status", status);
    if (trip) next.set("trip", trip);
    if (query) next.set("q", query);
    if (destination > 1) next.set("page", String(destination));
    return `${path}?${next}`;
  }

  return (
    <section className="grid gap-5">
      <AutoRefresh />
      <WorkspaceHeading label="Administrator" title="Company commissions"
        description="See totals by company and review payment for each confirmed booking."
        action={<Link className="button-outline" href="/admin/dashboard">Back to admin dashboard</Link>} />
      <nav className="flex flex-wrap gap-3" aria-label="Commission views">
        <Link href={url("companies")} aria-current={view === "companies" ? "page" : undefined} className={view === "companies" ? "button" : "button-outline"}>By company</Link>
        <Link href={url("bookings")} aria-current={view === "bookings" ? "page" : undefined} className={view === "bookings" ? "button" : "button-outline"}>By booking</Link>
      </nav>
      <form action={path} method="get" key={JSON.stringify([view, company, status, trip, query])} className="panel p-5">
        <input type="hidden" name="view" value={view} />
        {company && <input type="hidden" name="company" value={company} />}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field">Search<input name="q" defaultValue={query} maxLength={100} placeholder="Company, driver, route, or reference" /></label>
          <label className="field">Commission status<select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field">Trip status<select name="trip" defaultValue={trip}>
            <option value="">All trips</option>
            {Object.entries(tripStages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="submit" className="button">Apply filters</button>
          {filtered && <Link href={`${path}?view=${view}`} className="text-link py-2 text-sm">Clear filters</Link>}
          {company && <p className="rounded-xl bg-[#edf4ef] px-3 py-2 text-sm font-semibold">
            {overview.company_name ?? "Selected company"} <Link href={url("bookings")} className="text-link ml-2">Show all companies</Link>
          </p>}
        </div>
      </form>
      <section className="grid gap-2" aria-label="Commission totals">
        <h2 className="text-lg font-bold">{filtered ? "Filtered totals" : "All company totals"}</h2>
        <CommissionTotals data={overview.summary} />
        <p className="text-sm text-[#50645c]">Pending includes payments awaiting verification. Delivery does not settle a commission.</p>
      </section>

      {view === "companies" ? (
        <section className="panel overflow-hidden">
          <h2 className="px-5 pt-5 text-xl font-bold">Company commission balances</h2>
          {error ? <p role="alert" className="p-5">Commission totals are temporarily unavailable.</p>
            : companies.length === 0 ? <p className="p-5 text-sm text-[#50645c]">No companies match these filters.</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-[#edf4ef]"><tr>{["Company", "Bookings", "Total", "Pending", "Paid"].map((label) =>
                  <th scope="col" key={label} className="px-5 py-3">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#dbe4dc]">
                  {companies.slice(0, commissionPageSize).map((row) => (
                    <tr key={row.company_id}>
                      <th scope="row" className="px-5 py-3"><Link className="text-link" href={url("bookings", row.company_id)}>{row.company_name}</Link></th>
                      <td className="px-5 py-3">{row.booking_count}</td>
                      <td className="px-5 py-3">{formatFreight(row.total_paise)}</td>
                      <td className="px-5 py-3 font-semibold">{formatFreight(row.pending_paise)}</td>
                      <td className="px-5 py-3">{formatFreight(row.paid_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!error && (page > 1 || companies.length > commissionPageSize) && (
            <nav aria-label="Company pages" className="flex items-center gap-3 p-5 text-sm">
              {page > 1 && <Link href={url("companies", "", page - 1)} className="button-outline">Previous</Link>}
              <span>Page {page}</span>
              {page < 501 && companies.length > commissionPageSize && <Link href={url("companies", "", page + 1)} className="button-outline">Next</Link>}
            </nav>
          )}
        </section>
      ) : (
        <>
          <h2 className="text-xl font-bold">Booking commission</h2>
          <CommissionList records={records} error={Boolean(error)} page={page} path={path}
            pageHref={(number) => url("bookings", company, number)}
            renderAction={(record) => record.commission_status !== "paid" && (
              <details className="mt-4 rounded-xl border border-[#dbe4dc] p-4">
                <summary className="cursor-pointer font-semibold">
                  {record.commission_status === "submitted" ? "Verify submitted payment" : "Record payment received"}
                </summary>
                {record.commission_status === "submitted" && record.payment_reference
                  ? <CommissionForm verify action={verifyCommission.bind(null, record.offer_id, record.payment_reference)} />
                  : <CommissionForm verify collectReference action={recordReceivedCommission.bind(null, record.offer_id)} />}
              </details>
            )} />
        </>
      )}
    </section>
  );
}
