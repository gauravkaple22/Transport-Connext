"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { companyEmailInput, formValue, validCompanyEmail } from "../../lib/company-profile";
import { requireDriver } from "../../lib/driver";
import { clearDriverRecovery, driverCallbackUrl, pendingDriverEmailCookie, requireDriverRecovery } from "../../lib/driver-recovery";
import { createSupabase } from "../../lib/supabase";
import type { CompanyFormState } from "../company/company-form";

export async function addRecoveryEmail(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase } = await requireDriver();
  const email = companyEmailInput(form);
  if (!validCompanyEmail(email)) return { fields: { email: "Enter a valid email address." } };

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { message: "Could not check your account. Try again shortly." };
  if (data.user.email === email && data.user.email_confirmed_at) {
    return { success: "This email is already verified and can be used to reset your password." };
  }

  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: driverCallbackUrl().toString() });
  if (error?.code === "email_exists" || error?.code === "user_already_exists") {
    return { fields: { email: "This email is already linked to another account. Use a different email you can access." } };
  }
  if (error?.code === "email_address_not_authorized" || error?.code === "email_provider_disabled" ||
      error?.code === "email_address_not_allowed" || error?.code === "unexpected_failure" || (error?.status ?? 0) >= 500) {
    console.warn("Driver recovery email request failed", { code: error?.code, status: error?.status });
    return { message: "We couldn’t send a confirmation email. Please try again later or contact Transport Connect support." };
  }
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
    return { message: "Too many email requests. Wait and check your inbox before trying again." };
  }
  if (error?.code === "email_address_invalid" || error?.code === "validation_failed") {
    return { fields: { email: "Check the spelling and enter a valid email address." } };
  }
  if (error) {
    console.warn("Driver recovery email request failed", { code: error.code, status: error.status });
    return { message: "We couldn’t start email verification. Please try again shortly." };
  }
  (await cookies()).set(pendingDriverEmailCookie, email, {
    path: "/driver", httpOnly: true, secure: driverCallbackUrl().protocol === "https:",
    sameSite: "lax", maxAge: 60 * 60,
  });
  return { success: "Open the confirmation link in the same browser you used here. If you changed an existing email, check both inboxes." };
}

export async function sendDriverReset(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const email = companyEmailInput(form);
  if (!validCompanyEmail(email)) return { fields: { email: "Enter your recovery email address." } };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Password recovery is temporarily unavailable." };
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: driverCallbackUrl().toString() });
  return { success: "If this email is linked to your account, check your inbox. Open the link in the same browser you used here." };
}

export async function resetDriverPassword(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase } = await requireDriverRecovery();
  const password = formValue(form, "password");
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
    return { fields: { password: "Use at least 8 characters and no more than 72 bytes." } };
  }
  if (password !== formValue(form, "confirm_password")) {
    return { fields: { confirm_password: "Enter the same password again." } };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "weak_password" || error?.code === "same_password") {
    return { fields: { password: "Choose a stronger password you have not used for this account." } };
  }
  if (error) return { message: "Could not save your password. Try again or request a new reset link." };

  await clearDriverRecovery();
  const { error: logoutError } = await supabase.auth.signOut({ scope: "global" });
  redirect(logoutError ? "/driver/dashboard" : "/driver/login?notice=password-updated");
}
