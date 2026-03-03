import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export async function createServerSupabaseClient(
  options: { schema?: string; useSession?: boolean } = {}
) {
  const cookieStore = await cookies();
  const useSession = options.useSession ?? true;
  const safeSetCookie = (name: string, value: string, options: Record<string, unknown>) => {
    try {
      cookieStore.set({ name, value, ...options });
    } catch {
      // Server Components can read cookies but cannot always mutate them.
      // Supabase may attempt to clear/set session cookies during auth checks.
      // Ignore mutation failures here and let Server Actions/Route Handlers persist cookies.
    }
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    ...(options.schema ? { db: { schema: options.schema } } : {}),
    cookies: useSession
      ? {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            safeSetCookie(name, value, options);
          },
          remove(name, options) {
            safeSetCookie(name, "", { ...options, maxAge: 0 });
          },
        }
      : {
          get(_name: string) {
            return undefined;
          },
          set(_name: string, _value: string, _options: Record<string, unknown>) {},
          remove(_name: string, _options: Record<string, unknown>) {},
        },
  });
}
