"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { PostCard } from "@/components/edu/PostCard";
import { useProfileData } from "@/lib/profile/useProfileData";
import { Grid3X3, Heart, LayoutList, List, MessageCircle, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ViewMode = "feed" | "grid" | "list";

export default function ProfilePage() {
  const { profile, loading, displayPosts } = useProfileData();
  const [viewMode, setViewMode] = useState<ViewMode>("feed");

  const viewButtons: { id: ViewMode; icon: typeof LayoutList; label: string }[] = [
    { id: "feed", icon: LayoutList, label: "Feed" },
    { id: "grid", icon: Grid3X3, label: "Grid" },
    { id: "list", icon: List, label: "List" },
  ];

  return (
    <ProfileShell
      profile={profile}
      loading={loading}
      activeTab="posts"
      headerRight={
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
            >
              <btn.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
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
        /* ── Feed view: full PostCard ──────────────────── */
        <div className="space-y-6">
          {displayPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid view: thumbnail tiles ───────────────── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayPosts.map((post) => {
            const thumb =
              post.media.assetUrl ??
              post.media.assetUrls?.[0] ??
              null;
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

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <span className="flex items-center gap-1 text-sm font-semibold text-white">
                    <Heart className="h-4 w-4" /> {post.stats.likes}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-white">
                    <MessageCircle className="h-4 w-4" /> {post.stats.comments}
                  </span>
                </div>

                {/* Video badge */}
                {isVideo && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5">
                    <Play className="h-3 w-3 fill-white text-white" />
                  </div>
                )}

                {/* Carousel badge */}
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
        /* ── List view: compact rows ──────────────────── */
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayPosts.map((post) => {
            const thumb =
              post.media.assetUrl ??
              post.media.assetUrls?.[0] ??
              null;
            return (
              <Link
                key={post.id}
                href={`/education/post/${post.id}`}
                className="flex items-center gap-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2"
              >
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${post.media.gradientClass}`}>
                      <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">
                        {post.media.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
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

                {/* Media type */}
                <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800 sm:inline">
                  {post.media.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </ProfileShell>
  );
}
