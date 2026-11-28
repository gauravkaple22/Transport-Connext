import Link from "next/link";
import { requireCompany } from "../../../lib/company";
import { formatLoadingDate } from "../../../lib/load-fields";
import { formatFreight } from "../../../lib/load-offers";
import { AutoRefresh } from "../../auto-refresh";
import { SubmitButton } from "../../driver/form-controls";
import { Workspace, WorkspaceHeading } from "../../workspace";
import { logoutCompany } from "../actions";
import { DriverPayout } from "../loads/driver-payout";

type Payment = {
  offer_id: string;
  load_id: string;
  driver_name: string;
  pickup_city: string;
  destination_city: string;
  loading_date: string;
  amount_paise: number;
  commission_paise?: number | null;
  total_paise?: number;
  advance_paise?: number | null;
  advance_reference?: string | null;
  payment_reference: string | null;
  payment_recorded_at: string | null;
};

const paymentDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const pageSize = 20;
const lastPage = 501;

export default async function CompanyPayments({ searchParams }: { searchParams: Promise<{ view?: string; page?: string; notice?: string }> }) {
  const { supabase } = await requireCompany("/company/login?next=payments");
  const params = await searchParams;
  const recorded = params.view === "recorded";
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= lastPage ? requestedPage : 1;
  const { data, error } = await supabase.rpc("list_company_payments", { recorded, page_offset: (page - 1) * pageSize });
  const rows: Payment[] = Array.isArray(data) ? data : [];
  const pageHref = (destination: number) => `/company/payments?view=${recorded ? "recorded" : "due"}&page=${destination}`;

  return (
    <Workspace role="company" current="/company/payments" heading="Payments"
      accountAction={<form action={logoutCompany}><SubmitButton label="Log out" pendingLabel="Logging out…" variant="outline" /></form>}>
      <AutoRefresh />
      <WorkspaceHeading label="Company payments" title="Trip payments"
        description="Pay the driver the full agreed amount. The platform booking fee is a separate company payment." />
      {params.notice === "recorded" && <p role="status" className="rounded-xl bg-[#edf4ef] p-4 text-sm font-semibold">Payment recorded.</p>}
      <nav className="flex flex-wrap gap-3" aria-label="Payment status">
        <Link href="/company/payments" aria-current={!recorded ? "page" : undefined} className={!recorded ? "button" : "button-outline"}>Payments due</Link>
        <Link href="/company/commissions" className="button-outline">Pay platform fee</Link>
        <Link href="/company/payments?view=recorded" aria-current={recorded ? "page" : undefined} className={recorded ? "button" : "button-outline"}>Recorded payments</Link>
      </nav>
      {error ? <p role="alert" className="panel p-5">Payments are temporarily unavailable. <Link className="text-link" href={pageHref(page)}>Try again</Link></p>
        : rows.length === 0 ? (
          <div className="panel p-5">
            <h2 className="font-bold">{page > 1 ? "No payments on this page" : recorded ? "No recorded payments yet" : "No payments due"}</h2>
            {page === 1 && <p className="mt-2 text-sm text-[#50645c]">{recorded ? "Payments you record will appear here." : "An accepted offer appears here automatically."}</p>}
          </div>
        ) : (
          <ul className="grid gap-4">
            {rows.slice(0, pageSize).map((payment) => (
              <li key={payment.offer_id} className="panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold">{payment.pickup_city} to {payment.destination_city}</h2>
                    <p className="mt-1 break-words text-sm text-[#50645c]">{payment.driver_name} · {formatLoadingDate(payment.loading_date)}</p>
                  </div>
                  <p className="rounded-xl bg-[#edf4ef] px-3 py-2 text-sm font-bold">Driver payment {formatFreight(payment.amount_paise)}</p>
                </div>
                {typeof payment.commission_paise === "number" && typeof payment.total_paise === "number" && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-stone-50 p-3 text-sm">
                    <span>Company platform fee <strong>{formatFreight(payment.commission_paise)}</strong></span>
                    <span>Company total <strong>{formatFreight(payment.total_paise)}</strong></span>
                  </div>
                )}
                {recorded ? (
                  <dl className="mt-4 space-y-1 text-sm">
                    <div><dt className="inline font-semibold">Status </dt><dd className="inline">Recorded by company</dd></div>
                    {payment.payment_recorded_at && <div><dt className="inline font-semibold">Recorded on </dt><dd className="inline">{paymentDate.format(new Date(payment.payment_recorded_at))}</dd></div>}
                    {payment.advance_reference && <div><dt className="inline font-semibold">Advance reference </dt><dd className="inline break-all">{payment.advance_reference}</dd></div>}
                    {payment.payment_reference && <div><dt className="inline font-semibold">Reference </dt><dd className="inline break-all">{payment.payment_reference}</dd></div>}
                  </dl>
                ) : (
                  <DriverPayout loadId={payment.load_id} offerId={payment.offer_id} amount={payment.amount_paise}
                    advancePaid={payment.advance_paise} advanceReference={payment.advance_reference} source="payments" />
                )}
                <Link href={`/company/loads/${payment.load_id}/interest`} className="text-link mt-4 inline-block text-sm">View load and driver</Link>
              </li>
            ))}
          </ul>
        )}
      {!error && (page > 1 || rows.length > pageSize) && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Payments pages">
          {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && rows.length > pageSize && <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
    </Workspace>
  );
}
