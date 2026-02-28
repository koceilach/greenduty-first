"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  fetchEducationFeed,
  followEducationUser,
  type EduUnifiedFeedItem,
} from "@/lib/edu/social-feed";

type FeedScope = "home" | "explore";
type FeedSort = "recent" | "trending";
type FeedKind = "post" | "reel";

type UseEduPostsOptions = {
  scope?: FeedScope;
  sort?: FeedSort;
  search?: string;
  kinds?: FeedKind[];
  pageSize?: number;
};

const PAGE_SIZE = 10;

const toItemKey = (kind: FeedKind, id: string) => `${kind}:${id}`;

export function useEduPosts(options: UseEduPostsOptions = {}) {
  const {
    scope = "home",
    sort = "recent",
    search = "",
    kinds,
    pageSize = PAGE_SIZE,
  } = options;

  const [items, setItems] = useState<EduUnifiedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followingBusyIds, setFollowingBusyIds] = useState<Set<string>>(new Set());
  const [hiddenItemKeys, setHiddenItemKeys] = useState<Set<string>>(new Set());

  const hiddenItemKeysRef = useRef<Set<string>>(new Set());
  const normalizedSearch = search.trim();

  useEffect(() => {
    hiddenItemKeysRef.current = hiddenItemKeys;
  }, [hiddenItemKeys]);

  const syncUserFlags = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase
        .from("edu_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("edu_saves")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
    ]);

    const likedForBatch = new Set((likes ?? []).map((row) => row.post_id));
    const savedForBatch = new Set((saves ?? []).map((row) => row.post_id));

    setLikedIds((prev) => {
      const next = new Set(prev);
      postIds.forEach((id) => next.delete(id));
      likedForBatch.forEach((id) => next.add(id));
      return next;
    });

    setSavedIds((prev) => {
      const next = new Set(prev);
      postIds.forEach((id) => next.delete(id));
      savedForBatch.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const fetchFeedPage = useCallback(
    async (offset: number) => {
      return fetchEducationFeed({
        scope,
        sort,
        search: normalizedSearch || undefined,
        kinds,
        limit: pageSize,
        offset,
      });
    },
    [kinds, normalizedSearch, pageSize, scope, sort]
  );

  const refreshPosts = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const page = await fetchFeedPage(0);
        const visibleItems = page.items.filter(
          (item) => !hiddenItemKeysRef.current.has(toItemKey(item.kind, item.id))
        );
        setItems(visibleItems);
        setCurrentUserId(page.currentUserId);
        setFollowingIds(page.followingIds);
        setNextOffset(page.nextOffset);
        setHasMore(page.hasMore);

        const postIds = visibleItems
          .filter((item) => item.kind === "post")
          .map((item) => item.id);
        await syncUserFlags(postIds);
      } catch (refreshError: any) {
        if (!silent) {
          setItems([]);
          setCurrentUserId(null);
          setFollowingIds([]);
          setNextOffset(null);
          setHasMore(false);
          setError(refreshError?.message ?? "Unable to load feed right now.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchFeedPage, syncUserFlags]
  );

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    let refreshTimeout: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }
      refreshTimeout = window.setTimeout(() => {
        void refreshPosts({ silent: true });
      }, 420);
    };

    const postsChannel = supabase
      .channel(`edu-posts-feed-live:${scope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_posts",
        },
        scheduleRefresh
      )
      .subscribe();

    const reelsChannel = supabase
      .channel(`edu-reels-feed-live:${scope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_reels",
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reelsChannel);
    };
  }, [refreshPosts, scope]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void refreshPosts({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshOnFocus();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || nextOffset === null) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeedPage(nextOffset);
      setCurrentUserId(page.currentUserId);
      setFollowingIds(page.followingIds);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);

      const visibleItems = page.items.filter(
        (item) => !hiddenItemKeysRef.current.has(toItemKey(item.kind, item.id))
      );

      if (visibleItems.length) {
        setItems((prev) => {
          const existing = new Set(prev.map((item) => toItemKey(item.kind, item.id)));
          const incoming = visibleItems.filter(
            (item) => !existing.has(toItemKey(item.kind, item.id))
          );
          return incoming.length ? [...prev, ...incoming] : prev;
        });

        const postIds = visibleItems
          .filter((item) => item.kind === "post")
          .map((item) => item.id);
        await syncUserFlags(postIds);
      }
    } catch {
      setHasMore(false);
      setNextOffset(null);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFeedPage, hasMore, loadingMore, nextOffset, syncUserFlags]);

  const toggleLike = useCallback(
    async (postId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const isLiked = likedIds.has(postId);
      const action = isLiked
        ? supabase
            .from("edu_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id)
        : supabase.from("edu_likes").insert({ post_id: postId, user_id: user.id });

      const { error: likeError } = await action;
      if (likeError) return;

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });

      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "post" || item.id !== postId) return item;

          const currentLikes = Number(item.post.stats.likes) || 0;
          const nextLikes = Math.max(0, currentLikes + (isLiked ? -1 : 1));

          return {
            ...item,
            likesCount: nextLikes,
            post: {
              ...item.post,
              stats: {
                ...item.post.stats,
                likes: String(nextLikes),
              },
            },
          };
        })
      );
    },
    [likedIds]
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const isSaved = savedIds.has(postId);
      const action = isSaved
        ? supabase
            .from("edu_saves")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id)
        : supabase.from("edu_saves").insert({ post_id: postId, user_id: user.id });

      const { error: saveError } = await action;
      if (saveError) return;

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(postId);
        else next.add(postId);
        return next;
      });

      setItems((prev) =>
        prev.map((item) => {
          if (item.kind !== "post" || item.id !== postId) return item;

          const currentSaves = Number(item.post.saves ?? 0) || 0;
          const nextSaves = Math.max(0, currentSaves + (isSaved ? -1 : 1));

          return {
            ...item,
            post: {
              ...item.post,
              saves: String(nextSaves),
            },
          };
        })
      );
    },
    [savedIds]
  );

  const removeItem = useCallback((kind: FeedKind, id: string) => {
    setItems((prev) => prev.filter((item) => !(item.kind === kind && item.id === id)));
    if (kind === "post") {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const hideItem = useCallback(
    (kind: FeedKind, id: string) => {
      const key = toItemKey(kind, id);
      setHiddenItemKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      removeItem(kind, id);
    },
    [removeItem]
  );

  const followUser = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId || !targetUserId || targetUserId === currentUserId) {
        return false;
      }

      if (followingIds.includes(targetUserId)) {
        return true;
      }

      setFollowingBusyIds((prev) => {
        const next = new Set(prev);
        next.add(targetUserId);
        return next;
      });

      try {
        const success = await followEducationUser(currentUserId, targetUserId);
        if (!success) return false;

        setFollowingIds((prev) =>
          prev.includes(targetUserId) ? prev : [...prev, targetUserId]
        );
        return true;
      } finally {
        setFollowingBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    },
    [currentUserId, followingIds]
  );

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const posts = useMemo(
    () => items.filter((item) => item.kind === "post").map((item) => item.post),
    [items]
  );

  return {
    items,
    posts,
    loading,
    error,
    refreshing,
    refreshPosts,
    loadMore,
    hasMore,
    loadingMore,
    likedIds,
    savedIds,
    toggleLike,
    toggleSave,
    currentUserId,
    followingIds,
    followingSet,
    followingBusyIds,
    isFollowing: (userId: string) => followingSet.has(userId),
    followUser,
    hideItem,
    removeItem,
  };
}
