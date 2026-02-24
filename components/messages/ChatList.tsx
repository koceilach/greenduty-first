"use client";

import type { Conversation } from "@/lib/messages/types";
import { BellOff, CheckCheck, MessageCircle, MoreVertical, Pin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type ChatListProps = {
  conversations: Conversation[];
  loading: boolean;
  currentUserId: string | null;
  onOpenDirect?: (otherUserId: string) => Promise<string | null>;
  onTogglePin?: (conversationId: string, nextPinned: boolean) => Promise<boolean>;
  onToggleMute?: (conversationId: string, nextMuted: boolean) => Promise<boolean>;
  onMarkRead?: (conversationId: string) => Promise<void>;
};

type ConversationFilter = "all" | "unread" | "online" | "pinned";
type ConversationMenu = {
  conversationId: string;
  top: number;
  left: number;
  width: number;
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

export function ChatList({
  conversations,
  loading,
  currentUserId,
  onOpenDirect,
  onTogglePin,
  onToggleMute,
  onMarkRead,
}: ChatListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
  const [menu, setMenu] = useState<ConversationMenu | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const closeMenu = () => setMenu(null);

  const openMenu = (event: MouseEvent<HTMLButtonElement>, conversationId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(240, viewportWidth - 16);
    const estimatedHeight = 172;
    const openDown = rect.bottom + estimatedHeight + 8 <= viewportHeight;
    const top = openDown
      ? rect.bottom + 8
      : Math.max(8, rect.top - estimatedHeight - 8);
    const left = Math.min(
      viewportWidth - width - 8,
      Math.max(8, rect.right - width)
    );

    setMenu({ conversationId, top, left, width });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = conversations;

    if (query) {
      rows = rows.filter((conversation) => {
        const name =
          conversation.otherUser?.fullName?.toLowerCase() ??
          conversation.name?.toLowerCase() ??
          "";
        const username = conversation.otherUser?.username?.toLowerCase() ?? "";
        const lastMessagePreview = conversation.lastMessage?.content?.toLowerCase() ?? "";
        return name.includes(query) || username.includes(query) || lastMessagePreview.includes(query);
      });
    }

    if (activeFilter === "unread") {
      rows = rows.filter((conversation) => conversation.unreadCount > 0);
    }
    if (activeFilter === "online") {
      rows = rows.filter((conversation) => conversation.otherUser?.online);
    }
    if (activeFilter === "pinned") {
      rows = rows.filter((conversation) => conversation.isPinned);
    }

    return rows;
  }, [activeFilter, conversations, search]);

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
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold sm:grid-cols-4">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "online", label: "Online" },
              { id: "pinned", label: "Pinned" },
            ] as { id: ConversationFilter; label: string }[]
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`h-9 rounded-full transition ${
                activeFilter === filter.id
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              } active:scale-[0.97]`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gd-scroll-hide flex-1 overflow-y-auto px-3 py-3">
        {!filtered.length && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MessageCircle className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">
              {search.trim() || activeFilter !== "all" ? "No matching conversations" : "No conversations yet"}
            </p>
            <p className="mt-1 text-xs">
              {search.trim() || activeFilter !== "all"
                ? "Try another filter or keyword"
                : "Start chatting from a friend profile"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((conv) => {
            const other = conv.otherUser;
            const isFriendPlaceholder = conv.id.startsWith("friend:");
            const displayName =
              conv.type === "group"
                ? conv.name
                : other?.fullName?.trim() || other?.username?.trim() || "Unknown";
            const avatar = displayName?.slice(0, 2).toUpperCase() ?? "?";
            const avatarUrl = conv.type === "group" ? conv.avatarUrl : other?.avatarUrl;
            const online = other?.online ?? false;
            const lastMsg = conv.lastMessage;
            const isOwnMsg = lastMsg?.senderId === currentUserId;

            let preview = "";
            if (lastMsg) {
              if (lastMsg.messageType === "voice") preview = "Voice message";
              else if (lastMsg.messageType === "image") preview = "Photo";
              else preview = lastMsg.content ?? "";
            }

            const content = (
              <>
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

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {displayName}
                    </span>
                    {conv.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                    {conv.isMuted && <BellOff className="h-3.5 w-3.5 text-slate-400" />}
                    {lastMsg && (
                      <span className="ml-auto flex-shrink-0 text-xs text-slate-400">
                        {timeAgo(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {isFriendPlaceholder
                        ? openingId === conv.id
                          ? "Opening chat..."
                          : "Start conversation"
                        : `${isOwnMsg ? "You: " : ""}${preview || "No messages yet"}`}
                    </p>

                    {conv.unreadCount > 0 && (
                      <span
                        className={`ml-auto flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          conv.isMuted ? "bg-slate-200 text-slate-500" : "bg-emerald-500 text-white"
                        }`}
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </>
            );

            if (isFriendPlaceholder) {
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={async () => {
                    if (!other?.id || !onOpenDirect || openingId) return;
                    setOpeningId(conv.id);
                    const conversationId = await onOpenDirect(other.id);
                    setOpeningId(null);
                    if (conversationId) router.push(`/messages/${conversationId}`);
                  }}
                  disabled={openingId === conv.id}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                >
                  {content}
                </button>
              );
            }

            return (
              <div
                key={conv.id}
                className="flex items-center gap-2 rounded-2xl bg-white px-1 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:bg-slate-900"
              >
                <Link
                  href={`/messages/${conv.id}`}
                  onClick={() => void onMarkRead?.(conv.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                >
                  {content}
                </Link>

                <div className="relative pr-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      if (menu?.conversationId === conv.id) {
                        closeMenu();
                        return;
                      }
                      openMenu(event, conv.id);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label="Conversation actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {menu &&
        createPortal(
          <div className="fixed inset-0 z-[80]">
            <button
              type="button"
              aria-label="Close actions menu"
              onClick={closeMenu}
              className="absolute inset-0"
            />
            {(() => {
              const activeConversation =
                conversations.find((conversation) => conversation.id === menu.conversationId) ?? null;
              if (!activeConversation) return null;

              return (
                <div
                  style={{ top: menu.top, left: menu.left, width: menu.width }}
                  className="absolute rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_32px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900"
                >
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={async () => {
                      if (!onTogglePin) return;
                      setBusyAction(`${activeConversation.id}:pin`);
                      await onTogglePin(activeConversation.id, !activeConversation.isPinned);
                      setBusyAction(null);
                      closeMenu();
                    }}
                    className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {activeConversation.isPinned ? "Unpin conversation" : "Pin conversation"}
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={async () => {
                      if (!onToggleMute) return;
                      setBusyAction(`${activeConversation.id}:mute`);
                      await onToggleMute(activeConversation.id, !activeConversation.isMuted);
                      setBusyAction(null);
                      closeMenu();
                    }}
                    className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {activeConversation.isMuted ? "Unmute conversation" : "Mute conversation"}
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={async () => {
                      setBusyAction(`${activeConversation.id}:read`);
                      await onMarkRead?.(activeConversation.id);
                      setBusyAction(null);
                      closeMenu();
                    }}
                    className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark as read
                  </button>
                </div>
              );
            })()}
          </div>,
          document.body
        )}
    </div>
  );
}
