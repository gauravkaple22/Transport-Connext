"use server";

import { revalidatePath } from "next/cache";
import { companyCallbackUrl, requireCompany } from "../../../lib/company";
import { companyEmailInput, readCompanyProfile, validCompanyEmail } from "../../../lib/company-profile";
import type { CompanyFormState } from "../company-form";

export async function saveCompanyProfile(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase, userId, profile: existing } = await requireCompany();
  const { profile, fields } = readCompanyProfile(form, { gstin: existing.gstin, business_address: existing.business_address });
  if (Object.keys(fields).length) return { fields };

  const { data, error } = await supabase.from("company_profiles")
    .update(profile).eq("user_id", userId).select("user_id").maybeSingle();
  if (error || !data) return { message: "We couldn't save your profile. Please try again." };

  revalidatePath("/company/profile");
  revalidatePath("/company/dashboard");
  return { success: "Company profile saved." };
}

export async function changeCompanyEmail(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase, email } = await requireCompany();
  const address = companyEmailInput(form);
  if (!validCompanyEmail(address)) return { fields: { email: "Enter a valid work email address." } };
  if (address === email.toLowerCase()) return { fields: { email: "Enter a different work email address." } };

  const { error } = await supabase.auth.updateUser({ email: address }, { emailRedirectTo: companyCallbackUrl() });
  if (error?.status === 429) return { message: "Too many email requests. Wait a few minutes and try again." };
  if (error) return { message: "We couldn't request the email change. Check the address and try again." };
  return { success: "Email change requested. Check both inboxes and follow the confirmation instructions." };
}
