"use client";

import { useActionState } from "react";
import { SubmitButton } from "../../driver/form-controls";
import type { CompanyFormState } from "../company-form";

export function RecordPaymentForm({ action, advance = false }: {
  action: (state: CompanyFormState, form: FormData) => Promise<CompanyFormState>;
  advance?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-4">
      <fieldset disabled={pending} className="grid max-w-sm gap-3">
        <label className="field">
          {advance ? "Advance payment reference" : "Remaining payment reference (optional)"}
          <input name="reference" maxLength={80} minLength={advance ? 3 : undefined} required={advance} placeholder="e.g. UPI transaction reference" aria-invalid={Boolean(state.fields?.reference)} />
        </label>
        {state.fields?.reference && <p role="alert" className="field-error text-sm">{state.fields.reference}</p>}
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-0.5 size-4" type="checkbox" name="paid" value="yes" required />
          {advance ? "I already paid this 70% advance to the driver." : "I already paid the remaining amount to the driver."}
        </label>
        {state.fields?.paid && <p role="alert" className="field-error text-sm">{state.fields.paid}</p>}
        {state.message && <p role="alert" className="field-error text-sm">{state.message}</p>}
        {state.success && <p role="status" className="text-sm font-semibold">{state.success}</p>}
        <SubmitButton label={advance ? "Record advance" : "Record remaining payment"} pendingLabel="Recording payment…" />
      </fieldset>
    </form>
  );
}
