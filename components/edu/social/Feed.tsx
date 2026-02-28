"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  deleteFeedItem,
  getHomeFeed,
  toggleFollow,
  toggleLike,
  toggleReelLike,
} from "@/app/education/actions/social-engine";
import type { FeedPageResult, SocialFeedItem } from "@/lib/edu/social-engine-types";
import { PostCard } from "@/components/edu/social/PostCard";

type FeedProps = {
  initialPage: FeedPageResult;
};

const keyOf = (item: Pick<SocialFeedItem, "kind" | "id">) => `${item.kind}:${item.id}`;

export function Feed({ initialPage }: FeedProps) {
  const [items, setItems] = useState<SocialFeedItem[]>(initialPage.items);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    initialPage.currentUserId
  );
  const [followingIds, setFollowingIds] = useState<Set<string>>(
    new Set(initialPage.followingIds)
  );
  const [pendingFollowIds, setPendingFollowIds] = useState<Set<string>>(new Set());
  const [pendingLikeKeys, setPendingLikeKeys] = useState<Set<string>>(new Set());
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState<Set<string>>(new Set());
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [nextPage, setNextPage] = useState<number | null>(initialPage.nextPage);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const addPending = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const removePending = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const page = await getHomeFeed(nextPage);
      setCurrentUserId((prev) => prev ?? page.currentUserId);
      setHasMore(page.hasMore);
      setNextPage(page.nextPage);
      setItems((prev) => {
        const existing = new Set(prev.map((item) => keyOf(item)));
        const incoming = page.items.filter((item) => {
          const key = keyOf(item);
          return !existing.has(key) && !hiddenKeys.has(key);
        });
        return incoming.length ? [...prev, ...incoming] : prev;
      });
    } catch {
      setNotice("Could not load more posts right now.");
      setHasMore(false);
      setNextPage(null);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, hiddenKeys, loadingMore, nextPage]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "280px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleToggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId || !currentUserId || targetUserId === currentUserId) return;
      if (pendingFollowIds.has(targetUserId)) return;

      const wasFollowing = followingIds.has(targetUserId);
      addPending(setPendingFollowIds, targetUserId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(targetUserId);
        else next.add(targetUserId);
        return next;
      });

      const result = await toggleFollow(targetUserId);
      removePending(setPendingFollowIds, targetUserId);

      if (!result.ok) {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) next.add(targetUserId);
          else next.delete(targetUserId);
          return next;
        });
        setNotice(result.message ?? "Could not update follow status.");
        return;
      }

      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (result.following) next.add(targetUserId);
        else next.delete(targetUserId);
        return next;
      });
    },
    [currentUserId, followingIds, pendingFollowIds]
  );

  const handleToggleLike = useCallback(async (item: SocialFeedItem) => {
    const key = keyOf(item);
    if (pendingLikeKeys.has(key)) return;

    let snapshot: { likedByMe: boolean; likesCount: number } | null = null;
    setItems((prev) =>
      prev.map((current) => {
        if (current.kind !== item.kind || current.id !== item.id) return current;
        snapshot = {
          likedByMe: current.likedByMe,
          likesCount: current.likesCount,
        };
        const nextLiked = !current.likedByMe;
        return {
          ...current,
          likedByMe: nextLiked,
          likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1)),
        };
      })
    );

    addPending(setPendingLikeKeys, key);
    const result =
      item.kind === "post" ? await toggleLike(item.id) : await toggleReelLike(item.id);
    removePending(setPendingLikeKeys, key);

    if (!result.ok) {
      if (snapshot) {
        setItems((prev) =>
          prev.map((current) =>
            current.kind === item.kind && current.id === item.id
              ? {
                  ...current,
                  likedByMe: snapshot!.likedByMe,
                  likesCount: snapshot!.likesCount,
                }
              : current
          )
        );
      }
      setNotice(result.message ?? "Could not update like.");
      return;
    }

    setItems((prev) =>
      prev.map((current) => {
        if (current.kind !== item.kind || current.id !== item.id) return current;
        return {
          ...current,
          likedByMe: result.liked,
        };
      })
    );
  }, [pendingLikeKeys]);

  const hideItem = useCallback((item: SocialFeedItem) => {
    const key = keyOf(item);
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setItems((prev) =>
      prev.filter((current) => !(current.kind === item.kind && current.id === item.id))
    );
  }, []);

  const handleReport = useCallback((_item: SocialFeedItem) => {
    setNotice("Report received. Thank you.");
  }, []);

  const handleDelete = useCallback(async (item: SocialFeedItem) => {
    const key = keyOf(item);
    if (pendingDeleteKeys.has(key)) return;

    const shouldDelete = window.confirm(
      "Delete this content permanently? This action cannot be undone."
    );
    if (!shouldDelete) return;

    addPending(setPendingDeleteKeys, key);
    const result = await deleteFeedItem(item.kind, item.id);
    removePending(setPendingDeleteKeys, key);

    if (!result.ok) {
      setNotice(result.message ?? "Could not delete item.");
      return;
    }

    setItems((prev) =>
      prev.filter((current) => !(current.kind === item.kind && current.id === item.id))
    );
  }, [pendingDeleteKeys]);

  const emptyState = useMemo(
    () => (
      <div className="rounded-3xl border border-slate-100/70 bg-white/90 p-8 text-center shadow-sm backdrop-blur-md sm:p-10">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <FileText className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Your feed is empty</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Follow creators and publish your own educational content to activate your timeline.
        </p>
      </div>
    ),
    []
  );

  return (
    <section className="mx-auto w-full max-w-[860px] min-w-0 space-y-6 sm:space-y-7">
      {items.map((item) => {
        const followBusy = pendingFollowIds.has(item.userId);
        const likeBusy = pendingLikeKeys.has(keyOf(item));
        const deleteBusy = pendingDeleteKeys.has(keyOf(item));

        return (
          <PostCard
            key={keyOf(item)}
            item={item}
            currentUserId={currentUserId}
            isFollowing={followingIds.has(item.userId)}
            followBusy={followBusy}
            likeBusy={likeBusy}
            deleteBusy={deleteBusy}
            onToggleFollow={handleToggleFollow}
            onToggleLike={handleToggleLike}
            onHide={hideItem}
            onReport={handleReport}
            onDelete={handleDelete}
          />
        );
      })}

      {!items.length && emptyState}

      <div ref={loadMoreRef} className="h-px w-full" />

      {loadingMore && (
        <div className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-center text-sm text-slate-500 shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more...
          </span>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          You reached the end of your feed
        </p>
      )}

      {notice && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}
    </section>
  );
}
