"use client";

import { useState } from "react";
import { SubmitButton } from "../../driver/form-controls";
import { closeLoad } from "./actions";

export function CloseLoadForm({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-auto pt-4">
      {confirming ? (
        <form action={closeLoad} className="rounded-xl border border-[#dbe4dc] p-3">
          <input type="hidden" name="load_id" value={id} />
          <p className="text-sm text-[#50645c]">Close this load? It will stay in your list as closed.</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SubmitButton label="Confirm close" pendingLabel="Closing load…" variant="outline" />
            <button type="button" onClick={() => setConfirming(false)} className="text-link px-2 py-3 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className="button-outline" onClick={() => setConfirming(true)}>Close load</button>
      )}
    </div>
  );
}
