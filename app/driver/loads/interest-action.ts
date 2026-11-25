"use server";

import { revalidatePath } from "next/cache";
import { isLoadId } from "../../../lib/load-fields";
import { formatExpectedPayment, parsePaymentAmount } from "../../../lib/load-offers";
import { requireDriver } from "../../../lib/driver";
import type { InterestState } from "./interest-form";

export async function showLoadInterest(
  loadId: string, min: number, max: number, _: InterestState, form: FormData,
): Promise<InterestState> {
  const { supabase } = await requireDriver();
  if (!isLoadId(loadId)) return { message: "This load is unavailable." };
  const entry = form.get("requested_amount");
  const amount = typeof entry === "string" ? parsePaymentAmount(entry.trim()) : null;
  if (amount === null || amount < min || amount > max) {
    return { field: `Enter an amount within ${formatExpectedPayment(min, max)}.` };
  }

  const { data, error } = await supabase.rpc("show_driver_load_interest", {
    public_load_id: loadId, requested_paise: amount,
  });
  if (error) return { message: "We couldn't send your request. Try again shortly." };
  if (data === "vehicle-required") return { vehicleRequired: true };
  if (data === "outside-range") return { field: "The amount must be within the displayed payment range." };
  if (data !== "sent" && data !== "already-sent") return { message: "This load is no longer accepting requests." };

  revalidatePath("/driver/loads");
  return { sent: true };
}
