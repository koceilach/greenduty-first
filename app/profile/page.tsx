"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { PostCard } from "@/components/edu/PostCard";
import { useProfileData } from "@/lib/profile/useProfileData";
import {
  Clapperboard,
  Grid3X3,
  Heart,
  LayoutList,
  List,
  MessageCircle,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ViewMode = "feed" | "grid" | "list";
type ContentMode = "posts" | "reels";

const formatCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function ProfilePage() {
  const { profile, loading, displayPosts, displayReels } = useProfileData();
  const [contentMode, setContentMode] = useState<ContentMode>("posts");
  const [viewMode, setViewMode] = useState<ViewMode>("feed");

  const viewButtons: { id: ViewMode; icon: typeof LayoutList; label: string }[] = [
    { id: "feed", icon: LayoutList, label: "Feed" },
    { id: "grid", icon: Grid3X3, label: "Grid" },
    { id: "list", icon: List, label: "List" },
  ];

  const headerRight = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setContentMode("posts")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              contentMode === "posts"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Posts</span>
          </button>
          <button
            type="button"
            onClick={() => setContentMode("reels")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              contentMode === "reels"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            <span>Reels</span>
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {viewButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setViewMode(btn.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                viewMode === btn.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
              aria-label={btn.label}
              type="button"
            >
              <btn.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    ),
    [contentMode, viewMode]
  );

  const postBody =
    loading ? (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    ) : displayPosts.length === 0 ? (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <p className="text-sm font-medium">No posts yet</p>
        <p className="mt-1 text-xs">Your published posts will appear here</p>
      </div>
    ) : viewMode === "feed" ? (
      <div className="space-y-6">
        {displayPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    ) : viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {displayPosts.map((post) => {
          const thumb = post.media.assetUrl ?? post.media.assetUrls?.[0] ?? null;
          const isVideo = post.media.type === "video";
          return (
            <Link
              key={post.id}
              href={`/education/post/${post.id}`}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={post.caption}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${post.media.gradientClass}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {post.media.label}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition group-hover:opacity-100">
                <span className="flex items-center gap-1 text-sm font-semibold text-white">
                  <Heart className="h-4 w-4" /> {post.stats.likes}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> {post.stats.comments}
                </span>
              </div>

              {isVideo && (
                <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5">
                  <Play className="h-3 w-3 fill-white text-white" />
                </div>
              )}

              {post.media.type === "carousel" && (post.media.assetUrls?.length ?? 0) > 1 && (
                <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                  1/{post.media.assetUrls!.length}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    ) : (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {displayPosts.map((post) => {
          const thumb = post.media.assetUrl ?? post.media.assetUrls?.[0] ?? null;
          return (
            <Link
              key={post.id}
              href={`/education/post/${post.id}`}
              className="flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${post.media.gradientClass}`}>
                    <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">
                      {post.media.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {post.caption}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${post.category.badgeClass}`}>
                    {post.category.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {post.stats.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {post.stats.comments}
                  </span>
                </div>
              </div>

              <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800 sm:inline">
                {post.media.label}
              </span>
            </Link>
          );
        })}
      </div>
    );

  const reelsBody =
    loading ? (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    ) : displayReels.length === 0 ? (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <p className="text-sm font-medium">No reels yet</p>
        <p className="mt-1 text-xs">Your reels will appear here</p>
      </div>
    ) : viewMode === "feed" ? (
      <div className="space-y-5">
        {displayReels.map((reel) => (
          <Link
            key={reel.id}
            href={`/education/reels?reel=${reel.id}`}
            className="block overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative h-[300px] bg-black sm:h-full">
                <video
                  src={reel.videoUrl}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                <div className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <p className="line-clamp-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {reel.caption}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                    <Heart className="h-3.5 w-3.5" />
                    {formatCount(reel.likesCount)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {formatCount(reel.commentsCount)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                    {formatShortDate(reel.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    ) : viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {displayReels.map((reel) => (
          <Link
            key={reel.id}
            href={`/education/reels?reel=${reel.id}`}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800"
          >
            <video
              src={reel.videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
              <p className="truncate text-[11px] font-semibold text-white">
                {reel.caption || "Untitled reel"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {displayReels.map((reel) => (
          <Link
            key={reel.id}
            href={`/education/reels?reel=${reel.id}`}
            className="flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
              <video
                src={reel.videoUrl}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {reel.caption || "Untitled reel"}
              </p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatCount(reel.likesCount)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {formatCount(reel.commentsCount)}
                </span>
                <span>{formatShortDate(reel.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );

  return (
    <ProfileShell
      profile={profile}
      loading={loading}
      activeTab="posts"
      headerRight={headerRight}
    >
      {contentMode === "posts" ? postBody : reelsBody}
    </ProfileShell>
  );
}
