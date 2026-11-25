import Link from "next/link";
import type { ReactNode } from "react";
import { formatLoadingDate } from "../lib/load-fields";
import { formatFreight } from "../lib/load-offers";

export type Commission = {
  offer_id: string; company_name: string; pickup_city: string; destination_city: string; loading_date: string;
  agreed_paise: number; commission_paise: number; total_paise: number;
  commission_status: "pending" | "submitted" | "paid"; payment_reference: string | null;
  confirmed_at: string; paid_at: string | null;
  driver_name?: string; trip_status?: "assigned" | "dispatched" | "delivered";
};

const tripLabels = { assigned: "Assigned", dispatched: "Dispatched", delivered: "Delivered" };
const statusLabels = { pending: "Unpaid", submitted: "Awaiting verification", paid: "Paid" };
const dates = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
export const commissionPageSize = 20;
const lastPage = 501;

export function commissionPage(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= lastPage ? page : 1;
}

export function CommissionList({ records, page, path, error, renderAction, pageHref }: {
  records: Commission[]; page: number; path: string; error: boolean; renderAction: (record: Commission) => ReactNode;
  pageHref?: (page: number) => string;
}) {
  const link = (number: number) => pageHref ? pageHref(number) : `${path}?page=${number}`;
  return (
    <>
      {error ? <p role="alert" className="panel p-5">Commission records are unavailable. <Link className="text-link" href={link(page)}>Try again</Link></p>
        : records.length === 0 ? <p className="panel p-5">No commission records on this page.</p> : (
          <ul className="grid gap-4">
            {records.slice(0, commissionPageSize).map((record) => (
              <li key={record.offer_id} className="panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="break-words text-xl font-bold">{record.pickup_city} to {record.destination_city}</h2>
                    <p className="mt-1 break-words text-sm text-[#50645c]">{record.company_name} · {formatLoadingDate(record.loading_date)}</p>
                    {record.driver_name && <p className="mt-1 break-words text-sm text-[#50645c]">Driver: {record.driver_name}</p>}
                    <p className="mt-1 text-xs text-[#50645c]">Booking {record.offer_id.slice(0, 8)} · Confirmed {dates.format(new Date(record.confirmed_at))}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {record.trip_status && <span className="rounded-lg bg-stone-100 px-3 py-2">Trip: {tripLabels[record.trip_status]}</span>}
                    <span className={`rounded-lg px-3 py-2 ${record.commission_status === "paid" ? "bg-[#edf4ef]" : "bg-amber-50 text-amber-900"}`}>
                      Commission: {statusLabels[record.commission_status]}
                    </span>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-3">
                  <div><dt className="font-semibold">Driver receives</dt><dd className="mt-1">{formatFreight(record.agreed_paise)}</dd></div>
                  <div><dt className="font-semibold">Company commission (4%)</dt><dd className="mt-1">{formatFreight(record.commission_paise)}</dd></div>
                  <div><dt className="font-semibold">Company total</dt><dd className="mt-1 font-bold">{formatFreight(record.total_paise)}</dd></div>
                </dl>
                {record.payment_reference && <p className="mt-3 break-all text-sm">Platform payment reference: {record.payment_reference}</p>}
                {record.paid_at && <p className="mt-1 text-sm text-[#50645c]">Verified {dates.format(new Date(record.paid_at))}</p>}
                {renderAction(record)}
              </li>
            ))}
          </ul>
        )}
      {!error && (page > 1 || records.length > commissionPageSize) && (
        <nav aria-label="Commission pages" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && records.length > commissionPageSize && <Link href={link(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
    </>
  );
}
