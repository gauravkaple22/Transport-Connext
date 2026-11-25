"use server";

import { redirect } from "next/navigation";
import { isSignedInAdmin, requireAdmin } from "../../lib/admin";
import { companyEmailInput, formValue, validCompanyEmail } from "../../lib/company-profile";
import { createSupabase } from "../../lib/supabase";
import type { CompanyFormState } from "../company/company-form";

export async function loginAdmin(_: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  if (await isSignedInAdmin()) redirect("/admin/dashboard");
  const email = companyEmailInput(form);
  const password = formValue(form, "password");
  const fields: Record<string, string> = {};
  if (!validCompanyEmail(email)) fields.email = "Enter your administrator email.";
  if (!password) fields.password = "Enter your password.";
  if (Object.keys(fields).length) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Admin login is temporarily unavailable." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error?.code === "email_not_confirmed") {
    return { message: "Your admin email is unconfirmed. Confirm it in Supabase Authentication → Users, then try again." };
  }
  if (error?.code === "invalid_credentials") {
    return { message: "The admin email or password did not match. Use the account created in this project's Supabase Authentication → Users." };
  }
  if (error?.status === 0 || (error?.status ?? 0) >= 500) {
    return { message: "The app could not connect to Supabase Auth. Try again shortly." };
  }
  if (error || !data.user) {
    console.warn("Admin authentication failed", { status: error?.status, code: error?.code });
    return { message: "Supabase could not complete this sign-in. Check the account in Authentication → Users." };
  }

  const { data: allowed, error: accessError } = await supabase.rpc("is_platform_admin");
  if (accessError || allowed !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: accessError
      ? "Could not check admin access. Verify that the admin migration has been applied."
      : "This account signed in but does not have admin access. Add its exact User UID to platform_admins." };
  }
  redirect("/admin/dashboard");
}

export async function logoutAdmin() {
  const supabase = await requireAdmin();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/admin/dashboard?notice=logout-failed");
  redirect("/admin/login?notice=signed-out");
}
