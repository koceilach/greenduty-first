"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  CheckCircle2,
  EyeOff,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { SocialFeedItem } from "@/lib/edu/social-engine-types";

type PostCardProps = {
  item: SocialFeedItem;
  currentUserId: string | null;
  isFollowing: boolean;
  followBusy: boolean;
  likeBusy: boolean;
  deleteBusy: boolean;
  onToggleFollow: (targetUserId: string) => void;
  onToggleLike: (item: SocialFeedItem) => void;
  onHide: (item: SocialFeedItem) => void;
  onReport: (item: SocialFeedItem) => void;
  onDelete: (item: SocialFeedItem) => void;
};

const touchClass =
  "transition-all duration-300 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function PostCard({
  item,
  currentUserId,
  isFollowing,
  followBusy,
  likeBusy,
  deleteBusy,
  onToggleFollow,
  onToggleLike,
  onHide,
  onReport,
  onDelete,
}: PostCardProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const reelClickTimerRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = Boolean(currentUserId && currentUserId === item.userId);
  const showFollow = Boolean(currentUserId) && !isOwner && !isFollowing;
  const isReel = item.kind === "reel";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (reelClickTimerRef.current) {
        window.clearTimeout(reelClickTimerRef.current);
      }
    };
  }, []);

  const isReelControlTarget = (event: MouseEvent<HTMLElement>) =>
    Boolean((event.target as HTMLElement | null)?.closest('[data-reel-control="true"]'));

  const openReel = () => {
    router.push(`/education/reels?reel=${item.id}`);
  };

  const handleReelContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isReel || isReelControlTarget(event)) return;

    if (reelClickTimerRef.current) {
      window.clearTimeout(reelClickTimerRef.current);
    }

    reelClickTimerRef.current = window.setTimeout(() => {
      openReel();
      reelClickTimerRef.current = null;
    }, 180);
  };

  const handleReelContainerDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isReel || isReelControlTarget(event)) return;

    if (reelClickTimerRef.current) {
      window.clearTimeout(reelClickTimerRef.current);
      reelClickTimerRef.current = null;
    }

    onToggleLike(item);
  };

  const handleCommentClick = () => {
    if (isReel) {
      router.push(`/education/reels?reel=${item.id}&comments=1`);
      return;
    }
    router.push(`/education/post/${item.id}`);
  };

  const handleShareClick = () => {
    if (!isReel) return;
    const url = `${window.location.origin}/education/reels?reel=${item.id}`;

    if (navigator.share) {
      void navigator
        .share({
          title: `${item.author.name} reel`,
          url,
        })
        .catch(() => {});
      return;
    }

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url);
    }
  };

  if (isReel) {
    return (
      <article className="overflow-hidden rounded-3xl border border-slate-200/60 bg-black shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)]">
        <div className="mx-auto w-full max-w-[520px]">
          <div
            className="relative aspect-[9/16] w-full cursor-pointer bg-black"
            onClick={handleReelContainerClick}
            onDoubleClick={handleReelContainerDoubleClick}
          >
            <video
              src={item.reel.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              preload="metadata"
              muted
              loop
              playsInline
              autoPlay
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/5 to-black/75" />

            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {item.author.avatarUrl ? (
                      <img
                        src={item.author.avatarUrl}
                        alt={item.author.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      item.author.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 text-white">
                    <p className="truncate text-sm font-semibold">
                      {item.author.name}
                      {item.author.verified && (
                        <CheckCircle2 className="ml-1 inline h-4 w-4 text-emerald-300" />
                      )}
                    </p>
                    <p className="truncate text-xs text-white/80">
                      @{item.author.username} - Original audio
                    </p>
                  </div>
                </div>
              </div>

              <div
                ref={menuRef}
                data-reel-control="true"
                className="relative flex shrink-0 items-center gap-2"
              >
                {showFollow && (
                  <button
                    type="button"
                    data-reel-control="true"
                    disabled={followBusy}
                    onClick={() => onToggleFollow(item.userId)}
                    className={`inline-flex h-11 min-w-[90px] items-center justify-center gap-2 rounded-full bg-white/20 px-3 text-xs font-semibold text-white backdrop-blur disabled:opacity-60 ${touchClass}`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {followBusy ? "..." : "Follow"}
                  </button>
                )}

                <button
                  type="button"
                  data-reel-control="true"
                  aria-label="Open options"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur ${touchClass}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 z-30 min-w-[180px] rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-lg backdrop-blur">
                    {isOwner ? (
                      <>
                        <Link
                          href={`/education/reels?reel=${item.id}`}
                          data-reel-control="true"
                          className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white ${touchClass}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          data-reel-control="true"
                          disabled={deleteBusy}
                          onClick={() => {
                            setMenuOpen(false);
                            onDelete(item);
                          }}
                          className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-300 disabled:opacity-60 ${touchClass}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          data-reel-control="true"
                          onClick={() => {
                            setMenuOpen(false);
                            onReport(item);
                          }}
                          className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white ${touchClass}`}
                        >
                          <Flag className="h-4 w-4" />
                          Report
                        </button>
                        <button
                          type="button"
                          data-reel-control="true"
                          onClick={() => {
                            setMenuOpen(false);
                            onHide(item);
                          }}
                          className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white ${touchClass}`}
                        >
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 space-y-3">
              <p className="line-clamp-3 text-sm leading-relaxed text-white">
                <span className="mr-1 font-semibold">@{item.author.username}</span>
                {item.reel.caption || "No caption yet"}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    data-reel-control="true"
                    onClick={() => onToggleLike(item)}
                    disabled={likeBusy}
                    className={`inline-flex h-11 min-w-[88px] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 text-sm font-semibold text-white backdrop-blur disabled:opacity-60 ${touchClass}`}
                  >
                    <Heart className={`h-4 w-4 ${item.likedByMe ? "fill-current text-rose-400" : ""}`} />
                    {formatCount(item.likesCount)}
                  </button>

                  <button
                    type="button"
                    data-reel-control="true"
                    onClick={handleCommentClick}
                    className={`inline-flex h-11 min-w-[88px] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 text-sm font-semibold text-white backdrop-blur ${touchClass}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {formatCount(item.commentsCount)}
                  </button>

                  <button
                    type="button"
                    data-reel-control="true"
                    onClick={handleShareClick}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur ${touchClass}`}
                    aria-label="Share reel"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                <Link
                  href={`/education/reels?reel=${item.id}`}
                  data-reel-control="true"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-slate-900 ${touchClass}`}
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch
                </Link>
              </div>

              <p className="text-xs font-medium text-white/80">{formatTime(item.createdAt)}</p>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-100/70 bg-white/90 p-5 shadow-sm backdrop-blur-md sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-700">
            {item.author.avatarUrl ? (
              <img
                src={item.author.avatarUrl}
                alt={item.author.name}
                className="h-full w-full object-cover"
              />
            ) : (
              item.author.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {item.author.name}
              {item.author.verified && (
                <CheckCircle2 className="ml-1.5 inline h-4 w-4 text-emerald-500" />
              )}
            </p>
            <p className="truncate text-xs text-slate-500">
              @{item.author.username} - {formatTime(item.createdAt)}
            </p>
          </div>
          {showFollow && (
            <button
              type="button"
              disabled={followBusy}
              onClick={() => onToggleFollow(item.userId)}
              className={`inline-flex h-11 min-w-[92px] shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-xs font-semibold text-white disabled:opacity-60 ${touchClass}`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {followBusy ? "..." : "Follow"}
            </button>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Open options"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ${touchClass}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 min-w-[180px] rounded-2xl border border-slate-100 bg-white p-1.5 shadow-lg">
              {isOwner ? (
                <>
                  <Link
                    href={`/education/post/${item.id}`}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 ${touchClass}`}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item);
                    }}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-600 disabled:opacity-60 ${touchClass}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onReport(item);
                    }}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 ${touchClass}`}
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onHide(item);
                    }}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 ${touchClass}`}
                  >
                    <EyeOff className="h-4 w-4" />
                    Hide
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
        <div className="aspect-[16/10]">
          {item.post.mediaUrl ? (
            item.post.mediaType === "video" ? (
              <video
                src={item.post.mediaUrl}
                className="h-full w-full object-cover"
                preload="metadata"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <img
                src={item.post.mediaUrl}
                alt={item.post.title}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            )
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-100 to-teal-50 px-6 text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                  Educational Post
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{item.post.title}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{item.post.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {item.post.body}
        </p>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleLike(item)}
            disabled={likeBusy}
            className={`inline-flex h-11 min-w-[88px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold ${
              item.likedByMe
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-slate-200 bg-white text-slate-600"
            } disabled:opacity-60 ${touchClass}`}
          >
            <Heart className={`h-4 w-4 ${item.likedByMe ? "fill-current" : ""}`} />
            {item.likesCount}
          </button>

          <button
            type="button"
            onClick={handleCommentClick}
            className={`inline-flex h-11 min-w-[88px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 ${touchClass}`}
          >
            <MessageCircle className="h-4 w-4" />
            {item.commentsCount}
          </button>
        </div>
      </footer>
    </article>
  );
}
