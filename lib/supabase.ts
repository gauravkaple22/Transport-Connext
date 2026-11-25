import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export async function createSupabase() {
  const config = supabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        try {
          for (const { name, value, options } of updates) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          // Server Components only read cookies. The proxy handles refreshes.
          if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) {
            throw error;
          }
        }
      },
    },
  });
}

export async function getDriverProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabase>>>,
  userId: string,
) {
  return supabase
    .from("driver_profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

}
