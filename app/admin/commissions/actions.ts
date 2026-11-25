"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin";
import { isLoadId } from "../../../lib/load-fields";
import type { CommissionFormState } from "../../commission-form";

export async function verifyCommission(offerId: string, reference: string, _: CommissionFormState, form: FormData): Promise<CommissionFormState> {
  const supabase = await requireAdmin();
  if (!isLoadId(offerId) || !reference) return { error: "This commission is unavailable." };
  if (form.get("received") !== "yes") return { error: "Confirm that the platform received the payment." };

  const { data, error } = await supabase.rpc("verify_company_commission_payment", {
    booking_id: offerId, expected_reference: reference,
  });
  if (error?.code === "23505") return { error: "This reference is already verified for another booking." };
  if (error || data !== true) return { error: "Could not verify this payment. The submitted reference may have changed." };

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/dashboard");
  return { success: "Payment verified." };
}

export async function recordReceivedCommission(offerId: string, _: CommissionFormState, form: FormData): Promise<CommissionFormState> {
  const supabase = await requireAdmin();
  if (!isLoadId(offerId)) return { error: "This commission is unavailable." };
  if (form.get("received") !== "yes") return { error: "Confirm the platform received this payment." };

  const value = form.get("reference");
  const reference = typeof value === "string" ? value.trim() : "";
  if (reference.length < 3 || reference.length > 80) return { error: "Enter a reference between 3 and 80 characters." };

  const { data, error } = await supabase.rpc("admin_record_received_commission", {
    booking_id: offerId, reference_text: reference,
  });
  if (error?.code === "23505") return { error: "This reference was already used for another commission." };
  if (error || data !== true) return { error: "Could not record receipt. The booking status may have changed." };

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/company/commissions");
  return { success: "Commission payment recorded and verified." };
}
