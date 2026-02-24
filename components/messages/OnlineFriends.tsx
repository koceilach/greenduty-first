"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GD_findOrCreateDirectConversation } from "@/lib/messages/direct-conversation";

type FriendOnline = {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  online: boolean;
};

type OnlineFriendsProps = {
  currentUserId: string | null;
};

export function OnlineFriends({ currentUserId }: OnlineFriendsProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendOnline[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingFriendId, setOpeningFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openFriendChat = async (friendId: string) => {
    if (!currentUserId || openingFriendId) return;
    setOpeningFriendId(friendId);
    setError(null);

    const result = await GD_findOrCreateDirectConversation(
      supabase,
      currentUserId,
      friendId
    );

    setOpeningFriendId(null);
    if (!result.conversationId) {
      setError(result.error ?? "Unable to open this chat right now.");
      return;
    }

    router.push(`/messages/${result.conversationId}`);
  };

  useEffect(() => {
    if (!currentUserId) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const fetchOnlineFriends = async () => {
      setLoading(true);

      // Friends are sourced from accepted friendships.
      const [{ data: friendshipRows }, { data: acceptedRows }] = await Promise.all([
        supabase
          .from("friendships")
          .select("user_a, user_b")
          .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`),
        supabase
          .from("friend_requests")
          .select("sender_id, receiver_id")
          .eq("status", "accepted")
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),
      ]);

      const friendIds = Array.from(
        new Set(
          [
            ...(friendshipRows ?? []).map((r) =>
              r.user_a === currentUserId ? r.user_b : r.user_a
            ),
            ...(acceptedRows ?? []).map((r) =>
              r.sender_id === currentUserId ? r.receiver_id : r.sender_id
            ),
          ].filter(Boolean)
        )
      );

      if (!friendIds.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get profiles + presence
      const [{ data: profiles }, { data: presenceRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", friendIds),
        supabase
          .from("user_presence")
          .select("user_id, status")
          .in("user_id", friendIds),
      ]);

      const presenceMap = new Map(
        (presenceRows ?? []).map((r) => [r.user_id, r.status])
      );

      const mapped: FriendOnline[] = (profiles ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        username: p.username,
        avatarUrl: p.avatar_url,
        online: presenceMap.get(p.id) === "online",
      }));

      // Sort: online first
      mapped.sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1));
      setFriends(mapped);
      setLoading(false);
    };

    fetchOnlineFriends();

    // Realtime presence updates
    const channel = supabase
      .channel("online-friends")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row = payload.new as any;
          if (!row?.user_id) return;
          setFriends((prev) =>
            prev
              .map((f) =>
                f.id === row.user_id ? { ...f, online: row.status === "online" } : f
              )
              .sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <div className="px-1 pb-2 pt-1">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Friends Online ({onlineCount})
        </h3>
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-rose-500">{error}</p>
      )}

      <div className="gd-scroll-hide max-h-80 overflow-y-auto px-3 pb-2">
        {!friends.length && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            No friends yet. Accept a friend request to start chatting.
          </p>
        )}

        <div className="space-y-2 pb-1">
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => void openFriendChat(friend.id)}
              disabled={openingFriendId === friend.id}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/50"
            >
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt={friend.fullName ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <span>{friend.fullName?.slice(0, 2).toUpperCase() ?? "?"}</span>
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    friend.online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {friend.fullName ?? friend.username ?? "Unknown"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {openingFriendId === friend.id
                    ? "Opening chat..."
                    : friend.online
                    ? "Active now"
                    : "Offline"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
