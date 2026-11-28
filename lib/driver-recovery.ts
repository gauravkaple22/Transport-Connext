import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireDriver } from "./driver";
import type { createSupabase } from "./supabase";

export const pendingDriverEmailCookie = "transport-driver-pending-email";
const recoveryCookie = "transport-driver-recovery";

export function driverCallbackUrl() {
  return new URL("/driver/auth/callback", process.env.APP_URL ?? "http://localhost:3000");
}

export async function beginDriverRecovery(supabase: NonNullable<Awaited<ReturnType<typeof createSupabase>>>) {
  const { data } = await supabase.auth.getClaims();
  const sessionId = data?.claims.session_id;
  if (typeof sessionId !== "string") return false;
  (await cookies()).set(recoveryCookie, sessionId, {
    path: "/driver", httpOnly: true, secure: driverCallbackUrl().protocol === "https:",
    sameSite: "lax", maxAge: 15 * 60,
  });
  return true;
}

export async function clearDriverRecovery() {
  (await cookies()).set(recoveryCookie, "", { path: "/driver", maxAge: 0 });
}

export async function requireDriverRecovery() {
  const driver = await requireDriver("/driver/forgot-password?notice=invalid-link");
  const marker = (await cookies()).get(recoveryCookie)?.value;
  if (!driver.sessionId || marker !== driver.sessionId) redirect("/driver/dashboard");
  return driver;
}
