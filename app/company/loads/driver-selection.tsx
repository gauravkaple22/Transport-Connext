"use client";

import { useActionState } from "react";
import { SubmitButton } from "../../driver/form-controls";
import { sendLoadOffer } from "./offer-actions";

export function DriverSelection({ loadId, interestId, fee }: { loadId: string; interestId: string; fee: string }) {
  const [state, action] = useActionState(sendLoadOffer.bind(null, loadId, interestId), {});

  return (
    <form action={action} className="mt-3 sm:max-w-48">
      <p className="mb-2 text-sm text-[#50645c]">Your company pays a {fee} platform fee when the driver confirms.</p>
      <SubmitButton label="Select driver" pendingLabel="Selecting driver…" />
      {state.message && <p role="alert" className="mt-2 text-sm text-rose-900">{state.message}</p>}
      {state.success && <p role="status" className="mt-2 text-sm">{state.success}</p>}
    </form>
  );
}
