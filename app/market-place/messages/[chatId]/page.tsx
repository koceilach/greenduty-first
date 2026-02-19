"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ImagePlus,
  Loader2,
  Package2,
  RefreshCw,
  Send,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { useMarketplaceChat } from "@/lib/marketplace/messages/useMarketplaceChat";

type OtherParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

const quickReplies = [
  "Is this product still available?",
  "Can you confirm delivery timing?",
  "Please share more product details.",
  "I uploaded my receipt, please check.",
] as const;

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const resolveName = (row: {
  email?: string | null;
  store_name?: string | null;
  username?: string | null;
}) => {
  if (row.store_name && row.store_name.trim().length > 0) {
    return row.store_name;
  }
  if (row.username && row.username.trim().length > 0) {
    return row.username;
  }
  if (row.email && row.email.includes("@")) {
    return row.email.split("@")[0];
  }
  return "Marketplace User";
};

const formatMessageTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatMessageDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const avatarInitials = (name?: string | null) => {
  if (!name) return "MP";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "MP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function MarketplaceChatRoomPage() {
  const params = useParams<{ chatId: string | string[] }>();
  const chatId = useMemo(() => {
    const raw = params?.chatId;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const { user, supabase, loading: authLoading } = useMarketplaceAuth();
  const {
    messages,
    loading,
    sending,
    error: chatError,
    connectionState,
    currentUserId,
    otherUser,
    conversation,
    markAsRead,
    sendMessage,
    refresh,
  } = useMarketplaceChat(chatId);

  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const resolvePublicUrl = useCallback(
    (rawUrl?: string | null) => {
      if (!rawUrl) return null;
      if (rawUrl.startsWith("http")) return rawUrl;
      if (!supabase) return rawUrl;
      const { data } = supabase.storage.from("avatars").getPublicUrl(rawUrl);
      return data?.publicUrl ?? rawUrl;
    },
    [supabase]
  );

  useEffect(() => {
    if (!chatId || !user || !supabase) return;
    let active = true;

    const loadParticipant = async () => {
      const { data, error } = await supabase
        .from("marketplace_conversation_participants")
        .select(
          `
          user_id,
          marketplace_profiles:user_id (
            id,
            email,
            username,
            store_name,
            avatar_url
          )
        `
        )
        .eq("conversation_id", chatId)
        .neq("user_id", user.id)
        .limit(1);

      if (error || !active) return;

      const participant = (data ?? [])[0] as
        | {
            user_id: string;
            marketplace_profiles?:
              | {
                  id: string;
                  email: string | null;
                  username: string | null;
                  store_name: string | null;
                  avatar_url: string | null;
                }
              | Array<{
                  id: string;
                  email: string | null;
                  username: string | null;
                  store_name: string | null;
                  avatar_url: string | null;
                }>
              | null;
          }
        | undefined;
      if (!participant) return;

      const profile = first(participant.marketplace_profiles ?? null);
      if (!profile) return;

      setOtherParticipant({
        id: profile.id,
        name: resolveName(profile),
        avatarUrl: resolvePublicUrl(profile.avatar_url),
      });
    };

    loadParticipant();
    return () => {
      active = false;
    };
  }, [chatId, user, supabase, resolvePublicUrl]);

  useEffect(() => {
    markAsRead();
  }, [markAsRead, messages.length]);

  useEffect(() => {
    if (chatError) {
      setToast(chatError);
    }
  }, [chatError]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
  }, [draft]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const node = scrollContainerRef.current;
    const offset = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsNearBottom(offset < 90);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (isNearBottom) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, isNearBottom]);

  const jumpToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setIsNearBottom(true);
  }, []);

  const handleSendText = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    const result = await sendMessage(text);
    if (result.error) {
      setToast(result.error);
      return;
    }
    setDraft("");
  }, [draft, sendMessage]);

  const handleRetryMessage = useCallback(
    async (message: {
      id: string;
      content: string | null;
      messageType: "text" | "voice" | "image" | "system";
      mediaUrl: string | null;
      mediaDuration: number | null;
    }) => {
      if (message.messageType === "voice") return;
      const result = await sendMessage(message.content ?? "", {
        messageType:
          message.messageType === "image" || message.messageType === "system"
            ? message.messageType
            : "text",
        mediaUrl: message.mediaUrl,
        mediaDuration: message.mediaDuration,
      });
      if (result.error) {
        setToast(result.error);
        return;
      }
      await refresh();
    },
    [sendMessage, refresh]
  );

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!user || !supabase) {
        setToast("Please sign in to upload an image.");
        return;
      }

      setUploadingImage(true);
      try {
        const extension = file.name.split(".").pop() ?? "jpg";
        const filePath = `marketplace-chat/${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          setToast("Unable to upload image.");
          return;
        }

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const result = await sendMessage(file.name, {
          messageType: "image",
          mediaUrl: urlData?.publicUrl ?? filePath,
        });
        if (result.error) {
          setToast(result.error);
        }
      } finally {
        setUploadingImage(false);
      }
    },
    [user, supabase, sendMessage]
  );

  const peer = useMemo(() => {
    if (otherParticipant) return otherParticipant;
    if (!otherUser) return null;
    return {
      id: otherUser.id,
      name: otherUser.name,
      avatarUrl: otherUser.avatarUrl,
    } satisfies OtherParticipant;
  }, [otherParticipant, otherUser]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ day: string; items: typeof messages }> = [];
    for (const message of messages) {
      const day = formatMessageDay(message.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.items.push(message);
      } else {
        groups.push({ day, items: [message] });
      }
    }
    return groups;
  }, [messages]);

  if (authLoading) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#05221b] text-white">
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Loading your account...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#05221b] text-white">
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Please sign in to open marketplace chat.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#05221b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_transparent_46%),radial-gradient(circle_at_bottom,_rgba(6,182,212,0.14),_transparent_50%)]" />

      <div className="gd-mp-container relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex min-h-[78vh] min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <header className="border-b border-white/10 bg-gradient-to-r from-emerald-300/16 via-emerald-200/8 to-cyan-200/8 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    href="/market-place/messages"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-emerald-300/18 text-xs font-semibold uppercase text-emerald-100">
                      {peer?.avatarUrl ? (
                        <img
                          src={peer.avatarUrl}
                          alt={peer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        avatarInitials(peer?.name)
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#05221b] bg-emerald-300/90" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-100/75">
                      Marketplace Chat
                    </div>
                    <h1 className="truncate text-lg font-semibold sm:text-xl">
                      {peer?.name ?? "Conversation"}
                    </h1>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-white/65">
                      {connectionState === "connected" ? (
                        <>
                          <Wifi className="h-3.5 w-3.5 text-emerald-200" />
                          Live
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3.5 w-3.5 text-amber-200" />
                          Reconnecting
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/market-place"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-100/70 hover:bg-emerald-200/25"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Marketplace
                  </Link>
                  {peer?.id && (
                    <Link
                      href={`/market-place/profile/${peer.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70"
                    >
                      <User className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-emerald-200/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
              </div>
            </header>

            {conversation?.pinnedProduct && (
              <div className="border-b border-white/10 px-4 py-3">
                <Link
                  href={`/market-place/product/${conversation.pinnedProduct.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-emerald-200/30 bg-emerald-200/10 p-3 transition hover:border-emerald-200/60 hover:bg-emerald-200/15"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10">
                    {conversation.pinnedProduct.imageUrl ? (
                      <img
                        src={conversation.pinnedProduct.imageUrl}
                        alt={conversation.pinnedProduct.title ?? "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package2 className="h-5 w-5 text-emerald-100/80" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
                      Pinned Product
                    </div>
                    <div className="truncate text-sm font-semibold text-white group-hover:text-emerald-100">
                      {conversation.pinnedProduct.title ?? "Marketplace Product"}
                    </div>
                    <div className="text-xs text-emerald-100/80">
                      {typeof conversation.pinnedProduct.priceDzd === "number"
                        ? `${conversation.pinnedProduct.priceDzd.toLocaleString()} DZD`
                        : "Price on request"}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <div className="relative flex-1 overflow-hidden">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="h-full space-y-3 overflow-y-auto bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:26px_26px] px-4 py-4"
              >
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`marketplace-chat-msg-skeleton-${index}`}
                        className="h-12 rounded-2xl bg-white/10 animate-pulse"
                      />
                    ))}
                  </div>
                ) : groupedMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/60">
                    No messages yet. Start the conversation.
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.day} className="space-y-3">
                      <div className="flex justify-center">
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                          {group.day}
                        </span>
                      </div>
                      {group.items.map((message) => {
                        const isOwn = message.senderId === currentUserId;
                        const hasImage = message.messageType === "image" && message.mediaUrl;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex max-w-[90%] items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                            >
                              {!isOwn && (
                                <div className="mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold uppercase text-emerald-100">
                                  {peer?.avatarUrl ? (
                                    <img
                                      src={peer.avatarUrl}
                                      alt={peer.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    avatarInitials(peer?.name)
                                  )}
                                </div>
                              )}

                              <div
                                className={`rounded-2xl px-4 py-3 text-sm shadow-[0_10px_20px_rgba(0,0,0,0.22)] ${
                                  isOwn
                                    ? "rounded-br-md bg-gradient-to-r from-emerald-300 to-teal-300 text-emerald-950"
                                    : "rounded-bl-md border border-white/12 bg-white/12 text-white"
                                }`}
                              >
                                {!isOwn && (
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100/80">
                                    {peer?.name ?? message.sender?.name ?? "Seller/Buyer"}
                                  </div>
                                )}
                                {hasImage && (
                                  <a
                                    href={message.mediaUrl ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={message.mediaUrl ?? ""}
                                      alt={message.content ?? "Shared image"}
                                      className="mb-2 max-h-64 w-full max-w-xs rounded-xl object-cover"
                                    />
                                  </a>
                                )}
                                {message.content && <div>{message.content}</div>}
                                <div
                                  className={`mt-1 flex items-center gap-2 text-[10px] ${
                                    isOwn ? "text-emerald-900/70" : "text-white/60"
                                  }`}
                                >
                                  <span>{formatMessageTime(message.createdAt)}</span>
                                  {isOwn && message.status === "sending" && (
                                    <span className="inline-flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      sending
                                    </span>
                                  )}
                                  {isOwn && message.status === "error" && (
                                    <button
                                      type="button"
                                      onClick={() => handleRetryMessage(message)}
                                      className="text-red-200 underline underline-offset-2 hover:text-red-100"
                                    >
                                      not sent - retry
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={scrollRef} />
              </div>

              {!isNearBottom && (
                <button
                  type="button"
                  onClick={jumpToBottom}
                  className="absolute bottom-5 right-5 inline-flex items-center gap-1 rounded-full border border-emerald-200/30 bg-emerald-200/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition hover:border-emerald-100/60"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Latest
                </button>
              )}
            </div>

            <div className="border-t border-white/10 bg-black/12 p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setDraft(reply)}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/70 transition hover:border-emerald-200/40 hover:text-white"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/80 transition hover:border-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </button>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendText();
                    }
                  }}
                  rows={1}
                  placeholder="Write a message..."
                  className="max-h-36 min-h-[46px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-emerald-300/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={sending || draft.trim().length === 0}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-emerald-200"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </section>

          <aside className="hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">
                Contact
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-emerald-300/18 text-xs font-semibold uppercase text-emerald-100">
                  {peer?.avatarUrl ? (
                    <img
                      src={peer.avatarUrl}
                      alt={peer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    avatarInitials(peer?.name)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {peer?.name ?? "Marketplace user"}
                  </div>
                  <div className="text-xs text-white/60">
                    {connectionState === "connected" ? "Available" : "Reconnecting"}
                  </div>
                </div>
              </div>
              {peer?.id && (
                <Link
                  href={`/market-place/profile/${peer.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/40 bg-emerald-200/12 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70"
                >
                  <User className="h-3.5 w-3.5" />
                  View profile
                </Link>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">
                Workflow
              </div>
              <p className="mt-2">
                Keep all product clarifications, receipt updates, and delivery confirmations inside this chat for clear history.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-emerald-950/88 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
