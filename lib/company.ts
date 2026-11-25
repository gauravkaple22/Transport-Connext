import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabase } from "./supabase";

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

const recoveryCookie = "transport-company-recovery";

export function getCompanyProfile(supabase: Supabase, userId: string) {
  return supabase
    .from("company_profiles")
    .select("company_name, contact_name, contact_mobile, secondary_contact_mobile, business_address, city, state, gstin")
    .eq("user_id", userId)
    .maybeSingle();
}

async function companyIdentity(supabase: Supabase) {
  const { data, error } = await supabase.auth.getClaims();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500)) {
    throw new Error("Company session request failed");
  }
  return data?.claims;
}

export async function requireCompany(loginPath = "/company/login") {
  const supabase = await createSupabase();
  if (!supabase) redirect("/company/login?notice=unavailable");

  const claims = await companyIdentity(supabase);
  if (!claims?.sub) redirect(loginPath);

  const { data: profile, error } = await getCompanyProfile(supabase, claims.sub);
  if (error) throw new Error("Company profile request failed");
  if (!profile) redirect("/company/login?notice=company-required");

  return {
    supabase, userId: claims.sub, sessionId: claims.session_id, profile,
    email: typeof claims.email === "string" ? claims.email : "",
  };
}

async function companyIsSignedIn(client: Supabase | null) {
  if (!client) return false;

  const { data } = await client.auth.getClaims();
  if (!data?.claims?.sub) return false;

  const { data: profile } = await getCompanyProfile(client, data.claims.sub);
  return Boolean(profile);
}

export const isSignedInCompany = cache(async () => companyIsSignedIn(await createSupabase()));

export async function redirectSignedInCompany(supabase?: Supabase) {
  const signedIn = supabase ? await companyIsSignedIn(supabase) : await isSignedInCompany();
  if (signedIn) redirect("/company/dashboard");
}

export function companyLoginDestination(next?: string) {
  if (next === "loads") return "/company/loads";
  if (next === "post-load") return "/company/loads/new";
  if (next === "trips") return "/company/trips";
  if (next === "commissions") return "/company/commissions";
  if (next === "payments") return "/company/payments";
  if (next === "profile") return "/company/profile";
  return "/company/dashboard";
}

export async function beginCompanyRecovery(supabase: Supabase) {
  const claims = await companyIdentity(supabase);
  const sessionId = claims?.session_id;
  if (typeof sessionId !== "string") return false;

  const store = await cookies();
  store.set(recoveryCookie, sessionId, {
    path: "/company",
    httpOnly: true,
    sameSite: "lax",
    secure: companyCallbackUrl().startsWith("https:"),
    maxAge: 15 * 60,
  });
  return true;
}

export async function clearCompanyRecovery() {
  (await cookies()).set(recoveryCookie, "", { path: "/company", maxAge: 0 });
}

export async function requireCompanyRecovery() {
  const company = await requireCompany("/company/forgot-password");
  const recovery = (await cookies()).get(recoveryCookie)?.value;
  if (typeof company.sessionId !== "string" || recovery !== company.sessionId) {
    redirect("/company/dashboard");
  }
  return company;
}

export function companyCallbackUrl(recovery = false) {
  return new URL(recovery ? "/company/auth/callback?flow=recovery" : "/company/auth/callback", process.env.APP_URL ?? "http://localhost:3000").toString();
}
