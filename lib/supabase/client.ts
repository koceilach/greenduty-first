import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const baseClientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
} as const;

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  baseClientOptions
);

export const greenspotClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  ...baseClientOptions,
  db: { schema: "greenspot" },
  isSingleton: false,
});

// Backwards-compatible export for pages importing `supabase` directly.
export const supabase = supabaseClient;
