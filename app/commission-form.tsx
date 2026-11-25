"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./driver/form-controls";

export type CommissionFormState = { error?: string; success?: string };
type Action = (state: CommissionFormState, formData: FormData) => Promise<CommissionFormState>;

export function CommissionForm({ action, verify, reference, collectReference, upi }: { action: Action; verify?: boolean; reference?: string | null; collectReference?: boolean; upi?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [value, setValue] = useState(reference ?? "");

  return (
    <form action={formAction} className="mt-3">
      <fieldset disabled={pending} className="grid gap-3 sm:max-w-sm">
        {verify && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" name="received" value="yes" required />
            I verified the platform received this commission payment.
          </label>
        )}
        {(!verify || collectReference) && (
          <label className="field">
            {upi ? "UPI transaction ID / payment reference" : "Platform payment reference"}
            <input name="reference" minLength={3} maxLength={80} required value={value}
              onChange={(event) => setValue(event.target.value)} placeholder="e.g. Bank transaction reference" />
          </label>
        )}
        {state.error && <p role="alert" className="text-sm text-rose-900">{state.error}</p>}
        {state.success && <p role="status" className="text-sm font-semibold">{state.success}</p>}
        <SubmitButton label={verify ? "Mark commission paid" : reference ? "Update reference" : "Submit payment reference"}
          pendingLabel={verify ? "Verifying payment…" : "Submitting reference…"} />
      </fieldset>
    </form>
  );
}
