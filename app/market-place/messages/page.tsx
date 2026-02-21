"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Package2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { useMarketplaceConversations } from "@/lib/marketplace/messages/useMarketplaceConversations";

const cardBase =
  "rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const previewText = (message: {
  content: string | null;
  messageType: string;
  mediaUrl?: string | null;
} | null) => {
  if (!message) return "No messages yet.";
  if (message.messageType === "image") return "Photo shared";
  if (message.messageType === "voice") return "Voice message";
  return message.content?.trim() || "Message";
};

const avatarInitials = (name?: string | null) => {
  if (!name) return "MP";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "MP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

type RecentPartner = {
  id: string;
  name: string;
  avatarUrl: string | null;
  roleLabel: "Seller" | "Buyer";
  lastOrderAt: string;
  itemTitle: string | null;
};

const resolvePartnerName = (profile: {
  store_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null) => {
  if (!profile) return "Marketplace User";
  if (profile.store_name && profile.store_name.trim().length > 0) {
    return profile.store_name;
  }
  if (profile.username && profile.username.trim().length > 0) {
    return profile.username;
  }
  if (profile.email && profile.email.includes("@")) {
    return profile.email.split("@")[0];
  }
  return "Marketplace User";
};

export default function MarketplaceMessagesPage() {
  const router = useRouter();
  const { user, profile, supabase, loading: authLoading } = useMarketplaceAuth();
  const { conversations, loading, error, fetchConversations, findOrCreateDM } =
    useMarketplaceConversations();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [recentPartners, setRecentPartners] = useState<RecentPartner[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [openingPartnerId, setOpeningPartnerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const resolveAvatarUrl = useCallback(
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
    if (!supabase || !user?.id) {
      setRecentPartners([]);
      return;
    }

    let active = true;
    const fetchRecentPartners = async () => {
      setRecentLoading(true);
      try {
        if (profile?.role === "seller") {
          const { data, error } = await supabase
            .from("marketplace_orders")
            .select(
              `
              id,
              created_at,
              buyer_id,
              marketplace_profiles:buyer_id (
                id,
                email,
                username,
                store_name,
                avatar_url
              ),
              marketplace_items:item_id (
                id,
                seller_id,
                title
              )
            `
            )
            .eq("marketplace_items.seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(40);
          if (error) {
            throw new Error(error.message || "Unable to load recent buyer contacts.");
          }

          if (!active) return;

          const partnerMap = new Map<string, RecentPartner>();
          for (const row of (data ?? []) as any[]) {
            const buyerProfile = first(row.marketplace_profiles ?? null) as
              | {
                  id: string;
                  email?: string | null;
                  username?: string | null;
                  store_name?: string | null;
                  avatar_url?: string | null;
                }
              | null;
            if (!buyerProfile?.id || partnerMap.has(buyerProfile.id)) continue;
            partnerMap.set(buyerProfile.id, {
              id: buyerProfile.id,
              name: resolvePartnerName(buyerProfile),
              avatarUrl: resolveAvatarUrl(buyerProfile.avatar_url),
              roleLabel: "Buyer",
              lastOrderAt: row.created_at,
              itemTitle: first(row.marketplace_items ?? null)?.title ?? null,
            });
          }
          setRecentPartners(Array.from(partnerMap.values()).slice(0, 8));
        } else {
          const { data, error } = await supabase
            .from("marketplace_orders")
            .select(
              `
              id,
              created_at,
              marketplace_items:item_id (
                id,
                title,
                seller_id,
                marketplace_profiles:seller_id (
                  id,
                  email,
                  username,
                  store_name,
                  avatar_url
                )
              )
            `
            )
            .eq("buyer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(40);
          if (error) {
            throw new Error(error.message || "Unable to load recent seller contacts.");
          }

          if (!active) return;

          const partnerMap = new Map<string, RecentPartner>();
          for (const row of (data ?? []) as any[]) {
            const item = first(row.marketplace_items ?? null) as
              | {
                  title?: string | null;
                  marketplace_profiles?:
                    | {
                        id: string;
                        email?: string | null;
                        username?: string | null;
                        store_name?: string | null;
                        avatar_url?: string | null;
                      }
                    | Array<{
                        id: string;
                        email?: string | null;
                        username?: string | null;
                        store_name?: string | null;
                        avatar_url?: string | null;
                      }>
                    | null;
                }
              | null;
            const sellerProfile = first(item?.marketplace_profiles ?? null) as
              | {
                  id: string;
                  email?: string | null;
                  username?: string | null;
                  store_name?: string | null;
                  avatar_url?: string | null;
                }
              | null;
            if (!sellerProfile?.id || partnerMap.has(sellerProfile.id)) continue;
            partnerMap.set(sellerProfile.id, {
              id: sellerProfile.id,
              name: resolvePartnerName(sellerProfile),
              avatarUrl: resolveAvatarUrl(sellerProfile.avatar_url),
              roleLabel: "Seller",
              lastOrderAt: row.created_at,
              itemTitle: item?.title ?? null,
            });
          }
          setRecentPartners(Array.from(partnerMap.values()).slice(0, 8));
        }
      } catch (fetchError) {
        if (!active) return;
        setRecentPartners([]);
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load recent contacts.";
        setToast(message);
      } finally {
        if (active) {
          setRecentLoading(false);
        }
      }
    };

    fetchRecentPartners();
    return () => {
      active = false;
    };
  }, [profile?.role, resolveAvatarUrl, supabase, user?.id]);

  const handleOpenPartnerChat = useCallback(
    async (partner: RecentPartner) => {
      if (openingPartnerId) return;
      setOpeningPartnerId(partner.id);
      const result = await findOrCreateDM(partner.id);
      setOpeningPartnerId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      if (!result.conversationId) {
        setToast("Unable to open this conversation.");
        return;
      }
      router.push(`/market-place/messages/${result.conversationId}`);
    },
    [findOrCreateDM, openingPartnerId, router]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (activeFilter === "unread" && conversation.unreadCount <= 0) {
        return false;
      }
      if (!normalizedQuery) return true;
      const peerName = conversation.otherUser?.name?.toLowerCase() ?? "";
      const pinnedName = conversation.pinnedProduct?.title?.toLowerCase() ?? "";
      const lastPreview = previewText(conversation.lastMessage).toLowerCase();
      return (
        peerName.includes(normalizedQuery) ||
        pinnedName.includes(normalizedQuery) ||
        lastPreview.includes(normalizedQuery)
      );
    });
  }, [activeFilter, conversations, query]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations]
  );

  if (authLoading) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#05221b] text-white">
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className={`${cardBase} p-8 text-center text-sm text-white/60`}>
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
          <div className={`${cardBase} p-8 text-center text-sm text-white/60`}>
            Please sign in to access marketplace messages.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#05221b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(6,182,212,0.14),_transparent_52%)]" />

      <div className="gd-mp-container relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <section className={`${cardBase} overflow-hidden`}>
            <div className="border-b border-white/10 bg-gradient-to-r from-emerald-400/18 via-emerald-300/8 to-cyan-300/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-100/80">
                    Marketplace Chat
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    Buyer and seller inbox
                  </h1>
                  <p className="mt-2 text-sm text-emerald-50/75">
                    Real-time private conversations for questions, payment, and delivery updates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/market-place"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-100/70 hover:bg-emerald-200/25"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Marketplace
                  </Link>
                  <button
                    type="button"
                    onClick={fetchConversations}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-emerald-200/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-white/80">
                  {conversations.length} active chats
                </span>
                <span className="rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1.5 font-semibold text-emerald-100">
                  {unreadTotal} unread
                </span>
                <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-white/70">
                  Role: {profile?.role === "seller" ? "Seller" : "Buyer"}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by seller, buyer, or product..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/45 focus:border-emerald-200/40 focus:outline-none"
                  />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "all"
                        ? "bg-emerald-300 text-emerald-950"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("unread")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === "unread"
                        ? "bg-emerald-300 text-emerald-950"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Unread
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3 text-xs text-amber-100">
                  {error}
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-emerald-200/20 bg-gradient-to-r from-emerald-300/16 to-cyan-300/8 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/85">
                  Recent {profile?.role === "seller" ? "buyers" : "sellers"}
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {recentLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={`recent-partner-skeleton-${index}`}
                          className="h-28 min-w-[210px] animate-pulse rounded-2xl border border-white/10 bg-white/5"
                        />
                      ))
                    : recentPartners.map((partner) => (
                        <button
                          key={partner.id}
                          type="button"
                          onClick={() => handleOpenPartnerChat(partner)}
                          disabled={openingPartnerId === partner.id}
                          className="min-w-[230px] rounded-2xl border border-white/10 bg-white/6 p-3 text-left transition hover:border-emerald-200/40 hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-emerald-300/18 text-[11px] font-semibold uppercase text-emerald-100">
                              {partner.avatarUrl ? (
                                <img
                                  src={partner.avatarUrl}
                                  alt={partner.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                avatarInitials(partner.name)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-white">
                                {partner.name}
                              </div>
                              <div className="text-[11px] text-white/60">
                                {partner.roleLabel} - {formatTimeAgo(partner.lastOrderAt)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 truncate text-xs text-emerald-100/80">
                            {partner.itemTitle ? `Last item: ${partner.itemTitle}` : "Open chat"}
                          </div>
                          {openingPartnerId === partner.id && (
                            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-100/80">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Opening...
                            </div>
                          )}
                        </button>
                      ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`marketplace-chat-skeleton-${index}`}
                      className="h-20 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
                    />
                  ))
                ) : filteredConversations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
                    {query.trim().length > 0
                      ? "No conversations match your search."
                      : recentPartners.length > 0
                      ? "Start a chat from your recent buyers or sellers above."
                      : "No marketplace chats yet. Use Message Seller or Message Buyer from listings and orders."}
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/market-place/messages/${conversation.id}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/6 to-white/[0.03] px-4 py-3 transition hover:border-emerald-300/45 hover:from-emerald-200/10 hover:to-cyan-200/8"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-emerald-300/18 text-xs font-semibold uppercase text-emerald-100">
                            {conversation.otherUser?.avatarUrl ? (
                              <img
                                src={conversation.otherUser.avatarUrl}
                                alt={conversation.otherUser.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              avatarInitials(conversation.otherUser?.name)
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#05221b] bg-emerald-300/90" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white transition group-hover:text-emerald-100">
                            {conversation.otherUser?.name ?? "Marketplace Chat"}
                          </div>
                          <div className="truncate text-xs text-white/65">
                            {previewText(conversation.lastMessage)}
                          </div>
                          {conversation.pinnedProduct && (
                            <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200/25 bg-emerald-200/12 px-2 py-0.5 text-[10px] text-emerald-100/90">
                              <Package2 className="h-3 w-3" />
                              <span className="truncate">
                                {conversation.pinnedProduct.title ?? "Pinned product"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3 text-xs text-white/55">
                        {conversation.lastMessage?.createdAt && (
                          <span>{formatTimeAgo(conversation.lastMessage.createdAt)}</span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-300 px-1 text-[10px] font-semibold text-emerald-950">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-white/50" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className={`${cardBase} p-6`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
              <MessageCircle className="h-4 w-4" />
              Chat Notes
            </div>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                Marketplace conversations are fully separated from EDU chat.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                Open any thread to view the pinned product context and continue conversation in real time.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                Realtime status and message delivery indicators are visible in each chat room.
              </div>
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
