import NextAuth from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth/options";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let missingServiceRoleWarningLogged = false;

async function emailExistsInSupabaseAuth(email: string): Promise<boolean | null> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!missingServiceRoleWarningLogged) {
      console.warn(
        "Account linking fallback is active: set SUPABASE_SERVICE_ROLE_KEY for reliable auth.users email checks."
      );
      missingServiceRoleWarningLogged = true;
    }
    return null;
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Supabase auth.users lookup failed:", error.message);
      return null;
    }

    const users = data?.users ?? [];
    if (users.some((item) => item.email?.toLowerCase() === email)) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }

    page += 1;
  }
}

async function emailExistsInKnownProfileTables(email: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const candidateTables = ["marketplace_profiles", "greenspot_profiles", "profiles"];

  for (const table of candidateTables) {
    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("email", email)
      .limit(1);

    if (error) {
      continue;
    }

    if ((data ?? []).length > 0) {
      return true;
    }
  }

  return false;
}

async function manualAccountExistsByEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const authExists = await emailExistsInSupabaseAuth(normalizedEmail);
  if (authExists !== null) {
    return authExists;
  }

  // Fallback when service-role lookup is unavailable.
  return emailExistsInKnownProfileTables(normalizedEmail);
}

const handler = NextAuth({
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }

      // Real lookup: checks Supabase auth users first, then profile-table fallback.
      const existingManualAccount = await manualAccountExistsByEmail(email);

      if (existingManualAccount) {
        // Allow Google sign-in so this session can be linked to the existing account.
        return true;
      }

      // No existing manual account found: allow normal NextAuth behavior.
      void profile;
      return true;
    },
  },
});

export { handler as GET, handler as POST };
