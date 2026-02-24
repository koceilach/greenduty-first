"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PostCard } from "@/components/edu/PostCard";
import { useEduPosts } from "@/lib/edu/useEduPosts";

export function EduFeedClient() {
  const {
    posts,
    loading,
    loadMore,
    hasMore,
    loadingMore,
    likedIds,
    savedIds,
    toggleLike,
    toggleSave,
  } = useEduPosts();
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

  return (
    <main className="mx-auto w-full max-w-[780px] min-w-0 space-y-4 sm:space-y-5">
      {loading &&
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-28 rounded-lg bg-slate-200" />
                <div className="h-3 w-16 rounded-lg bg-slate-200" />
              </div>
            </div>
            <div className="mt-4 h-56 rounded-xl bg-slate-200" />
            <div className="mt-4 h-3 w-2/3 rounded-lg bg-slate-200" />
            <div className="mt-2 h-3 w-1/3 rounded-lg bg-slate-200" />
          </div>
        ))}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={likedIds.has(post.id)}
          saved={savedIds.has(post.id)}
          onLike={toggleLike}
          onSave={toggleSave}
        />
      ))}

      {!posts.length && !loading && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No posts yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start your learning community by publishing the first update.
          </p>
          <Link
            href="/education/create"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-emerald-600 hover:shadow-sm active:scale-[0.98]"
          >
            Create your first post
          </Link>
        </div>
      )}

      <div ref={loadMoreRef} />

      {loadingMore && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          Loading more updates...
        </div>
      )}
    </main>
  );
}
