"use client";

import { useActionState } from "react";
import { SubmitButton } from "../form-controls";
import { markTripDelivered } from "./actions";
import { LocationSharing } from "./location-sharing";

export function TripControls({ offerId, status }: { offerId: string; status: "assigned" | "dispatched" | "delivered" }) {
  const [state, action] = useActionState(markTripDelivered.bind(null, offerId), {});
  if (status === "delivered" || state.delivered) return null;
  if (status === "assigned") {
    return <p className="rounded-xl bg-[#edf4ef] p-4 text-sm text-[#50645c]">
      Waiting for the company to mark this load dispatched. You can share your location after that.
    </p>;
  }

  return (
    <div className="grid gap-3 border-t border-[#dbe4dc] pt-4">
      <LocationSharing offerId={offerId} />
      <form action={action} className="sm:max-w-48">
        <SubmitButton label="Mark delivered" pendingLabel="Updating trip…" variant="outline" />
        {state.error && <p role="alert" className="mt-2 text-sm text-rose-900">{state.error}</p>}
      </form>
    </div>
  );
}
