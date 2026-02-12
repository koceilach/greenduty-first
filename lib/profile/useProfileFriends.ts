"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type FriendProfile = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  role: string;
  isFollowing: boolean;
  isFollower: boolean;
};

export function useProfileFriends() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
      supabase.from("profile_follows").select("following_id").eq("follower_id", user.id),
      supabase.from("profile_follows").select("follower_id").eq("following_id", user.id),
    ]);

    const followingIds = new Set((followingRows ?? []).map((row) => row.following_id));
    const followerIds = new Set((followerRows ?? []).map((row) => row.follower_id));

    const allIds = Array.from(new Set([...followingIds, ...followerIds])).filter((id) => id !== user.id);
    if (!allIds.length) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, role")
      .in("id", allIds);

    if (profileError) {
      setError(profileError.message);
      setProfiles([]);
      setLoading(false);
      return;
    }

    const mapped = (profileRows ?? []).map((row) => {
      const displayName = row.full_name || row.username || "User";
      const handle = row.username ? `@${row.username}` : `@${row.id.slice(0, 6)}`;
      const roleLabel =
        row.role?.toLowerCase().includes("expert")
          ? "Expert"
          : row.role?.toLowerCase().includes("admin")
          ? "Admin"
          : "User";
      return {
        id: row.id,
        name: displayName,
        handle,
        avatarUrl: row.avatar_url ?? null,
        role: roleLabel,
        isFollowing: followingIds.has(row.id),
        isFollower: followerIds.has(row.id),
      } satisfies FriendProfile;
    });

    setProfiles(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const follow = useCallback(
    async (targetId: string) => {
      if (!currentUserId) return;
      const { error: insertError } = await supabase
        .from("profile_follows")
        .insert({ follower_id: currentUserId, following_id: targetId });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === targetId ? { ...profile, isFollowing: true } : profile
        )
      );
    },
    [currentUserId]
  );

  const unfollow = useCallback(
    async (targetId: string) => {
      if (!currentUserId) return;
      const { error: deleteError } = await supabase
        .from("profile_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetId);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === targetId ? { ...profile, isFollowing: false } : profile
        )
      );
    },
    [currentUserId]
  );

  const friends = useMemo(() => profiles.filter((p) => p.isFollower && p.isFollowing), [profiles]);
  const following = useMemo(() => profiles.filter((p) => p.isFollowing), [profiles]);
  const followers = useMemo(() => profiles.filter((p) => p.isFollower && !p.isFollowing), [profiles]);

  return {
    currentUserId,
    loading,
    error,
    friends,
    following,
    followers,
    follow,
    unfollow,
    refresh: fetchFriends,
  };
}
