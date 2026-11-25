import Link from "next/link";
import { AutoRefresh } from "../../../../auto-refresh";
import { notFound } from "next/navigation";
import { requireCompany } from "../../../../../lib/company";
import { formatLoadingDate, isLoadId } from "../../../../../lib/load-fields";
import { CompanyCard } from "../../../card";
import { formatExpectedPayment, formatFreight, offerStatusLabel, type OfferStatus } from "../../../../../lib/load-offers";
import { DriverPayout } from "../../driver-payout";
import { DriverSelection } from "../../driver-selection";

export const dynamic = "force-dynamic";

type DriverInterest = {
  driver_name: string;
  expressed_at: string;
  interest_id?: string;
  offer_id?: string | null;
  offer_status?: OfferStatus | null;
  amount_paise?: number | null;
  vehicle_number?: string | null;
  requested_paise?: number | null;
  advance_paise?: number | null;
  advance_reference?: string | null;
  payment_reference?: string | null;
  can_offer?: boolean;
};
const pageSize = 20;
const lastPage = 501;
const timestampFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});

export default async function InterestedDrivers({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { supabase, userId } = await requireCompany("/company/login?next=loads");
  const { id } = await params;
  if (!isLoadId(id)) notFound();

  const { data: load, error: loadError } = await supabase.from("company_loads")
    .select("pickup_city,destination_city,loading_date,expected_min_paise,expected_max_paise")
    .eq("company_id", userId).eq("id", id).maybeSingle();
  if (loadError) throw new Error("Company load request failed");
  if (!load) notFound();

  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= lastPage ? requestedPage : 1;
  const { data, error } = await supabase.rpc("list_company_load_interest", {
    requested_load_id: id, page_offset: (page - 1) * pageSize,
  });
  const rows: DriverInterest[] = Array.isArray(data) ? data : [];
  const drivers = rows.slice(0, pageSize);
  const pageHref = (number: number) => `/company/loads/${id}/interest?page=${number}`;

  return (
    <CompanyCard title="Driver requests"
      description={`${load.pickup_city} to ${load.destination_city} · ${formatLoadingDate(load.loading_date)}`} wide>
      <AutoRefresh />
      <dl className="mt-4 rounded-xl bg-[#edf4ef] px-4 py-3 text-sm">
        <dt className="font-semibold">Expected payment</dt>
        <dd className="mt-1">{formatExpectedPayment(load.expected_min_paise, load.expected_max_paise)}</dd>
      </dl>
      <p className="mt-4 text-sm text-[#50645c]">Select a driver at the amount they requested. They'll confirm or decline in My Offers.</p>
      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-900">
          We couldn't load the driver list. <Link href={pageHref(page)} className="text-link">Try again</Link>
        </p>
      ) : drivers.length === 0 ? (
        <div className="mt-5 rounded-xl bg-[#edf4ef] p-4">
          <p className="font-semibold">{page > 1 ? "No drivers on this page" : "No drivers have requested this load yet"}</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[#dbe4dc] rounded-xl border border-[#dbe4dc]">
          {drivers.map((driver, index) => (
            <li key={driver.interest_id ?? `${driver.expressed_at}-${index}`} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 break-words font-semibold">{driver.driver_name}</span>
                <time dateTime={driver.expressed_at} className="text-sm text-[#50645c]">
                  {timestampFormat.format(new Date(driver.expressed_at))}
                </time>
              </div>
              <p className="mt-1 text-sm text-[#50645c]">Vehicle number: {driver.vehicle_number ?? "Not submitted"}</p>
              {!driver.offer_status && (
                <p className="mt-2 text-sm font-semibold">
                  {typeof driver.requested_paise === "number"
                    ? `Requested payment: ${formatFreight(driver.requested_paise)}`
                    : "Waiting for the driver to enter a payment amount"}
                </p>
              )}
              {driver.offer_status && typeof driver.amount_paise === "number" && (
                <p className="mt-2 text-sm font-semibold">
                  {offerStatusLabel(driver.offer_status)} · {formatFreight(driver.amount_paise)}
                </p>
              )}
              {driver.payment_reference && <p className="mt-1 break-words text-sm text-[#50645c]">Reference {driver.payment_reference}</p>}
              {driver.can_offer && driver.interest_id && typeof driver.requested_paise === "number" &&
                <DriverSelection loadId={id} interestId={driver.interest_id} />}
              {driver.offer_status === "accepted" && driver.offer_id && typeof driver.amount_paise === "number" && (
                <DriverPayout loadId={id} offerId={driver.offer_id} amount={driver.amount_paise}
                  advancePaid={driver.advance_paise} advanceReference={driver.advance_reference} source="load" />
              )}
            </li>
          ))}
        </ul>
      )}
      {!error && (page > 1 || rows.length > pageSize) && (
        <nav aria-label="Interested drivers pages" className="mt-5 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && rows.length > pageSize &&
            <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
      <Link href="/company/loads" className="text-link mt-5 inline-block py-2 text-sm">Back to My loads</Link>
    </CompanyCard>
  );
}
