"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompany } from "../../../lib/company";
import { isLoadId } from "../../../lib/load-fields";
import type { CompanyFormState } from "../company-form";

export async function sendLoadOffer(loadId: string, interestId: string, _: CompanyFormState): Promise<CompanyFormState> {
  const { supabase } = await requireCompany();
  if (!isLoadId(loadId) || !isLoadId(interestId)) return { message: "This driver selection is unavailable." };

  const { data, error } = await supabase.rpc("offer_company_load", { requested_load_id: loadId, interest_id: interestId });
  if (error) return { message: "Could not select this driver. Please try again." };
  if (data !== true) return { message: "This load can no longer be offered to this driver. Refresh to check its status." };
  revalidatePath(`/company/loads/${loadId}/interest`);
  return { success: "Driver selected. Waiting for their response." };
}


export async function recordDriverAdvance(loadId: string, offerId: string, _: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase } = await requireCompany();
  if (!isLoadId(loadId) || !isLoadId(offerId)) return { message: "This advance payment is unavailable." };

  const entry = form.get("reference");
  const reference = typeof entry === "string" ? entry.trim() : "";
  if (reference.length < 3 || reference.length > 80) return { fields: { reference: "Enter a payment reference between 3 and 80 characters." } };
  if (form.get("paid") !== "yes") return { fields: { paid: "Confirm you already paid the advance to the driver." } };

  const { data, error } = await supabase.rpc("record_driver_booking_advance", { booking_id: offerId, reference_text: reference });
  if (error || data !== true) return { message: "Could not record this advance. Check whether it was already recorded." };

  revalidatePath(`/company/loads/${loadId}/interest`);
  revalidatePath("/company/payments");
  revalidatePath("/company/trips");
  return { success: "Advance recorded. The company can now dispatch the trip." };
}

export async function recordLoadPayment(loadId: string, offerId: string, source: "load" | "payments", _: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase } = await requireCompany();
  if (!isLoadId(loadId) || !isLoadId(offerId)) return { message: "This payment record is unavailable." };
  const reference = String(form.get("reference") ?? "").trim();
  if (reference.length > 80) return { fields: { reference: "Use 80 characters or fewer." } };
  if (form.get("paid") !== "yes") return { fields: { paid: "Confirm you already made the payment." } };

  const { data, error } = await supabase.rpc("record_company_load_payment", { offer_id: offerId, reference_text: reference || null });
  if (error || data !== true) return { message: "Could not record payment. Record the advance first and use a different reference for the remaining payment." };
  revalidatePath(`/company/loads/${loadId}/interest`);
  revalidatePath("/company/dashboard");
  revalidatePath("/company/payments");
  if (source === "payments") redirect("/company/payments?view=recorded&notice=recorded");
  return { success: "Payment recorded." };
}
