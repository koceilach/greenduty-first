"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PostCard } from "@/components/edu/PostCard";
import { ReelFeedCard } from "@/components/edu/ReelFeedCard";
import { useEduPosts } from "@/lib/edu/useEduPosts";

export function EduFeedClient() {
  const {
    items,
    loading,
    error,
    loadMore,
    hasMore,
    loadingMore,
    likedIds,
    savedIds,
    toggleLike,
    toggleSave,
    currentUserId,
    followingSet,
    followingBusyIds,
    followUser,
    hideItem,
    removeItem,
  } = useEduPosts({ scope: "home", sort: "recent" });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;
    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore]);

  const hasAnyItems = items.length > 0;

  const emptyTitle = useMemo(() => {
    if (!currentUserId) return "Start by signing in";
    return "Your feed is empty";
  }, [currentUserId]);

  const emptyBody = useMemo(() => {
    if (!currentUserId) {
      return "Sign in to see posts and reels from people you follow, then build your personalized learning feed.";
    }
    return "Follow more creators or publish your own content to start a richer education feed.";
  }, [currentUserId]);

  return (
    <main className="mx-auto w-full max-w-[860px] min-w-0">
      <div className="space-y-6 sm:space-y-7">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse rounded-3xl border border-slate-100/60 bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                <div className="space-y-2.5">
                  <div className="h-3 w-32 rounded-xl bg-slate-200" />
                  <div className="h-3 w-20 rounded-xl bg-slate-200" />
                </div>
              </div>
              <div className="mt-5 h-56 rounded-2xl bg-slate-200 sm:h-64" />
              <div className="mt-5 h-3 w-2/3 rounded-xl bg-slate-200" />
              <div className="mt-2.5 h-3 w-1/3 rounded-xl bg-slate-200" />
            </div>
          ))}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {items.map((item) => {
          const canFollowAuthor =
            Boolean(currentUserId) &&
            item.authorId !== currentUserId &&
            !followingSet.has(item.authorId);

          if (item.kind === "post") {
            return (
              <div
                key={`post-${item.id}`}
                className="rounded-3xl border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-100/70 hover:shadow-md"
              >
                <PostCard
                  post={item.post}
                  liked={likedIds.has(item.id)}
                  saved={savedIds.has(item.id)}
                  onLike={toggleLike}
                  onSave={toggleSave}
                  showFollowButton={canFollowAuthor}
                  followBusy={followingBusyIds.has(item.authorId)}
                  onFollow={followUser}
                  onHide={(postId) => hideItem("post", postId)}
                  onDelete={(postId) => removeItem("post", postId)}
                />
              </div>
            );
          }

          return (
            <div
              key={`reel-${item.id}`}
              className="rounded-3xl border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-100/70 hover:shadow-md"
            >
              <ReelFeedCard
                reel={item.reel}
                currentUserId={currentUserId}
                canFollow={canFollowAuthor}
                followBusy={followingBusyIds.has(item.authorId)}
                onFollow={followUser}
                onHide={(reelId) => hideItem("reel", reelId)}
                onDelete={(reelId) => removeItem("reel", reelId)}
              />
            </div>
          );
        })}

        {!hasAnyItems && !loading && !error && (
          <div className="rounded-3xl border border-slate-100/60 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 sm:text-[15px]">
              {emptyBody}
            </p>
            <Link
              href="/education/create"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-emerald-600 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              Create your first post
            </Link>
          </div>
        )}

        <div ref={loadMoreRef} className="h-px w-full" />

        {loadingMore && (
          <div className="rounded-2xl border border-slate-100/70 bg-white/90 px-5 py-4 text-center text-sm text-slate-500 shadow-sm backdrop-blur-sm">
            Loading more updates...
          </div>
        )}

        {!hasMore && hasAnyItems && !loadingMore && (
          <p className="pb-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            You have reached the end of the feed
          </p>
        )}

        <div className="h-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:h-8" aria-hidden />
      </div>
    </main>
  );
}
