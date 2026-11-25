"use client";

import { useActionState } from "react";
import { respondToOffer } from "./actions";

export function ResponseForm({ id, canAccept }: { id: string; canAccept: boolean }) {
  const [state, action, pending] = useActionState(respondToOffer.bind(null, id), {});

  return (
    <form action={action} className="mt-4">
      <fieldset className="flex flex-wrap gap-3" disabled={pending}>
        {canAccept && <button name="response" value="accept" className="button" type="submit">Accept offer</button>}
        <button name="response" value="decline" className="button-outline" type="submit">Decline offer</button>
      </fieldset>
      {!canAccept && <p className="mt-2 text-sm text-[#50645c]">This load is no longer available to accept.</p>}
      {pending && <p role="status" className="mt-2 text-sm">Updating your offer…</p>}
      {state.message && <p role="alert" className="mt-2 text-sm text-rose-900">{state.message}</p>}
    </form>
  );
}
