import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates, headers) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers ?? {})) {
          response.headers.set(name, value);
        }
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/driver/dashboard",
    "/driver/login",
    "/driver/signup",
    "/driver/forgot-password",
    "/driver/profile",
    "/driver/loads",
    "/driver/offers",
    "/driver/trips",
    "/login",
    "/admin/login",
    "/admin/dashboard",
    "/admin/commissions",
    "/company/dashboard",
    "/company/profile",
    "/company/payments",
    "/company/commissions",
    "/company/trips",
    "/company/login",
    "/company/signup",
    "/company/forgot-password",
    "/company/verify-code",
    "/company/reset-password",
    "/company/loads/:path*",
  ],
};
