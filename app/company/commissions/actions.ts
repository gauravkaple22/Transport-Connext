"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "../../../lib/company";
import { isLoadId } from "../../../lib/load-fields";
import type { CommissionFormState } from "../../commission-form";

export async function submitCommissionReference(offerId: string, _: CommissionFormState, form: FormData): Promise<CommissionFormState> {
  const { supabase } = await requireCompany();
  if (!isLoadId(offerId)) return { error: "This booking is unavailable." };
  const reference = form.get("reference");
  if (typeof reference !== "string" || reference.trim().length < 3 || reference.trim().length > 80) {
    return { error: "Enter a payment reference between 3 and 80 characters." };
  }

  const { data, error } = await supabase.rpc("submit_company_commission_payment", {
    booking_id: offerId, reference_text: reference.trim(),
  });
  if (error || data !== true) return { error: "Could not submit the reference. Check the commission status and try again." };

  revalidatePath("/company/commissions");
  revalidatePath("/company/payments");
  return { success: "Reference submitted for verification." };
}
