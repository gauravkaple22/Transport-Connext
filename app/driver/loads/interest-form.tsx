"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { formatFreight } from "../../../lib/load-offers";
import { SubmitButton } from "../form-controls";
import { showLoadInterest } from "./interest-action";

export type InterestState = { sent?: boolean; vehicleRequired?: boolean; message?: string; field?: string };

export function InterestForm({ loadId, min, max, requested, interestSent }: {
  loadId: string; min: number; max: number; requested?: number | null; interestSent: boolean;
}) {
  const [state, action, pending] = useActionState(showLoadInterest.bind(null, loadId, min, max), {});
  const [amount, setAmount] = useState("");
  const errorId = useId();

  if (interestSent || state.sent) {
    return <p role="status" className="rounded-xl bg-[#edf4ef] p-3 text-sm font-semibold">
      {typeof requested === "number" ? `Request sent for ${formatFreight(requested)}.` : "Request sent to the company."}
    </p>;
  }

  if (state.vehicleRequired) return <p className="text-sm">
    <Link href="/driver/profile" className="text-link">Add your vehicle and documents</Link> to send a payment request.
  </p>;

  return (
    <form action={action} noValidate>
      <fieldset disabled={pending} className="grid gap-2 sm:max-w-xs">
        {min === max ? <input type="hidden" name="requested_amount" value={(min / 100).toFixed(2)} /> : (
          <label className="field">
            Your requested payment (₹)
            <input name="requested_amount" inputMode="decimal" required maxLength={11} value={amount}
              onChange={(event) => setAmount(event.target.value)} aria-invalid={Boolean(state.field)}
              aria-describedby={state.field ? errorId : undefined} />
          </label>
        )}
        {state.field && <p id={errorId} role="alert" className="text-sm text-rose-900">{state.field}</p>}
        {state.message && <p role="alert" className="text-sm text-rose-900">{state.message}</p>}
        <SubmitButton label={min === max ? `Request ${formatFreight(min)}` : "Send payment request"} pendingLabel="Sending request…" />
      </fieldset>
    </form>
  );
}
