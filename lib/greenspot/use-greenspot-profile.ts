"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { greenspotClient } from "@/lib/supabase/client";

export type GreenspotProfile = {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  name_last_changed_at?: string | null;
  role?: "member" | "admin" | string | null;
  account_tier?: "basic" | "pro" | "impact" | string | null;
  verification_status?: "unverified" | "pending" | "approved" | "rejected" | string | null;
  verification_type?: "student" | "researcher" | string | null;
};

export function useGreenspotProfile(user?: User | null) {
  const [profile, setProfile] = useState<GreenspotProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const isSchemaMismatch = (message?: string) =>
      Boolean(
        message &&
          /column .* does not exist|relation .* does not exist|schema cache|table .* does not exist/i.test(
            message
          )
      );

    const selectWithCooldown =
      "id, email, username, full_name, avatar_url, bio, name_last_changed_at, role, account_tier, verification_status, verification_type";
    const selectWithBio =
      "id, email, username, full_name, avatar_url, bio, role, account_tier, verification_status, verification_type";
    const selectLegacy =
      "id, email, username, full_name, avatar_url, role, account_tier, verification_status, verification_type";

    let query = await greenspotClient
      .from("greenspot_profiles")
      .select(selectWithCooldown)
      .eq("id", user.id)
      .maybeSingle();

    if (query.error && isSchemaMismatch(query.error.message)) {
      query = await greenspotClient
        .from("greenspot_profiles")
        .select(selectWithBio)
        .eq("id", user.id)
        .maybeSingle();
    }

    if (query.error && isSchemaMismatch(query.error.message)) {
      query = await greenspotClient
        .from("greenspot_profiles")
        .select(selectLegacy)
        .eq("id", user.id)
        .maybeSingle();
    }

    if (query.error) {
      setError(query.error.message);
      setProfile(null);
    } else {
      setProfile((query.data as GreenspotProfile | null) ?? null);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refreshProfile: fetchProfile };
}
