import { formatFreight } from "../../../lib/load-offers";
import { recordDriverAdvance, recordLoadPayment } from "./offer-actions";
import { RecordPaymentForm } from "./offer-form";

export function DriverPayout({ loadId, offerId, amount, advancePaid, advanceReference, source }: {
  loadId: string; offerId: string; amount: number; advancePaid?: number | null;
  advanceReference?: string | null; source: "load" | "payments";
}) {
  const advance = advancePaid ?? Math.ceil(amount * 70 / 100);
  const balance = amount - advance;
  const alreadyRecorded = advancePaid != null;

  return (
    <section className="mt-4 rounded-xl border border-[#dbe4dc] p-4">
      <h3 className="font-bold">Driver payment</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">70% advance before dispatch</dt>
          <dd className="mt-1">{formatFreight(advance)} · {alreadyRecorded ? "Recorded" : "Due now"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Remaining driver payment</dt>
          <dd className="mt-1">{formatFreight(balance)}</dd>
        </div>
      </dl>
      {advanceReference && <p className="mt-2 break-all text-sm text-[#50645c]">Advance reference: {advanceReference}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold">{alreadyRecorded ? "Record remaining payment" : "Record 70% advance"}</summary>
        <RecordPaymentForm key={alreadyRecorded ? "balance" : "advance"} advance={!alreadyRecorded}
          action={alreadyRecorded ? recordLoadPayment.bind(null, loadId, offerId, source) : recordDriverAdvance.bind(null, loadId, offerId)} />
      </details>
    </section>
  );
}
