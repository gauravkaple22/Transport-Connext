import Link from "next/link";
import { requireAdmin } from "../../../lib/admin";
import { formatLoadingDate, truckTypes } from "../../../lib/load-fields";
import { formatFreight, offerStatusLabel, type OfferStatus } from "../../../lib/load-offers";
import { AutoRefresh } from "../../auto-refresh";
import { SubmitButton } from "../../driver/form-controls";
import { WorkspaceHeading } from "../../workspace";
import { logoutAdmin } from "../actions";
import { CommissionTotals } from "../commission-totals";

const categories = {
  companies: "Companies",
  drivers: "Drivers",
  loads: "Loads",
  offers: "Offers",
  assignments: "Trips",
  payments: "Recorded payments",
} as const;

type Category = keyof typeof categories;
type AdminRecord = { key: string } & Record<string, string | number | null>;
const pageSize = 20;
const lastPage = 10001;
const timestamp = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});
const numberFormat = new Intl.NumberFormat("en-IN");

function text(record: AdminRecord, key: string) {
  return typeof record[key] === "string" ? record[key] : "";
}

function dateTime(record: AdminRecord, key: string) {
  const value = text(record, key);
  return value ? timestamp.format(new Date(value)) : "";
}

function fieldsFor(record: AdminRecord, category: Category): [string, string][] {
  if (category === "companies") return [
    ["Contact", text(record, "contact")], ["Work email", text(record, "email")],
    ["Mobile", text(record, "mobile")], ["City", text(record, "city")], ["State", text(record, "state")],
    ["GSTIN", text(record, "gstin")], ["Registered", dateTime(record, "created_at")],
  ];
  if (category === "drivers") {
    const digits = text(record, "mobile");
    return [["Mobile", digits && (digits.startsWith("+") ? digits : `+${digits}`)], ["Registered", dateTime(record, "created_at")]];
  }
  const when = text(record, "loading_date");
  const common: [string, string][] = [["Company", text(record, "company")], ["Loading date", when ? formatLoadingDate(when) : ""]];
  if (category === "loads") return [...common,
    ["Status", record.status === "open" ? "Open" : "Closed"], ["Cargo", text(record, "cargo")],
    ["Truck", truckTypes.find(({ value }) => value === record.truck)?.label ?? ""],
    ["Pickup address", text(record, "pickup_address")], ["Delivery address", text(record, "delivery_address")], ["Notes", text(record, "notes")], ["Posted", dateTime(record, "created_at")],
  ];
  const stage = text(record, "trip_status");
  return [...common, ["Driver", text(record, "driver")], ["Offer status", offerStatusLabel(record.status as OfferStatus)],
    ["Trip status", stage ? stage[0].toUpperCase() + stage.slice(1) : ""], ["Dispatched", dateTime(record, "dispatched_at")], ["Delivered", dateTime(record, "delivered_at")],
    ["Payment amount", typeof record.amount_paise === "number" ? formatFreight(record.amount_paise) : ""],
    ["Offered", dateTime(record, "created_at")], ["Driver response", dateTime(record, "responded_at")],
    ["Payment recorded", dateTime(record, "payment_recorded_at")], ["Payment reference", text(record, "payment_reference")],
  ];
}

