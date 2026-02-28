import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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

type BrowserSupabaseClient = SupabaseClient;

const GD_SUPABASE_CLIENT_KEY = "__gd_supabase_browser_client__";
const GD_SUPABASE_GREENSPOT_CLIENT_KEY = "__gd_supabase_greenspot_client__";

type GlobalSupabaseCache = typeof globalThis & {
  [GD_SUPABASE_CLIENT_KEY]?: BrowserSupabaseClient;
  [GD_SUPABASE_GREENSPOT_CLIENT_KEY]?: BrowserSupabaseClient;
};

const globalCache = globalThis as GlobalSupabaseCache;

let cachedBrowserClient: BrowserSupabaseClient | undefined;
let cachedGreenspotClient: BrowserSupabaseClient | undefined;

export function createClient(): BrowserSupabaseClient {
  if (cachedBrowserClient) return cachedBrowserClient;

  const fromGlobal = globalCache[GD_SUPABASE_CLIENT_KEY];
  if (fromGlobal) {
    cachedBrowserClient = fromGlobal;
    return fromGlobal;
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, baseClientOptions);
  cachedBrowserClient = client;
  globalCache[GD_SUPABASE_CLIENT_KEY] = client;
  return client;
}

export function createGreenspotClient(): BrowserSupabaseClient {
  if (cachedGreenspotClient) return cachedGreenspotClient;

  const fromGlobal = globalCache[GD_SUPABASE_GREENSPOT_CLIENT_KEY];
  if (fromGlobal) {
    cachedGreenspotClient = fromGlobal;
    return fromGlobal;
  }

  // Reuse the singleton auth client and switch schema without creating a new GoTrue client.
  const greenspot = createClient().schema("greenspot") as unknown as BrowserSupabaseClient;
  cachedGreenspotClient = greenspot;
  globalCache[GD_SUPABASE_GREENSPOT_CLIENT_KEY] = greenspot;
  return greenspot;
}

export const supabaseClient = createClient();
export const greenspotClient = createGreenspotClient();

// Backwards-compatible export for pages importing `supabase` directly.
export const supabase = supabaseClient;
