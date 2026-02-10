"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase/client";

export type GD_System_Profile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "buyer" | "seller" | "admin";
  account_tier: "basic" | "pro" | "impact";
  verification_status: "unverified" | "pending" | "approved" | "rejected";
  verification_type?: "student" | "researcher" | null;
};

type GD_System_AuthContextValue = {
  supabase: SupabaseClient | null;
  user: User | null;
  profile: GD_System_Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateRole: (role: GD_System_Profile["role"]) => Promise<void>;
};

const GD_System_AuthContext = createContext<GD_System_AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => supabaseClient, []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GD_System_Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const GD_buildProfilePayload = useCallback((currentUser: User) => {
    const fallbackName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "Eco Ranger";

    return {
      id: currentUser.id,
      email: currentUser.email ?? null,
      username: currentUser.user_metadata?.username ?? fallbackName,
      full_name: currentUser.user_metadata?.full_name ?? fallbackName,
      avatar_url:
        currentUser.user_metadata?.avatar_url ??
        currentUser.user_metadata?.picture ??
        null,
      role: "buyer",
      account_tier: "basic",
      verification_status: "unverified",
      verification_type: null,
    } satisfies GD_System_Profile;
  }, []);

  const ensureProfile = useCallback(
    async (currentUser: User | null) => {
      if (!supabase || !currentUser) {
        setProfile(null);
        return;
      }

      try {
        const isMissingColumnError = (message?: string) =>
          Boolean(
            message &&
              (message.includes("schema cache") ||
                message.includes("column") ||
                message.includes("does not exist"))
          );

        const minimalSelect = "id, email, username, avatar_url, role";
        const fullNameSelect = `${minimalSelect}, full_name`;
        const extendedSelect = `${fullNameSelect}, account_tier, verification_status, verification_type`;

        let hasExtendedColumns = true;
        let hasFullNameColumn = true;

        let queryResult = await supabase
          .from("marketplace_profiles")
          .select(extendedSelect)
          .eq("id", currentUser.id)
          .maybeSingle();
        let data = queryResult.data as Partial<GD_System_Profile> | null;
        let error = queryResult.error;

        if (error && isMissingColumnError(error.message)) {
          hasExtendedColumns = false;
          queryResult = await supabase
            .from("marketplace_profiles")
            .select(fullNameSelect)
            .eq("id", currentUser.id)
            .maybeSingle();
          data = queryResult.data as Partial<GD_System_Profile> | null;
          error = queryResult.error;
        }

        if (error && isMissingColumnError(error.message)) {
          hasFullNameColumn = false;
          queryResult = await supabase
            .from("marketplace_profiles")
            .select(minimalSelect)
            .eq("id", currentUser.id)
            .maybeSingle();
          data = queryResult.data as Partial<GD_System_Profile> | null;
          error = queryResult.error;
        }

        if (error) {
          console.warn("Profile fetch failed:", error.message);
          return;
        }

        const fallbackProfile = GD_buildProfilePayload(currentUser);

        const buildNormalizedProfile = (
          source?: Partial<GD_System_Profile> | null,
          overrides: Partial<GD_System_Profile> = {}
        ): GD_System_Profile => {
          const merged = { ...(source ?? {}), ...overrides };
          return {
            id: merged.id ?? fallbackProfile.id,
            email: merged.email ?? fallbackProfile.email,
            username: merged.username ?? fallbackProfile.username,
            full_name: hasFullNameColumn
              ? (merged.full_name ?? fallbackProfile.full_name)
              : fallbackProfile.full_name,
            avatar_url: merged.avatar_url ?? fallbackProfile.avatar_url,
            role: (merged.role ?? fallbackProfile.role) as GD_System_Profile["role"],
            account_tier: hasExtendedColumns
              ? ((merged.account_tier ?? fallbackProfile.account_tier) as GD_System_Profile["account_tier"])
              : "basic",
            verification_status: hasExtendedColumns
              ? ((merged.verification_status ??
                  fallbackProfile.verification_status) as GD_System_Profile["verification_status"])
              : "unverified",
            verification_type: hasExtendedColumns
              ? ((merged.verification_type ?? fallbackProfile.verification_type) as
                  | GD_System_Profile["verification_type"]
                  | null)
              : null,
          };
        };

        if (!data) {
          const upsertPayload: Record<string, unknown> = {
            id: fallbackProfile.id,
            email: fallbackProfile.email,
            username: fallbackProfile.username,
            avatar_url: fallbackProfile.avatar_url,
            role: fallbackProfile.role,
          };
          if (hasFullNameColumn) {
            upsertPayload.full_name = fallbackProfile.full_name;
          }
          if (hasExtendedColumns) {
            upsertPayload.account_tier = fallbackProfile.account_tier;
            upsertPayload.verification_status = fallbackProfile.verification_status;
            upsertPayload.verification_type = fallbackProfile.verification_type;
          }

          const { error: upsertError } = await supabase
            .from("marketplace_profiles")
            .upsert(upsertPayload, { onConflict: "id" });

          if (upsertError) {
            console.warn("Profile upsert failed:", upsertError.message);
            return;
          }

          setProfile(buildNormalizedProfile(fallbackProfile));
          return;
        }

        const patch: Partial<GD_System_Profile> = {};
        if (!data.email && fallbackProfile.email) {
          patch.email = fallbackProfile.email;
        }
        if (!data.username && fallbackProfile.username) {
          patch.username = fallbackProfile.username;
        }
        if (hasFullNameColumn && !data.full_name && fallbackProfile.full_name) {
          patch.full_name = fallbackProfile.full_name;
        }
        if (!data.avatar_url && fallbackProfile.avatar_url) {
          patch.avatar_url = fallbackProfile.avatar_url;
        }
        if (!data.role) {
          patch.role = fallbackProfile.role;
        }
        if (hasExtendedColumns) {
          if (!data.account_tier) {
            patch.account_tier = fallbackProfile.account_tier;
          }
          if (!data.verification_status) {
            patch.verification_status = fallbackProfile.verification_status;
          }
          if (!data.verification_type) {
            patch.verification_type = fallbackProfile.verification_type;
          }
        }

        if (Object.keys(patch).length > 0) {
          const { error: updateError } = await supabase
            .from("marketplace_profiles")
            .update(patch)
            .eq("id", currentUser.id);

          if (updateError) {
            console.warn("Profile update failed:", updateError.message);
            setProfile(buildNormalizedProfile(data));
            return;
          }

          setProfile(buildNormalizedProfile(data, patch));
          return;
        }

        setProfile(buildNormalizedProfile(data));
      } catch (error) {
        console.warn("Profile sync failed:", error);
      }
    },
    [supabase, GD_buildProfilePayload]
  );

  const refreshProfile = useCallback(async () => {
    await ensureProfile(user);
  }, [ensureProfile, user]);

  const updateRole = useCallback(
    async (role: GD_System_Profile["role"]) => {
      if (!supabase || !user) return;
      const { error } = await supabase
        .from("marketplace_profiles")
        .update({ role })
        .eq("id", user.id);
      if (error) {
        console.warn("Role update failed:", error.message);
        return;
      }
      setProfile((prev) => (prev ? { ...prev, role } : prev));
    },
    [supabase, user]
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
        void ensureProfile(currentUser);
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
        void ensureProfile(currentUser);
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
      refreshProfile,
      updateRole,
    }),
    [supabase, user, profile, loading, refreshProfile, updateRole]
  );

  return (
    <GD_System_AuthContext.Provider value={value}>
      {children}
    </GD_System_AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(GD_System_AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
