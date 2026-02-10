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
  updateRole: (role: MarketplaceProfile["role"]) => Promise<void>;
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

  const fetchProfile = useCallback(
    async (currentUser: User | null) => {
      if (!supabase || !currentUser) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_profiles")
        .select(
          "id, email, username, role, bio, store_name, avatar_url, location, store_latitude, store_longitude, created_at, updated_at"
        )
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn("Marketplace profile fetch failed:", error.message);
        setProfile(null);
        return;
      }

      if (!data) {
        setProfile(null);
        return;
      }

      setProfile(data as MarketplaceProfile);
    },
    [supabase]
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

      const { error: profileError } = await supabase
        .from("marketplace_profiles")
        .insert([
          {
            id: authUser.id,
            email,
            username,
            role: "buyer",
          },
        ]);

      if (profileError) {
        return { error: profileError.message };
      }

      setUser(authUser);
      await fetchProfile(authUser);
      return { error: null };
    },
    [supabase, fetchProfile]
  );

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!supabase) return { error: "Supabase is not configured." };

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      const authUser = data.user;
      if (!authUser) {
        return { error: "Unable to sign in right now." };
      }

      const { data: profileData, error: profileError } = await supabase
        .from("marketplace_profiles")
        .select(
          "id, email, username, role, bio, store_name, avatar_url, location, store_latitude, store_longitude, created_at, updated_at"
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError || !profileData) {
        const isMarketplaceUser =
          authUser.user_metadata?.marketplace === true ||
          authUser.user_metadata?.marketplace === "true";
        if (isMarketplaceUser) {
          const { error: insertError } = await supabase
            .from("marketplace_profiles")
            .insert([
              {
                id: authUser.id,
                email: authUser.email ?? email,
                username:
                  (authUser.user_metadata?.username as string | undefined) ??
                  null,
                role: "buyer",
              },
            ]);

          if (!insertError) {
            const { data: retryProfile } = await supabase
              .from("marketplace_profiles")
              .select(
                "id, email, username, role, bio, store_name, avatar_url, location, store_latitude, store_longitude, created_at, updated_at"
              )
              .eq("id", authUser.id)
              .maybeSingle();

            if (retryProfile) {
              setUser(authUser);
              setProfile(retryProfile as MarketplaceProfile);
              return { error: null };
            }
          }
        }

        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return {
          error:
            "No marketplace profile found. Please register a Marketplace account.",
        };
      }

      setUser(authUser);
      setProfile(profileData as MarketplaceProfile);
      return { error: null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        void fetchProfile(currentUser);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        void fetchProfile(currentUser);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

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
