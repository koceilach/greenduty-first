"use client";

import { ChatRoom } from "@/components/messages/ChatRoom";
import { OnlineFriends } from "@/components/messages/OnlineFriends";
import { usePresence } from "@/lib/messages/usePresence";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const shortAgo = (iso: string | null) => {
  if (!iso) return null;
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
};

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId as string;
  usePresence(); // keeps user online

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    online: boolean;
    status: "online" | "offline" | "away";
    lastSeenAt: string | null;
  } | undefined>();
  const otherUserDisplayName =
    otherUser?.fullName?.trim() || otherUser?.username?.trim() || "User";

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    const loadOtherUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      if (!cancelled) setCurrentUserId(user.id);

      // Get one participant that is not the logged-in user.
      const { data: participantRow, error: participantError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", chatId)
        .neq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (participantError || !participantRow?.user_id) return;
      const otherUserId = participantRow.user_id as string;

      // Load profile separately to avoid fragile nested relation behavior.
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", otherUserId)
        .maybeSingle();

      // Check presence
      const { data: presence } = await supabase
        .from("user_presence")
        .select("status, last_seen_at")
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (cancelled) return;

      setOtherUser({
        id: profile?.id ?? otherUserId,
        fullName: profile?.full_name ?? null,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        online: presence?.status === "online",
        status: (presence?.status as "online" | "offline" | "away") ?? "offline",
        lastSeenAt: presence?.last_seen_at ?? null,
      });
    };

    loadOtherUser();

    // Subscribe to presence changes for the other user
    const channel = supabase
      .channel(`presence-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row = payload.new as any;
          if (!row?.user_id) return;
          setOtherUser((prev) =>
            !prev || row.user_id !== prev.id
              ? prev
              : {
                  ...prev,
                  online: row.status === "online",
                  status: (row.status as "online" | "offline" | "away") ?? "offline",
                  lastSeenAt: row.last_seen_at ?? prev.lastSeenAt,
                }
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  return (
    <div className="flex h-screen">
      {/* Main chat */}
      <div className="flex-1">
        <ChatRoom conversationId={chatId} otherUser={otherUser} />
      </div>

      {/* Right sidebar (desktop only) */}
      <aside className="hidden w-72 border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:block">
        <div className="p-4">
          {/* Other user mini-profile */}
          {otherUser && (
            <div className="mb-6 flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="relative mb-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {otherUser.avatarUrl ? (
                    <img
                      src={otherUser.avatarUrl}
                      alt={otherUserDisplayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{otherUserDisplayName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                {otherUser.online && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {otherUserDisplayName}
              </p>
              {otherUser.username && (
                <p className="text-xs text-slate-400">@{otherUser.username}</p>
              )}
              <p className={`mt-1 text-xs ${otherUser.status === "online" ? "text-emerald-500" : "text-slate-400"}`}>
                {otherUser.status === "online"
                  ? `Online${shortAgo(otherUser.lastSeenAt) ? ` - active ${shortAgo(otherUser.lastSeenAt)} ago` : ""}`
                  : otherUser.status === "away"
                  ? `Away${shortAgo(otherUser.lastSeenAt) ? ` - seen ${shortAgo(otherUser.lastSeenAt)} ago` : ""}`
                  : `Offline${shortAgo(otherUser.lastSeenAt) ? ` - last seen ${shortAgo(otherUser.lastSeenAt)} ago` : ""}`}
              </p>
            </div>
          )}
        </div>

        <OnlineFriends currentUserId={currentUserId} />
      </aside>
    </div>
  );
}

