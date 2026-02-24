"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, ChevronLeft, Loader2, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ReelPlayer } from "@/components/edu/ReelPlayer";
import { trackEduInteraction } from "@/lib/edu/interactions";
import {
  getHomeFeed,
  type HomeFeedReelItem,
} from "@/app/education/actions/get-home-feed";

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type ReelCommentRow = {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ReelCommentItem = {
  id: string;
  reelId: string;
  userId: string;
  body: string;
  createdAt: string;
  author: {
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
};

type ReelItem = {
  id: string;
  authorId: string;
  videoUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: {
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

const mapRankedReel = (item: HomeFeedReelItem): ReelItem => ({
  id: item.id,
  authorId: item.author.id,
  videoUrl: item.reel.videoUrl,
  caption: item.reel.caption,
  likesCount: item.reel.likesCount,
  commentsCount: item.reel.commentsCount,
  createdAt: item.createdAt,
  author: {
    username: item.author.username,
    fullName: item.author.name,
    avatarUrl: item.author.avatarUrl,
  },
});

const touch = "active:scale-[0.90] transition-transform duration-200";
const REELS_PAGE_SIZE = 10;
const COMMENT_LIMIT = 120;

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const formatCommentTime = (iso: string) => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

export function ReelsFeed() {
  const searchParams = useSearchParams();
  const deepLinkedReelId = searchParams.get("reel");
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [burstReelId, setBurstReelId] = useState<string | null>(null);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelCommentItem[]>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [feedSeed, setFeedSeed] = useState<string | undefined>(undefined);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [loadingMoreReels, setLoadingMoreReels] = useState(false);
  const reelViewStartedAtRef = useRef<Record<string, number>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadViewerContext = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const viewerId = userData.user?.id ?? null;
    setCurrentUserId(viewerId);

    if (!viewerId) {
      setViewerProfile(null);
      return null;
    }

    const { data: viewerRow } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", viewerId)
      .maybeSingle();

    setViewerProfile((viewerRow as ProfileRow | null) ?? null);
    return viewerId;
  }, []);

  const fetchReelsPage = useCallback(
    async (options?: { reset?: boolean; forceSeed?: string }) => {
      const reset = Boolean(options?.reset);
      const forceSeed = options?.forceSeed;
      const offset = reset ? 0 : nextOffset;
      if (offset === null && !reset) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMoreReels(true);
      }
      setError(null);

      try {
        const viewerId = await loadViewerContext();
        const ranked = await getHomeFeed({
          limit: REELS_PAGE_SIZE,
          offset: offset ?? 0,
          seed: forceSeed ?? feedSeed,
        });

        const rankedReels = ranked.items
          .filter((item): item is HomeFeedReelItem => item.kind === "reel")
          .map(mapRankedReel);

        const reelIds = rankedReels.map((reel) => reel.id);
        const viewerLikes = new Set<string>();
        if (viewerId && reelIds.length) {
          const { data: likesRows } = await supabase
            .from("edu_reel_likes")
            .select("reel_id")
            .eq("user_id", viewerId)
            .in("reel_id", reelIds);
          for (const row of likesRows ?? []) {
            viewerLikes.add(row.reel_id);
          }
        }

        setLikedIds((prev) => {
          const next = reset ? new Set<string>() : new Set(prev);
          viewerLikes.forEach((id) => next.add(id));
          return next;
        });

        setReels((prev) => {
          if (reset) return rankedReels;
          const byId = new Map(prev.map((item) => [item.id, item]));
          for (const reel of rankedReels) {
            byId.set(reel.id, reel);
          }
          return Array.from(byId.values());
        });

        setFeedSeed(ranked.seed);
        setNextOffset(ranked.nextOffset);
        setHasMoreReels(ranked.hasMore);
      } catch (fetchError: any) {
        setError(fetchError?.message ?? "Could not load reels.");
        if (reset) {
          setReels([]);
          setLikedIds(new Set());
        }
        setHasMoreReels(false);
        setNextOffset(null);
      } finally {
        setLoading(false);
        setLoadingMoreReels(false);
      }
    },
    [feedSeed, loadViewerContext, nextOffset]
  );

  const loadReelComments = useCallback(async (reelId: string) => {
    setLoadingCommentsFor(reelId);

    const { data: rows, error: commentsError } = await supabase
      .from("edu_reel_comments")
      .select("id, reel_id, user_id, body, created_at")
      .eq("reel_id", reelId)
      .order("created_at", { ascending: true })
      .limit(COMMENT_LIMIT);

    if (commentsError) {
      setNotice("Could not load comments.");
      setCommentsByReel((prev) => ({ ...prev, [reelId]: [] }));
      setLoadingCommentsFor(null);
      return;
    }

    const commentRows = (rows ?? []) as ReelCommentRow[];
    const userIds = Array.from(
      new Set(commentRows.map((row) => row.user_id).filter(Boolean))
    );
    let profilesMap = new Map<string, ProfileRow>();

    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      profilesMap = new Map(
        ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
      );
    }

    const mapped: ReelCommentItem[] = commentRows.map((row) => {
      const profile = profilesMap.get(row.user_id);
      const fullName = profile?.full_name?.trim() || "GreenDuty User";
      const username = profile?.username?.trim() || fullName.toLowerCase().replace(/\s+/g, ".");
      return {
        id: row.id,
        reelId: row.reel_id,
        userId: row.user_id,
        body: row.body,
        createdAt: row.created_at,
        author: {
          fullName,
          username,
          avatarUrl: profile?.avatar_url ?? null,
        },
      };
    });

    setCommentsByReel((prev) => ({ ...prev, [reelId]: mapped }));
    setReels((prev) =>
      prev.map((reel) =>
        reel.id === reelId ? { ...reel, commentsCount: mapped.length } : reel
      )
    );
    setLoadingCommentsFor(null);
  }, []);

  const openComments = useCallback(
    (reelId: string) => {
      setActiveCommentsReelId(reelId);
      setCommentDraft("");
      void loadReelComments(reelId);
    },
    [loadReelComments]
  );

  const closeComments = useCallback(() => {
    setActiveCommentsReelId(null);
    setCommentDraft("");
  }, []);

  const submitComment = useCallback(async () => {
    const reelId = activeCommentsReelId;
    const body = commentDraft.trim();
    if (!reelId || !body.length) return;
    if (!currentUserId) {
      setNotice("Sign in to comment on reels.");
      return;
    }

    setSendingComment(true);
    const { data: insertedRow, error: insertError } = await supabase
      .from("edu_reel_comments")
      .insert({
        reel_id: reelId,
        user_id: currentUserId,
        body,
      })
      .select("id, reel_id, user_id, body, created_at")
      .single();

    if (insertError || !insertedRow) {
      setSendingComment(false);
      setNotice(insertError?.message || "Could not post comment.");
      return;
    }

    const authorFullName =
      viewerProfile?.full_name?.trim() ||
      viewerProfile?.username?.trim() ||
      "You";
    const authorUsername =
      viewerProfile?.username?.trim() ||
      authorFullName.toLowerCase().replace(/\s+/g, ".");

    const mapped: ReelCommentItem = {
      id: insertedRow.id,
      reelId: insertedRow.reel_id,
      userId: insertedRow.user_id,
      body: insertedRow.body,
      createdAt: insertedRow.created_at,
      author: {
        fullName: authorFullName,
        username: authorUsername,
        avatarUrl: viewerProfile?.avatar_url ?? null,
      },
    };

    setCommentsByReel((prev) => ({
      ...prev,
      [reelId]: [...(prev[reelId] ?? []), mapped],
    }));
    setReels((prev) =>
      prev.map((reel) =>
        reel.id === reelId
          ? { ...reel, commentsCount: reel.commentsCount + 1 }
          : reel
      )
    );
    setCommentDraft("");
    setSendingComment(false);
    await trackEduInteraction({
      interactionType: "comment",
      reelId,
      metadata: { source: "reels_feed" },
    });
  }, [activeCommentsReelId, commentDraft, currentUserId, viewerProfile]);

  useEffect(() => {
    void fetchReelsPage({ reset: true });
  }, [fetchReelsPage]);

  const loadMoreReels = useCallback(async () => {
    if (!hasMoreReels || loadingMoreReels || nextOffset === null) return;
    await fetchReelsPage({ reset: false });
  }, [fetchReelsPage, hasMoreReels, loadingMoreReels, nextOffset]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMoreReels || loadingMoreReels) return;
    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreReels();
        }
      },
      { root: scrollerRef.current, rootMargin: "220px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreReels, loadMoreReels, loadingMoreReels]);

  const flushReelView = useCallback(
    async (reelId: string, reason: "hidden" | "unmount") => {
      const startedAt = reelViewStartedAtRef.current[reelId];
      if (!startedAt) return;

      delete reelViewStartedAtRef.current[reelId];

      const seconds = (Date.now() - startedAt) / 1000;
      if (!Number.isFinite(seconds) || seconds < 1) return;

      await trackEduInteraction({
        interactionType: "view",
        reelId,
        watchTimeSeconds: Number(seconds.toFixed(2)),
        metadata: { source: "reels_feed", reason },
      });
    },
    []
  );

  const handleReelVisibilityChange = useCallback(
    (reelId: string, visible: boolean) => {
      if (visible) {
        if (!reelViewStartedAtRef.current[reelId]) {
          reelViewStartedAtRef.current[reelId] = Date.now();
        }
        return;
      }

      void flushReelView(reelId, "hidden");
    },
    [flushReelView]
  );

  useEffect(() => {
    const activeReelIds = new Set(reels.map((reel) => reel.id));
    for (const trackedReelId of Object.keys(reelViewStartedAtRef.current)) {
      if (!activeReelIds.has(trackedReelId)) {
        void flushReelView(trackedReelId, "hidden");
      }
    }
  }, [flushReelView, reels]);

  useEffect(() => {
    return () => {
      const trackedReelIds = Object.keys(reelViewStartedAtRef.current);
      for (const trackedReelId of trackedReelIds) {
        void flushReelView(trackedReelId, "unmount");
      }
    };
  }, [flushReelView]);

  useEffect(() => {
    if (!deepLinkedReelId || !scrollerRef.current) return;
    if (!reels.length) return;
    const index = reels.findIndex((reel) => reel.id === deepLinkedReelId);
    if (index < 0) {
      if (hasMoreReels && !loadingMoreReels) {
        void loadMoreReels();
      }
      return;
    }

    const target = scrollerRef.current.querySelector<HTMLElement>(
      `[data-reel-id="${deepLinkedReelId}"]`
    );
    if (target) {
      scrollerRef.current.scrollTo({
        top: target.offsetTop,
        behavior: "smooth",
      });
      return;
    }

    scrollerRef.current.scrollTo({
      top: index * window.innerHeight,
      behavior: "smooth",
    });
  }, [deepLinkedReelId, hasMoreReels, loadMoreReels, loadingMoreReels, reels]);

  const toggleLike = useCallback(
    async (reelId: string) => {
      if (!currentUserId) {
        setNotice("Sign in to like reels.");
        return;
      }

      const isLiked = likedIds.has(reelId);

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(reelId);
        else next.add(reelId);
        return next;
      });
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === reelId
            ? {
                ...reel,
                likesCount: Math.max(0, reel.likesCount + (isLiked ? -1 : 1)),
              }
            : reel
        )
      );

      const request = isLiked
        ? supabase
            .from("edu_reel_likes")
            .delete()
            .eq("reel_id", reelId)
            .eq("user_id", currentUserId)
        : supabase
            .from("edu_reel_likes")
            .insert({ reel_id: reelId, user_id: currentUserId });

      const { error: likeError } = await request;
      if (likeError) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(reelId);
          else next.delete(reelId);
          return next;
        });
        setReels((prev) =>
          prev.map((reel) =>
            reel.id === reelId
              ? {
                  ...reel,
                  likesCount: Math.max(0, reel.likesCount + (isLiked ? 1 : -1)),
                }
              : reel
          )
        );
      }
    },
    [currentUserId, likedIds]
  );

  const handleShare = useCallback(async (reelId: string) => {
    const trackShare = async (method: "native" | "clipboard" | "prompt") => {
      await trackEduInteraction({
        interactionType: "share",
        reelId,
        metadata: { source: "reels_feed", method },
      });
    };

    const url = `${window.location.origin}/education/reels?reel=${reelId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "GreenDuty Reel", url });
        await trackShare("native");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        await trackShare("clipboard");
        setNotice("Reel link copied.");
        return;
      }
      await trackShare("prompt");
      window.prompt("Copy reel link:", url);
    } catch {
      await trackShare("prompt");
      window.prompt("Copy reel link:", url);
    }
  }, []);

  const pulseReelAction = useCallback((action: "like" | "comment" | "share", reelId: string) => {
    const key = `${action}:${reelId}`;
    setActiveActionKey(key);
    window.setTimeout(() => {
      setActiveActionKey((current) => (current === key ? null : current));
    }, 260);
  }, []);

  const triggerReelBurst = useCallback((reelId: string) => {
    setBurstReelId(reelId);
    window.setTimeout(() => {
      setBurstReelId((current) => (current === reelId ? null : current));
    }, 620);
  }, []);

  const feedBody = useMemo(() => {
    if (loading) {
      return (
        <div className="grid h-[100dvh] place-items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reels...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="grid h-[100dvh] place-items-center px-4">
          <div className="rounded-[2rem] bg-white/10 p-6 text-center text-white backdrop-blur">
            <p className="text-sm font-semibold">Could not load reels.</p>
            <p className="mt-1 text-xs text-white/80">{error}</p>
            <button
              type="button"
              onClick={() => {
                void fetchReelsPage({ reset: true });
              }}
              className={`mt-4 inline-flex h-12 items-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white ${touch}`}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!reels.length) {
      return (
        <div className="grid h-[100dvh] place-items-center px-4">
          <div className="rounded-[2rem] bg-white/10 p-6 text-center text-white backdrop-blur">
            <p className="text-base font-semibold">No reels yet</p>
            <p className="mt-1 text-sm text-white/80">
              Upload the first eco learning reel in GreenDuty.
            </p>
          </div>
        </div>
      );
    }

    const reelSections = reels.map((reel) => {
      const isLiked = likedIds.has(reel.id);
      return (
        <section
          key={reel.id}
          data-reel-id={reel.id}
          className="relative h-[100dvh] w-full snap-start overflow-hidden"
        >
          <ReelPlayer
            src={reel.videoUrl}
            onVisibilityChange={(visible) => {
              handleReelVisibilityChange(reel.id, visible);
            }}
            onDoubleTap={() => {
              pulseReelAction("like", reel.id);
              triggerReelBurst(reel.id);
              if (!isLiked) {
                void toggleLike(reel.id);
              }
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-64 bg-gradient-to-t from-black/60 to-transparent" />

            {burstReelId === reel.id && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                <div className="relative grid h-32 w-32 place-items-center">
                  <span className="absolute h-28 w-28 rounded-full bg-rose-500/45 blur-3xl animate-ping" />
                  <span className="absolute h-24 w-24 rounded-full bg-rose-400/40 blur-2xl" />
                  <Heart className="relative h-24 w-24 fill-current text-rose-500 [stroke-width:0] drop-shadow-[0_16px_28px_rgba(244,63,94,0.55)] animate-[bounce_0.55s_ease-out_1]" />
                </div>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] text-white sm:px-6">
              <div className="max-w-[75%]">
                <Link
                  href={`/profile/${reel.authorId}`}
                  data-reel-control="true"
                  className={`inline-flex items-center gap-3 ${touch}`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-500/80 text-sm font-semibold">
                    {reel.author.avatarUrl ? (
                      <img
                        src={reel.author.avatarUrl}
                        alt={reel.author.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      reel.author.fullName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="text-sm font-semibold">@{reel.author.username}</span>
                </Link>
                <p className="mt-2 text-sm leading-relaxed text-white/95">{reel.caption}</p>
              </div>

              <div className="mb-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  data-reel-control="true"
                  onClick={() => {
                    pulseReelAction("like", reel.id);
                    void toggleLike(reel.id);
                  }}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-all duration-300 ${touch} ${
                    isLiked ? "text-emerald-500" : ""
                  } ${
                    activeActionKey === `like:${reel.id}`
                      ? "scale-110 -translate-y-1 bg-emerald-500/20 shadow-[0_10px_22px_-10px_rgba(16,185,129,0.7)]"
                      : ""
                  }`}
                  aria-label={isLiked ? "Unlike reel" : "Like reel"}
                >
                  <Heart className={`h-6 w-6 ${isLiked ? "fill-current" : ""}`} />
                </button>
                <span className="text-xs font-semibold text-white/90">{formatCount(reel.likesCount)}</span>

                <button
                  type="button"
                  data-reel-control="true"
                  onClick={() => {
                    pulseReelAction("comment", reel.id);
                    openComments(reel.id);
                  }}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-all duration-300 ${touch} ${
                    activeActionKey === `comment:${reel.id}`
                      ? "scale-110 -translate-y-1 bg-emerald-500/20 shadow-[0_10px_22px_-10px_rgba(16,185,129,0.7)]"
                      : ""
                  }`}
                  aria-label="Open comments"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
                <span className="text-xs font-semibold text-white/90">{formatCount(reel.commentsCount)}</span>

                <button
                  type="button"
                  data-reel-control="true"
                  onClick={() => {
                    pulseReelAction("share", reel.id);
                    void handleShare(reel.id);
                  }}
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-all duration-300 ${touch} ${
                    activeActionKey === `share:${reel.id}`
                      ? "scale-110 -translate-y-1 bg-sky-500/20 shadow-[0_10px_22px_-10px_rgba(14,165,233,0.7)]"
                      : ""
                  }`}
                  aria-label="Share reel"
                >
                  <Share2 className="h-6 w-6" />
                </button>
              </div>
            </div>
          </ReelPlayer>
        </section>
      );
    });

    return (
      <>
        {reelSections}
        <div ref={loadMoreRef} className="relative h-24 w-full">
          {loadingMoreReels && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading more reels...
              </div>
            </div>
          )}
        </div>
      </>
    );
  }, [
    activeActionKey,
    burstReelId,
    error,
    fetchReelsPage,
    handleShare,
    handleReelVisibilityChange,
    hasMoreReels,
    openComments,
    likedIds,
    loading,
    loadingMoreReels,
    pulseReelAction,
    reels,
    toggleLike,
    triggerReelBurst,
  ]);

  const activeCommentsReel = useMemo(
    () =>
      activeCommentsReelId
        ? reels.find((reel) => reel.id === activeCommentsReelId) ?? null
        : null,
    [activeCommentsReelId, reels]
  );

  const activeComments = useMemo(
    () => (activeCommentsReelId ? commentsByReel[activeCommentsReelId] ?? [] : []),
    [activeCommentsReelId, commentsByReel]
  );

  useEffect(() => {
    if (!activeCommentsReelId) return;

    const channel = supabase
      .channel(`edu-reel-comments:${activeCommentsReelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_reel_comments",
          filter: `reel_id=eq.${activeCommentsReelId}`,
        },
        () => {
          void loadReelComments(activeCommentsReelId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCommentsReelId, loadReelComments]);

  return (
    <div className="gd-edu gd-edu-reels relative h-[100dvh] w-full bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] sm:px-6">
        <div className="pointer-events-auto flex items-center justify-between">
          <Link
            href="/education"
            data-reel-control="true"
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur ${touch}`}
            aria-label="Back to education feed"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-full bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
            Reels
          </div>
          <span className="inline-flex h-12 w-12" aria-hidden />
        </div>
      </div>

      {notice && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-40 flex justify-center px-4">
          <div className="rounded-full bg-black/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
            {notice}
          </div>
        </div>
      )}

      {activeCommentsReel && (
        <div
          className="absolute inset-0 z-50 flex items-end bg-black/45 p-2 sm:p-4"
          onClick={closeComments}
        >
          <div
            className="mx-auto flex max-h-[78dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white text-slate-900 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.45)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Reel comments</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  @{activeCommentsReel.author.username} - {formatCount(activeCommentsReel.commentsCount)} comments
                </p>
              </div>
              <button
                type="button"
                onClick={closeComments}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 ${touch}`}
                aria-label="Close comments"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {loadingCommentsFor === activeCommentsReel.id ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : activeComments.length ? (
                activeComments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                      {comment.author.avatarUrl ? (
                        <img
                          src={comment.author.avatarUrl}
                          alt={comment.author.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        comment.author.fullName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 rounded-2xl bg-slate-100 px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-slate-900">
                        {comment.author.fullName}
                        <span className="ml-1.5 font-medium text-slate-500">
                          @{comment.author.username}
                        </span>
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{comment.body}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatCommentTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  Be the first to comment on this reel.
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 p-3 sm:p-4">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5 pl-3">
                <input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitComment();
                    }
                  }}
                  className="h-10 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Write a comment..."
                />
                <button
                  type="button"
                  disabled={sendingComment || !commentDraft.trim().length}
                  onClick={() => {
                    void submitComment();
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white disabled:opacity-60 ${touch}`}
                  aria-label="Send comment"
                >
                  {sendingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      >
        {feedBody}
      </div>
    </div>
  );
}
