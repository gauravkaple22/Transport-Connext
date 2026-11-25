"use client";

import { useActionState } from "react";
import { SubmitButton } from "../../driver/form-controls";
import { dispatchTrip } from "./actions";

export function DispatchForm({ offerId }: { offerId: string }) {
  const [state, action] = useActionState(dispatchTrip.bind(null, offerId), {});

  return (
    <div className="rounded-xl border border-[#dbe4dc] p-4">
      <p className="text-sm text-[#50645c]">Mark the trip dispatched once the truck leaves pickup. The driver can then share their location.</p>
      <form action={action} className="mt-2 sm:max-w-48">
        <SubmitButton label="Mark dispatched" pendingLabel="Confirming dispatch…" />
      </form>
      {state.error && <p role="alert" className="mt-2 text-sm text-rose-900">{state.error}</p>}
      {state.dispatched && <p role="status" className="mt-2 text-sm font-semibold">Trip dispatched.</p>}
    </div>
  );
}
