"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase/client";

export type MarketplaceProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: "buyer" | "seller" | "admin";
  bio: string | null;
  store_name: string | null;
  avatar_url: string | null;
  location: string | null;
  store_latitude: number | null;
  store_longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SellerApplication = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  store_name: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  id_file_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

type MarketplaceAuthContextValue = {
  supabase: SupabaseClient | null;
  user: User | null;
  profile: MarketplaceProfile | null;
  loading: boolean;
  signUp: (payload: {
    email: string;
    password: string;
    username: string;
  }) => Promise<{ error: string | null }>;
  signIn: (payload: { email: string; password: string }) => Promise<{
    error: string | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<MarketplaceProfile>) => Promise<void>;
  /** @deprecated Use submitSellerApplication instead. Only admins can change roles via RLS. */
  updateRole: (role: MarketplaceProfile["role"]) => Promise<void>;
  submitSellerApplication: (payload: {
    store_name: string;
    bio: string;
    location: string;
    phone?: string;
    full_name?: string;
    id_file?: File | null;
  }) => Promise<{ error: string | null }>;
  getMySellerApplication: () => Promise<SellerApplication | null>;
};

const MarketplaceAuthContext = createContext<
  MarketplaceAuthContextValue | undefined
>(undefined);

export function MarketplaceAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => supabaseClient, []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const MP_SELECT_COLS =
    "id, email, username, role, bio, store_name, avatar_url, location, store_latitude, store_longitude, created_at, updated_at";

  /**
   * Ensures a marketplace_profiles row exists for the given user.
   * Handles all edge cases:
   *  - Row exists but email/username are null (from backfill migrations)
   *  - Row doesn't exist at all
   *  - RPC function not deployed yet
   */
  const ensureProfile = useCallback(
    async (authUser: User): Promise<MarketplaceProfile | null> => {
      if (!supabase) return null;

      const email = authUser.email ?? "";
      const username =
        (authUser.user_metadata?.username as string | undefined) ??
        (email.split("@")[0] || "user");

      // Step 1: Check if profile row already exists.
      const { data: existing, error: selectError } = await supabase
        .from("marketplace_profiles")
        .select(MP_SELECT_COLS)
        .eq("id", authUser.id)
        .maybeSingle();

      if (selectError) {
        console.error("[Marketplace] SELECT profile failed:", selectError.message);
      }

      if (existing) {
        let mp = existing as MarketplaceProfile;

        // Fix missing email/username on existing rows
        const needsFix =
          !mp.email ||
          !mp.username;

        if (needsFix) {
          // Try RPC first (bypasses RLS).
          const { error: rpcErr } = await supabase.rpc(
            "ensure_marketplace_profile",
            { p_email: email, p_username: username }
          );

          if (rpcErr) {
            // RPC not available, try direct update.
            const updates: Record<string, string> = {};
            if (!mp.email) updates.email = email;
            if (!mp.username) updates.username = username;

            if (Object.keys(updates).length > 0) {
              await supabase
                .from("marketplace_profiles")
                .update(updates)
                .eq("id", authUser.id);
            }
          }

          // Re-fetch to get updated data
          const { data: refreshed } = await supabase
            .from("marketplace_profiles")
            .select(MP_SELECT_COLS)
            .eq("id", authUser.id)
            .maybeSingle();

          if (refreshed) mp = refreshed as MarketplaceProfile;
        }

        return mp;
      }

      // Step 2: No row exists, create one.

      // Try RPC first (SECURITY DEFINER).
      const { error: rpcCreateErr } = await supabase.rpc(
        "ensure_marketplace_profile",
        { p_email: email, p_username: username }
      );

      if (!rpcCreateErr) {
        const { data: afterRpc } = await supabase
          .from("marketplace_profiles")
          .select(MP_SELECT_COLS)
          .eq("id", authUser.id)
          .maybeSingle();

        if (afterRpc) {
          return afterRpc as MarketplaceProfile;
        }
      } else {
        console.warn("[Marketplace] RPC unavailable:", rpcCreateErr.message);
      }

      // Fallback: direct insert
      const { error: insertErr } = await supabase
        .from("marketplace_profiles")
        .insert({
          id: authUser.id,
          email,
          username,
          role: "buyer",
        });

      if (insertErr) {
        console.warn("[Marketplace] INSERT failed:", insertErr.message);
      }

      // Final fetch
      const { data: afterInsert } = await supabase
        .from("marketplace_profiles")
        .select(MP_SELECT_COLS)
        .eq("id", authUser.id)
        .maybeSingle();

      if (afterInsert) {
        return afterInsert as MarketplaceProfile;
      }

      // Absolute last resort: return a synthetic profile so UI doesn't break
      if (authUser.id && email) {
        return {
          id: authUser.id,
          email,
          username,
          role: "buyer",
          bio: null,
          store_name: null,
          avatar_url: null,
          location: null,
          store_latitude: null,
          store_longitude: null,
          created_at: null,
          updated_at: null,
        };
      }

      return null;
    },
    [supabase]
  );

  const fetchProfile = useCallback(
    async (currentUser: User | null) => {
      if (!supabase || !currentUser) {
        setProfile(null);
        return;
      }
      const mp = await ensureProfile(currentUser);
      setProfile(mp);
    },
    [supabase, ensureProfile]
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [fetchProfile, user]);

  const signUp = useCallback(
    async ({
      email,
      password,
      username,
    }: {
      email: string;
      password: string;
      username: string;
    }) => {
      if (!supabase) return { error: "Supabase is not configured." };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            marketplace: true,
            username,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      const authUser = data.user;
      if (!authUser) {
        return {
          error:
            "Account created. Please verify your email, then log in to continue.",
        };
      }

      if (!data.session) {
        return { error: null };
      }

      // Use ensureProfile to avoid duplicate-key races when profile row
      // already exists (trigger/RPC/another client path).
      const mp = await ensureProfile(authUser);
      setUser(authUser);
      setProfile(mp);
      return { error: null };
    },
    [supabase, ensureProfile]
  );

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!supabase) return { error: "Supabase is not configured." };

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Detect wrong password for existing users
        if (error.message === "Invalid login credentials") {
          return {
            error:
              "Invalid login credentials. If you registered via Reported Area, use the same password here.",
          };
        }
        return { error: error.message };
      }

      const authUser = data.user;
      if (!authUser) {
        return { error: "Unable to sign in right now." };
      }

      // ensureProfile creates the row if it doesn't exist
      const mp = await ensureProfile(authUser);
      setUser(authUser);
      setProfile(mp);
      return { error: null };
    },
    [supabase, ensureProfile]
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      const globalResult = await Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: "Sign out request timed out." } }),
            4500
          )
        ),
      ]);

      if (globalResult?.error) {
        const localResult = await supabase.auth.signOut({ scope: "local" });
        if (localResult.error) {
          console.warn(
            "[Marketplace] Sign out fallback failed:",
            localResult.error.message
          );
        }
      }
    } catch (error) {
      console.warn("[Marketplace] Sign out threw an error:", error);
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, [supabase]);

  const updateProfile = useCallback(
    async (payload: Partial<MarketplaceProfile>) => {
      if (!supabase || !user) return;
      const { error } = await supabase
        .from("marketplace_profiles")
        .update(payload)
        .eq("id", user.id);
      if (error) {
        console.warn("Marketplace profile update failed:", error.message);
        return;
      }
      await fetchProfile(user);
    },
    [supabase, user, fetchProfile]
  );

  const updateRole = useCallback(
    async (role: MarketplaceProfile["role"]) => {
      if (!supabase || !user) return;
      // Role changes are now blocked by RLS for non-admins.
      // This function is kept for backward compat but will fail at DB level.
      const { error } = await supabase
        .from("marketplace_profiles")
        .update({ role })
        .eq("id", user.id);
      if (error) {
        console.warn("Marketplace role update failed:", error.message);
        return;
      }
      await fetchProfile(user);
    },
    [supabase, user, fetchProfile]
  );

  const submitSellerApplication = useCallback(
    async (payload: {
      store_name: string;
      bio: string;
      location: string;
      phone?: string;
      full_name?: string;
      id_file?: File | null;
    }): Promise<{ error: string | null }> => {
      if (!supabase || !user) return { error: "Please sign in first." };

      // Check if already a seller
      if (profile?.role === "seller") return { error: "You are already a seller." };

      // Check for existing pending application
      const { data: existing } = await supabase
        .from("marketplace_seller_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) return { error: "You already have a pending application." };

      // Upload ID file if provided
      let idFileUrl: string | null = null;
      if (payload.id_file) {
        const ext = payload.id_file.name.split(".").pop() ?? "jpg";
        const path = `seller-applications/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, payload.id_file, { upsert: true });
        if (uploadError) {
          return { error: "ID upload failed. Please retry with a clear file." };
        }
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        idFileUrl = urlData?.publicUrl ?? null;
      }

      const { error } = await supabase
        .from("marketplace_seller_applications")
        .insert([
          {
            user_id: user.id,
            email: user.email ?? profile?.email ?? null,
            full_name: payload.full_name ?? profile?.username ?? null,
            store_name: payload.store_name,
            phone: payload.phone ?? null,
            location: payload.location,
            bio: payload.bio,
            id_file_url: idFileUrl,
            status: "pending",
          },
        ]);

      if (error) return { error: error.message };
      return { error: null };
    },
    [supabase, user, profile]
  );

  const getMySellerApplication = useCallback(async (): Promise<SellerApplication | null> => {
    if (!supabase || !user) return null;
    const { data } = await supabase
      .from("marketplace_seller_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as SellerApplication | null;
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const mp = await ensureProfile(currentUser);
          if (mounted) setProfile(mp);
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const mp = await ensureProfile(currentUser);
          if (mounted) setProfile(mp);
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, ensureProfile]);

  const value = useMemo(
    () => ({
      supabase,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      updateRole,
      submitSellerApplication,
      getMySellerApplication,
    }),
    [
      supabase,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      updateRole,
      submitSellerApplication,
      getMySellerApplication,
    ]
  );

  return (
    <MarketplaceAuthContext.Provider value={value}>
      {children}
    </MarketplaceAuthContext.Provider>
  );
}

export function useMarketplaceAuth() {
  const context = useContext(MarketplaceAuthContext);
  if (!context) {
    throw new Error(
      "useMarketplaceAuth must be used within MarketplaceAuthProvider"
    );
  }
  return context;
}
