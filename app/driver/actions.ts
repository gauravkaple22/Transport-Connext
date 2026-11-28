"use server";

import { redirect } from "next/navigation";
import { redirectSignedInDriver, requireDriver } from "../../lib/driver";
import { createSupabase, getDriverProfile } from "../../lib/supabase";
import type { DriverFormState } from "./auth-form";

function value(form: FormData, name: string) {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

function mobileNumber(form: FormData) {
  const entered = value(form, "phone").replace(/[\s()-]/g, "");
  const national = entered.startsWith("+91") ? entered.slice(3) : entered;
  return /^[6-9][0-9]{9}$/.test(national) ? `+91${national}` : null;
}

function feedback(path: string, notice: string): never {
  redirect(`/driver/${path}?notice=${notice}`);
}

export async function signUp(_: DriverFormState, form: FormData): Promise<DriverFormState> {
  await redirectSignedInDriver();
  const name = value(form, "full_name").trim();
  const phone = mobileNumber(form);
  const password = value(form, "password");
  const fields: NonNullable<DriverFormState["fields"]> = {};
  if (!name) fields.full_name = "Enter your full name.";
  else if (name.length > 100) fields.full_name = "Use 100 characters or fewer.";
  if (!phone) fields.phone = "Enter a valid 10-digit Indian mobile number.";
  if (password.length < 8) fields.password = "Use at least 8 characters.";
  if (Object.keys(fields).length || !phone) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Driver registration is temporarily unavailable. Try again later." };
  const { data, error } = await supabase.auth.signUp({
    phone, password,
    options: { data: { signup_type: "driver", full_name: name } },
  });

  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error?.code === "weak_password") {
    return { fields: { password: "Choose a stronger password using a mix of letters and numbers." } };
  }
  if (error?.code === "phone_exists" || error?.code === "user_already_exists") {
    return { message: "Could not create an account. If you already signed up, log in instead." };
  }
  if (error) return { message: "We couldn't create your account right now. Try again later." };
  if (!data.session || !data.user) {
    return { message: "Could not finish signup. If you already have an account, try logging in." };
  }

  const { data: profile } = await getDriverProfile(supabase, data.user.id);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: "We couldn't open your driver profile. Try logging in again shortly." };
  }
  const { error: logoutError } = await supabase.auth.signOut({ scope: "local" });
  if (logoutError) return { message: "Your account was created. Open your dashboard and log out before signing in again." };
  feedback("login", "account-created");
}

export async function signIn(_: DriverFormState, form: FormData): Promise<DriverFormState> {
  await redirectSignedInDriver();
  const phone = mobileNumber(form);
  const password = value(form, "password");
  const fields: NonNullable<DriverFormState["fields"]> = {};
  if (!phone) fields.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!password) fields.password = "Enter your password.";
  if (Object.keys(fields).length || !phone) return { fields };

  const supabase = await createSupabase();
  if (!supabase) return { message: "Driver login is temporarily unavailable. Try again later." };
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error?.status === 429) return { message: "Too many attempts. Wait a few minutes and try again." };
  if (error?.code === "invalid_credentials") {
    return { message: "That mobile number and password didn't match. Check them and try again." };
  }
  if (error?.status === 0) return { message: "We could not connect to the login service. Try again in a moment." };
  if (error || !data.user) return { message: "We couldn't log you in right now. Try again shortly." };
  const { data: profile, error: profileError } = await getDriverProfile(supabase, data.user.id);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      message: profileError ? "We couldn't load your driver profile. Try again shortly." : "Use a driver account to log in here.",
    };
  }
  redirect("/driver/dashboard");
}

export async function signOut() {
  const { supabase } = await requireDriver();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) feedback("dashboard", "logout-failed");
  feedback("login", "signed-out");
}
