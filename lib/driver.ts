import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabase, getDriverProfile } from "./supabase";

const driverSession = cache(async () => {
  const supabase = await createSupabase();
  if (!supabase) return { kind: "unavailable" as const };

  const { data, error } = await supabase.auth.getClaims();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500)) return { kind: "unavailable" as const };
  if (!data?.claims?.sub) return { kind: "guest" as const };

  const { data: profile, error: profileError } = await getDriverProfile(supabase, data.claims.sub);
  if (profileError) return { kind: "unavailable" as const };
  if (!profile) return { kind: "other-account" as const };

  const phone = data.claims.phone;
  const lastFour = typeof phone === "string" ? phone.match(/[0-9]{4}$/)?.[0] : undefined;
  return { kind: "driver" as const, supabase, profile, lastFour, userId: data.claims.sub, sessionId: data.claims.session_id };
});

export async function isSignedInDriver() {
  return (await driverSession()).kind === "driver";
}

export async function redirectSignedInDriver() {
  if (await isSignedInDriver()) redirect("/driver/dashboard");
}

export async function requireDriver(loginPath = "/driver/login") {
  const session = await driverSession();
  if (session.kind === "guest") redirect(loginPath);
  if (session.kind === "other-account") redirect("/driver/login?notice=driver-required");
  if (session.kind === "unavailable") redirect("/driver/login?notice=unavailable");
  return session;
}
