import Link from "next/link";
import { AutoRefresh } from "../../auto-refresh";
import { formatLoadingDate } from "../../../lib/load-fields";
import { formatFreight, offerStatusLabel, type OfferStatus } from "../../../lib/load-offers";
import { requireDriver } from "../../../lib/driver";
import { ResponseForm } from "./response-form";

export const dynamic = "force-dynamic";

type Offer = {
  offer_id: string;
  company_name: string;
  pickup_city: string;
  destination_city: string;
  loading_date: string;
  amount_paise: number;
  offer_status: OfferStatus;
  can_accept: boolean;
};

const pageSize = 20;
const lastPage = 501;
const pageHref = (page: number) => `/driver/offers?page=${page}`;

export default async function DriverOffers({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase } = await requireDriver();
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= lastPage ? requestedPage : 1;
  const { data, error } = await supabase.rpc("list_driver_load_offers", { page_offset: (page - 1) * pageSize });
  const rows: Offer[] = Array.isArray(data) ? data : [];

  return (
    <section className="w-full">
      <AutoRefresh />
      <Link href="/driver/dashboard" className="text-link inline-block py-2 text-sm">Back to dashboard</Link>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">My offers</h1>
      <p className="mt-2 text-[#50645c]">Confirm or decline a company's selection at the payment amount shown.</p>
      {error ? (
        <p role="alert" className="panel mt-5 p-5">Offers are temporarily unavailable. <Link href={pageHref(page)} className="text-link">Try again</Link></p>
      ) : rows.length === 0 ? (
        <div className="panel mt-5 p-6">
          <h2 className="font-bold">{page === 1 ? "No offers yet" : "No offers on this page"}</h2>
          <p className="mt-2 text-[#50645c]">Companies can send you an offer for a load after you show interest.</p>
          <Link href="/driver/loads" className="button-outline mt-4">Browse loads</Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {rows.slice(0, pageSize).map((offer) => (
            <li key={offer.offer_id} className="panel min-w-0 p-5 sm:p-6">
              <p className="break-words text-sm font-semibold text-[#50645c]">{offer.company_name}</p>
              <h2 className="mt-1 break-words text-xl font-bold">{offer.pickup_city} to {offer.destination_city}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="font-semibold">Loading date</dt><dd>{formatLoadingDate(offer.loading_date)}</dd></div>
                <div><dt className="font-semibold">Payment amount</dt><dd>{formatFreight(offer.amount_paise)}</dd></div>
              </dl>
              <p className="mt-4 inline-block rounded-lg bg-[#edf4ef] px-3 py-2 text-sm font-semibold">
                {offerStatusLabel(offer.offer_status)}
              </p>
              {offer.offer_status === "offered" && <ResponseForm id={offer.offer_id} canAccept={offer.can_accept} />}
              {(offer.offer_status === "accepted" || offer.offer_status === "payment_recorded") && (
                <div><Link href="/driver/trips" className="text-link mt-3 inline-block py-2 text-sm">Go to My trips</Link></div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!error && (page > 1 || rows.length > pageSize) && (
        <nav aria-label="Offers pages" className="mt-5 flex items-center gap-4 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="button-outline">Previous</Link>}
          <span>Page {page}</span>
          {page < lastPage && rows.length > pageSize && <Link href={pageHref(page + 1)} className="button-outline">Next</Link>}
        </nav>
      )}
    </section>
  );
}
