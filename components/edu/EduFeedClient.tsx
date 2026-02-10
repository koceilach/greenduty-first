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
    <main className="mx-auto w-full max-w-[720px] space-y-6">
      {loading &&
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-6 h-56 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
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
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          No posts yet - knowledge is growing.
        </div>
      )}
      <div ref={loadMoreRef} />
      {loadingMore && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading more posts...
        </div>
      )}
    </main>
  );
}
