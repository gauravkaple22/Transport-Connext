import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabase } from "./supabase";

const adminSession = cache(async () => {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  const { data: allowed, error } = await supabase.rpc("is_platform_admin");
  return !error && allowed === true ? supabase : null;
});

export async function isSignedInAdmin() {
  return Boolean(await adminSession());
}

export async function requireAdmin() {
  const supabase = await adminSession();
  if (!supabase) redirect("/admin/login");
  return supabase;
}
