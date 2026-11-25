import { NextRequest, NextResponse } from "next/server";
import { beginCompanyRecovery, getCompanyProfile, companyCallbackUrl } from "../../../../lib/company";
import { createSupabase } from "../../../../lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const base = companyCallbackUrl();
  const supabase = await createSupabase();

  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await getCompanyProfile(supabase, data.user.id);
      if (profile) {
        if (request.nextUrl.searchParams.get("flow") === "recovery") {
          if (await beginCompanyRecovery(supabase)) {
            return NextResponse.redirect(new URL("/company/reset-password", base));
          }
          return NextResponse.redirect(new URL("/company/forgot-password", base));
        }
        return NextResponse.redirect(new URL("/company/dashboard", base));
      }
      await supabase.auth.signOut({ scope: "local" });
    }
  }

  return NextResponse.redirect(new URL("/company/login?notice=invalid-link", base));
}
