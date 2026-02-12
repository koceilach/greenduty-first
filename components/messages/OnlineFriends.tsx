"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

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
  const [friends, setFriends] = useState<FriendOnline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchOnlineFriends = async () => {
      // Get people the user follows
      const { data: followingRows } = await supabase
        .from("profile_follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      const followingIds = (followingRows ?? []).map((r) => r.following_id);
      if (!followingIds.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get profiles + presence
      const [{ data: profiles }, { data: presenceRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", followingIds),
        supabase
          .from("user_presence")
          .select("user_id, status")
          .in("user_id", followingIds),
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
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Friends Online ({onlineCount})
        </h3>
      </div>

      <div className="max-h-80 overflow-y-auto px-2">
        {!friends.length && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            No friends yet. Follow someone to see them here.
          </p>
        )}

        {friends.map((friend) => (
          <Link
            key={friend.id}
            href={`/profile/${friend.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                {friend.online ? "Active now" : "Offline"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
