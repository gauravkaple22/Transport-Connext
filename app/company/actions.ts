"use server";

import { redirect } from "next/navigation";
import { createSupabase } from "../../lib/supabase";
import { companyEmailInput, formValue, readCompanyProfile, validCompanyEmail } from "../../lib/company-profile";
import {
  beginCompanyRecovery, clearCompanyRecovery, companyCallbackUrl, companyLoginDestination,
  getCompanyProfile, redirectSignedInCompany, requireCompany, requireCompanyRecovery,
} from "../../lib/company";
import type { CompanyFormState } from "./company-form";

function passwordFields(form: FormData) {
  const password = formValue(form, "password");
  const fields: Record<string, string> = {};
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
    fields.password = "Use at least 8 characters and no more than 72 bytes.";
  }
  if (formValue(form, "confirm_password") !== password) {
    fields.confirm_password = "Enter the same password again.";
  }
  return fields;
}

async function companySession(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabase>>>,
  userId: string,
): Promise<CompanyFormState | null> {
  const { data, error } = await getCompanyProfile(supabase, userId);
  if (data) return null;

  await supabase.auth.signOut({ scope: "local" });
  return {
    message: error ? "We couldn't load the company profile. Try again shortly." : "This email doesn't have a company profile. If you registered it as a company, contact the project team.",
  };
}

export async function registerCompany(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { profile, fields: profileFields } = readCompanyProfile(form);
  const email = companyEmailInput(form);
  const fields = { ...profileFields, ...passwordFields(form) };
  if (!validCompanyEmail(email)) fields.email = "Enter a valid work email address.";
  if (Object.keys(fields).length) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Company registration is temporarily unavailable." };
  await redirectSignedInCompany(supabase);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: formValue(form, "password"),
    options: { emailRedirectTo: companyCallbackUrl(), data: { signup_type: "company", ...profile } },
  });
  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error?.code === "weak_password") return { fields: { password: "Choose a stronger password and try again." } };
  if (error?.code === "user_already_exists" || error?.code === "email_exists") {
    redirect("/company/login?notice=check-email");
  }
  if (error) return { message: "We couldn't create your company account. Try again shortly." };
  if (!data.session || !data.user) redirect("/company/login?notice=check-email");

  const issue = await companySession(supabase, data.user.id);
  if (issue) return issue;
  redirect("/company/dashboard");
}

export async function loginCompany(next: string | undefined, _: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const email = companyEmailInput(form);
  const password = formValue(form, "password");
  const fields: Record<string, string> = {};
  if (!validCompanyEmail(email)) fields.email = "Enter your work email address.";
  if (!password) fields.password = "Enter your password.";
  if (Object.keys(fields).length) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Company login is temporarily unavailable." };
  await redirectSignedInCompany(supabase);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error?.code === "email_not_confirmed") return { message: "Confirm your work email using the link in your inbox, then log in." };
  if (error?.code === "invalid_credentials") return { message: "That email and password didn't match. Check them and try again." };
  if (error?.status === 0) return { message: "We could not connect to the login service. Try again in a moment." };
  if (error || !data.user) return { message: "We couldn't log you in right now. Try again shortly." };

  const issue = await companySession(supabase, data.user.id);
  if (issue) return issue;
  redirect(companyLoginDestination(next));
}

export async function sendRecovery(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const email = companyEmailInput(form);
  if (!validCompanyEmail(email)) return { fields: { email: "Enter a valid work email address." } };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Password recovery is temporarily unavailable." };
  await redirectSignedInCompany(supabase);
  // Use the same receipt for every valid address to avoid revealing account existence.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: companyCallbackUrl(true) });
  return { success: "If that email has an account, check its inbox for password reset instructions." };
}

export async function verifyRecovery(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const email = companyEmailInput(form);
  const token = formValue(form, "otp").replace(/\s/g, "");
  const fields: Record<string, string> = {};
  if (!validCompanyEmail(email)) fields.email = "Enter the work email that received the code.";
  if (!/^[0-9]{6,10}$/.test(token)) fields.otp = "Enter the numbers from your reset email.";
  if (Object.keys(fields).length) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Password recovery is temporarily unavailable." };
  await redirectSignedInCompany(supabase);
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error || !data.user) {
    return { fields: { otp: "That code is invalid or expired. Check it or request a new one." } };
  }
  const issue = await companySession(supabase, data.user.id);
  if (issue) return issue;
  if (!(await beginCompanyRecovery(supabase))) return { message: "Could not start a reset session. Request a new reset email." };
  redirect("/company/reset-password");
}

export async function updateCompanyPassword(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  const { supabase } = await requireCompanyRecovery();
  const fields = passwordFields(form);
  if (Object.keys(fields).length) return { fields };

  const { error } = await supabase.auth.updateUser({ password: formValue(form, "password") });
  if (error?.code === "weak_password" || error?.code === "same_password") {
    return { fields: { password: "Choose a stronger password you haven't used for this account." } };
  }
  if (error) return { message: "We couldn't update your password. Try again or request a new reset email." };

  await clearCompanyRecovery();
  const { error: logoutError } = await supabase.auth.signOut({ scope: "global" });
  if (logoutError) redirect("/company/dashboard?notice=password-updated");
  redirect("/company/login?notice=password-updated");
}

export async function logoutCompany() {
  const { supabase } = await requireCompany();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/company/dashboard?notice=logout-failed");
  await clearCompanyRecovery();
  redirect("/company/login?notice=signed-out");
}
