"use client";

import type { Conversation } from "@/lib/messages/types";
import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ChatListProps = {
  conversations: Conversation[];
  loading: boolean;
  currentUserId: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ChatList({ conversations, loading, currentUserId }: ChatListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = c.otherUser?.fullName?.toLowerCase() ?? c.name?.toLowerCase() ?? "";
      const username = c.otherUser?.username?.toLowerCase() ?? "";
      return name.includes(q) || username.includes(q);
    });
  }, [conversations, search]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-2 w-40 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {!filtered.length && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MessageCircle className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="mt-1 text-xs">Start chatting from a friend&apos;s profile</p>
          </div>
        )}

        {filtered.map((conv) => {
          const other = conv.otherUser;
          const displayName = conv.type === "group" ? conv.name : other?.fullName ?? "Unknown";
          const avatar = displayName?.slice(0, 2).toUpperCase() ?? "?";
          const avatarUrl = conv.type === "group" ? conv.avatarUrl : other?.avatarUrl;
          const online = other?.online ?? false;
          const lastMsg = conv.lastMessage;
          const isOwnMsg = lastMsg?.senderId === currentUserId;

          let preview = "";
          if (lastMsg) {
            if (lastMsg.messageType === "voice") preview = "🎤 Voice message";
            else if (lastMsg.messageType === "image") preview = "📷 Photo";
            else preview = lastMsg.content ?? "";
          }

          return (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50"
            >
              {/* Avatar + online indicator */}
              <div className="relative flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <span>{avatar}</span>
                  )}
                </div>
                {online && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </span>
                  {lastMsg && (
                    <span className="ml-2 flex-shrink-0 text-xs text-slate-400">
                      {timeAgo(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {isOwnMsg && "You: "}
                    {preview || "No messages yet"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1E7F43] text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
