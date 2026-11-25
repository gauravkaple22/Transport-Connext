"use server";

import { revalidatePath } from "next/cache";
import { isLoadId } from "../../../lib/load-fields";
import { requireDriver } from "../../../lib/driver";

export async function respondToOffer(id: string, _: { message?: string }, form: FormData) {
  const { supabase } = await requireDriver();
  const response = form.get("response");
  if (!isLoadId(id) || (response !== "accept" && response !== "decline")) {
    return { message: "Choose Accept or Decline." };
  }
  const { data, error } = await supabase.rpc("respond_to_load_offer", { offer_id: id, accept_offer: response === "accept" });
  if (error || data !== true) return { message: "This offer may have changed. Refresh and try again." };
  revalidatePath("/driver/offers");
  revalidatePath("/driver/loads");
  return {};
}
