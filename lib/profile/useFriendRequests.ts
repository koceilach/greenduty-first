"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/* ── types ─────────────────────────────────────────────────── */

export type FriendRequestRow = {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  profile: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
  };
};

export type FriendRow = {
  id: string;
  friendId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  since: string;
};

export type FriendRequestStatus = "none" | "sent" | "received" | "friends";

/* ── hook ──────────────────────────────────────────────────── */

export function useFriendRequests() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Incoming pending requests
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  // Outgoing pending requests
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  // Actual friendships
  const [friends, setFriends] = useState<FriendRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  /* ── fetch everything ────────────────────────────────── */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    setCurrentUserId(uid);

    try {
      // 1. Incoming pending requests
      const { data: inRows } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id, status, created_at")
        .eq("receiver_id", uid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const inSenderIds = (inRows ?? []).map((r) => r.sender_id);

      // 2. Outgoing pending requests
      const { data: outRows } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id, status, created_at")
        .eq("sender_id", uid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const outReceiverIds = (outRows ?? []).map((r) => r.receiver_id);

      // 3. Friendships
      const { data: friendRows } = await supabase
        .from("friendships")
        .select("id, user_a, user_b, created_at")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .order("created_at", { ascending: false });

      const friendUserIds = (friendRows ?? []).map((r) =>
        r.user_a === uid ? r.user_b : r.user_a
      );

      // Fetch all needed profiles in one go
      const allIds = [...new Set([...inSenderIds, ...outReceiverIds, ...friendUserIds])];
      let profileMap: Record<string, { id: string; full_name: string; username: string; avatar_url: string | null; role: string }> = {};

      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, role")
          .in("id", allIds);

        for (const p of profiles ?? []) {
          profileMap[p.id] = p;
        }
      }

      // Map incoming
      const mappedIncoming: FriendRequestRow[] = (inRows ?? []).map((r) => {
        const p = profileMap[r.sender_id];
        return {
          id: r.id,
          senderId: r.sender_id,
          receiverId: r.receiver_id,
          status: r.status as any,
          createdAt: r.created_at,
          profile: {
            id: r.sender_id,
            fullName: p?.full_name ?? "User",
            username: p?.username ?? "",
            avatarUrl: p?.avatar_url ?? null,
            role: p?.role ?? "User",
          },
        };
      });

      // Map outgoing
      const mappedOutgoing: FriendRequestRow[] = (outRows ?? []).map((r) => {
        const p = profileMap[r.receiver_id];
        return {
          id: r.id,
          senderId: r.sender_id,
          receiverId: r.receiver_id,
          status: r.status as any,
          createdAt: r.created_at,
          profile: {
            id: r.receiver_id,
            fullName: p?.full_name ?? "User",
            username: p?.username ?? "",
            avatarUrl: p?.avatar_url ?? null,
            role: p?.role ?? "User",
          },
        };
      });

      // Map friends
      const mappedFriends: FriendRow[] = (friendRows ?? []).map((r) => {
        const fid = r.user_a === uid ? r.user_b : r.user_a;
        const p = profileMap[fid];
        return {
          id: r.id,
          friendId: fid,
          fullName: p?.full_name ?? "User",
          username: p?.username ?? "",
          avatarUrl: p?.avatar_url ?? null,
          role: p?.role ?? "User",
          since: r.created_at,
        };
      });

      setIncoming(mappedIncoming);
      setOutgoing(mappedOutgoing);
      setFriends(mappedFriends);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ── send friend request ─────────────────────────────── */
  const sendRequest = useCallback(
    async (receiverId: string) => {
      if (!currentUserId) return;
      const { error: insertError } = await supabase
        .from("friend_requests")
        .insert({ sender_id: currentUserId, receiver_id: receiverId });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      await refresh();
    },
    [currentUserId, refresh]
  );

  /* ── accept friend request ───────────────────────────── */
  const acceptRequest = useCallback(
    async (requestId: string) => {
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refresh();
    },
    [refresh]
  );

  /* ── decline friend request ──────────────────────────── */
  const declineRequest = useCallback(
    async (requestId: string) => {
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", requestId);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refresh();
    },
    [refresh]
  );

  /* ── cancel outgoing request ─────────────────────────── */
  const cancelRequest = useCallback(
    async (requestId: string) => {
      const { error: deleteError } = await supabase
        .from("friend_requests")
        .delete()
        .eq("id", requestId);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await refresh();
    },
    [refresh]
  );

  /* ── unfriend ────────────────────────────────────────── */
  const unfriend = useCallback(
    async (friendshipId: string) => {
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      // Also clean up any accepted friend_requests between the pair
      await refresh();
    },
    [refresh]
  );

  /* ── check relationship status with a specific user ──── */
  const getRelationship = useCallback(
    (targetId: string): FriendRequestStatus => {
      if (friends.some((f) => f.friendId === targetId)) return "friends";
      if (outgoing.some((r) => r.receiverId === targetId)) return "sent";
      if (incoming.some((r) => r.senderId === targetId)) return "received";
      return "none";
    },
    [friends, outgoing, incoming]
  );

  /* ── get request ID for incoming/outgoing ────────────── */
  const getRequestId = useCallback(
    (targetId: string): string | null => {
      const outReq = outgoing.find((r) => r.receiverId === targetId);
      if (outReq) return outReq.id;
      const inReq = incoming.find((r) => r.senderId === targetId);
      if (inReq) return inReq.id;
      return null;
    },
    [outgoing, incoming]
  );

  /* ── get friendship ID ───────────────────────────────── */
  const getFriendshipId = useCallback(
    (targetId: string): string | null => {
      const f = friends.find((fr) => fr.friendId === targetId);
      return f?.id ?? null;
    },
    [friends]
  );

  return {
    currentUserId,
    loading,
    error,
    incoming,
    outgoing,
    friends,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    getRelationship,
    getRequestId,
    getFriendshipId,
    refresh,
  };
}
