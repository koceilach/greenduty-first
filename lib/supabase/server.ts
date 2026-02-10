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

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    ...(options.schema ? { db: { schema: options.schema } } : {}),
    cookies: useSession
      ? {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
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
