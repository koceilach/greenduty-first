"use client";

import { ChatRoom } from "@/components/messages/ChatRoom";
import { OnlineFriends } from "@/components/messages/OnlineFriends";
import { usePresence } from "@/lib/messages/usePresence";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

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
  } | undefined>();

  useEffect(() => {
    if (!chatId) return;

    const loadOtherUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setCurrentUserId(user.id);

      // Get the other participant
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select(
          `
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `
        )
        .eq("conversation_id", chatId)
        .neq("user_id", user.id);

      const otherParticipant = participants?.[0];
      if (!otherParticipant) return;

      const prof = first(otherParticipant.profiles as any);
      if (!prof) return;

      // Check presence
      const { data: presence } = await supabase
        .from("user_presence")
        .select("status")
        .eq("user_id", prof.id)
        .single();

      setOtherUser({
        id: prof.id,
        fullName: prof.full_name,
        username: prof.username,
        avatarUrl: prof.avatar_url,
        online: presence?.status === "online",
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
          if (row?.user_id && otherUser && row.user_id === otherUser.id) {
            setOtherUser((prev) =>
              prev ? { ...prev, online: row.status === "online" } : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
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
                      alt={otherUser.fullName ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{otherUser.fullName?.slice(0, 2).toUpperCase() ?? "?"}</span>
                  )}
                </div>
                {otherUser.online && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {otherUser.fullName}
              </p>
              {otherUser.username && (
                <p className="text-xs text-slate-400">@{otherUser.username}</p>
              )}
              <p className="mt-1 text-xs text-emerald-500">
                {otherUser.online ? "Active now" : "Offline"}
              </p>
            </div>
          )}
        </div>

        <OnlineFriends currentUserId={currentUserId} />
      </aside>
    </div>
  );
}
