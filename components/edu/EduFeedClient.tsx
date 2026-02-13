"use client";

import { useEffect, useRef } from "react";
import { PostCard } from "@/components/edu/PostCard";
import { useEduPosts } from "@/lib/edu/useEduPosts";

export function EduFeedClient() {
  const { posts, loading, loadMore, hasMore, loadingMore, likedIds, savedIds, toggleLike, toggleSave } =
    useEduPosts();
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
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore]);

  return (
    <main className="mx-auto w-full max-w-[720px] space-y-4 sm:space-y-6">
      {loading &&
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 sm:h-11 sm:w-11 sm:rounded-2xl" />
              <div className="space-y-2">
                <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-800 sm:w-32" />
                <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-800 sm:w-20" />
              </div>
            </div>
            <div className="mt-4 h-44 rounded-xl bg-slate-200 dark:bg-slate-800 sm:mt-6 sm:h-56 sm:rounded-2xl" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800 sm:mt-4" />
            <div className="mt-2 h-3 w-1/3 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      {posts.map((post) => (
        <div key={post.id}>
          <PostCard
            post={post}
            liked={likedIds.has(post.id)}
            saved={savedIds.has(post.id)}
            onLike={toggleLike}
            onSave={toggleSave}
          />
        </div>
      ))}
      {!posts.length && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:rounded-3xl sm:p-8">
          No posts yet - knowledge is growing.
        </div>
      )}
      <div ref={loadMoreRef} />
      {loadingMore && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:rounded-3xl sm:p-6">
          Loading more posts...
        </div>
      )}
    </main>
  );
}
