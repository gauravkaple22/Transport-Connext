import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { beginDriverRecovery, driverCallbackUrl, pendingDriverEmailCookie } from "../../../../lib/driver-recovery";
import { createSupabase, getDriverProfile } from "../../../../lib/supabase";

export async function GET(request: NextRequest) {
  const base = driverCallbackUrl();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const supabase = await createSupabase();
  const store = await cookies();
  const pendingEmail = store.get(pendingDriverEmailCookie)?.value;

  if (code && supabase) {
    const flowId = searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error && data.user) {
      const { data: profile } = await getDriverProfile(supabase, data.user.id);
      if (profile && data.user.email_confirmed_at) {
        const recovery = "redirectType" in data && data.redirectType === "recovery";
        if (recovery && await beginDriverRecovery(supabase)) {
          return NextResponse.redirect(new URL("/driver/reset-password", base));
        }
        if (!recovery) {
          store.set(pendingDriverEmailCookie, "", { path: "/driver", maxAge: 0 });
          return NextResponse.redirect(new URL("/driver/profile#recovery-email", base));
        }
      }
      await supabase.auth.signOut({ scope: "local" });
    }
    if (error) console.warn("Driver email callback exchange failed", { code: error.code, name: error.name, status: error.status });
  }

  // Some email changes complete at Supabase without returning a new session.
  // Only an existing driver session with the newly verified address can use this path.
  if (pendingEmail && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await getDriverProfile(supabase, user.id) : { data: null };
    if (profile && user?.email_confirmed_at && user.email?.toLowerCase() === pendingEmail) {
      store.set(pendingDriverEmailCookie, "", { path: "/driver", maxAge: 0 });
      return NextResponse.redirect(new URL("/driver/profile#recovery-email", base));
    }
    if (profile) return NextResponse.redirect(new URL("/driver/profile?notice=email-unconfirmed#recovery-email", base));
  }

  return NextResponse.redirect(new URL("/driver/forgot-password?notice=invalid-link", base));
}