export default async function AdminDashboard({
  searchParams,
}: { searchParams: Promise<{ view?: string; page?: string; notice?: string; q?: string; trip?: string }> }) {
  const supabase = await requireAdmin();
  const { view, page: requestedPage, notice, q, trip } = await searchParams;
  const category = view && Object.hasOwn(categories, view) ? view as Category : "companies";
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const tripStatus = category === "assignments" && typeof trip === "string" && ["assigned", "dispatched", "delivered"].includes(trip) ? trip : "";
  const parsedPage = Number(requestedPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage >= 1 && parsedPage <= lastPage ? parsedPage : 1;
  const [summary, result, commission] = await Promise.all([
    supabase.rpc("admin_dashboard_summary"),
    supabase.rpc("admin_monitor_records", { category, page_offset: (page - 1) * pageSize, search_text: query || null, trip_filter: tripStatus || null }),
    supabase.rpc("admin_commission_summary"),
  ]);
  const totals = summary.data && typeof summary.data === "object" ? summary.data as Partial<Record<Category, number>> : {};
  const rows: AdminRecord[] = Array.isArray(result.data) ? result.data : [];
  const pageHref = (destination: number) => `/admin/dashboard?${new URLSearchParams({ view: category, page: String(destination), ...(query && { q: query }), ...(tripStatus && { trip: tripStatus }) })}`;

  return (
    <div className="grid gap-5">
      <AutoRefresh />
      <WorkspaceHeading label="Administrator" title="Platform overview"
        description="Monitor registrations, load activity, and company-recorded payments."
        action={<form action={logoutAdmin}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>} />
      {notice === "logout-failed" && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">Could not log out. Please try again.</p>}
      <nav aria-label="Admin sections" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(categories) as Category[]).map((name) => (
          <Link key={name} href={`/admin/dashboard?view=${name}`} aria-current={category === name ? "page" : undefined}
            className={`panel p-4 hover:border-[#719d8e] ${category === name ? "outline-2 outline-[#9dbdad]" : ""}`}>
            <span className="block text-sm font-semibold">{categories[name]}</span>
            <span className="mt-1 block text-2xl font-extrabold">{typeof totals[name] === "number" ? numberFormat.format(totals[name]) : "—"}</span>
          </Link>
        ))}
      </nav>
      <section aria-labelledby="commission-heading" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="commission-heading" className="text-2xl font-extrabold">Platform commission</h2>
          <Link href="/admin/commissions" className="button-outline">View company and booking commissions</Link>
        </div>
        <CommissionTotals data={commission.data} />
      </section>
      <section aria-labelledby="admin-list-heading" className="grid gap-4">
        <h2 id="admin-list-heading" className="text-2xl font-extrabold">{categories[category]}</h2>
        {category === "assignments" && <p className="text-sm text-[#50645c]">Monitor assigned, dispatched, and delivered trips.</p>}
        {category === "payments" && <p className="text-sm text-[#50645c]">Payments entered by companies after paying outside Transport Connect.</p>}
        <form action="/admin/dashboard" method="get" key={JSON.stringify([category, query, tripStatus])}
          className="panel flex flex-wrap items-end gap-3 p-4">
          <input type="hidden" name="view" value={category} />
          <label className="field flex-1">Search {categories[category].toLowerCase()}
            <input name="q" maxLength={100} defaultValue={query} placeholder="Search records" />
          </label>
          {category === "assignments" && <label className="field">Trip status
            <select name="trip" defaultValue={tripStatus}>
              <option value="">All trips</option><option value="assigned">Assigned</option>
              <option value="dispatched">Dispatched</option><option value="delivered">Delivered</option>
            </select>
          </label>}
          <button className="button" type="submit">Apply filters</button>
          {(query || tripStatus) && <Link className="text-link py-3 text-sm" href={`/admin/dashboard?view=${category}`}>Clear filters</Link>}
        </form>
        {result.error ? <p role="alert" className="panel p-5">Records are temporarily unavailable. <Link href={pageHref(page)} className="text-link">Try again</Link></p>
          : rows.length === 0 ? <p className="panel p-5">No matching records on this page.</p> : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.slice(0, pageSize).map((record) => (
              <li key={record.key} className="panel min-w-0 p-5">
                <h3 className="break-words text-lg font-bold">{category === "companies" || category === "drivers"
                  ? text(record, "name") : `${text(record, "pickup")} to ${text(record, "destination")}`}</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {fieldsFor(record, category).filter(([, value]) => value).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="font-semibold">{label}</dt>
                      <dd className="mt-1 whitespace-pre-line break-words text-[#50645c]">{value}</dd>
                    </div>
                  ))}
                </dl>
                {category === "companies" && <Link className="text-link mt-4 inline-block text-sm" href={`/admin/commissions?view=bookings&company=${record.key}`}>View company commissions</Link>}
              </li>
            ))}
          </ul>
        )}
        {!result.error && (page > 1 || rows.length > pageSize) && (
          <nav aria-label="Records pages" className="flex items-center gap-3 text-sm">
            {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
            <span>Page {page}</span>
            {page < lastPage && rows.length > pageSize &&
              <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}
