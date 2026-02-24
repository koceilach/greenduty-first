"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  getHomeFeed,
  type HomeFeedPostItem,
} from "@/app/education/actions/get-home-feed";
import { mapHomeFeedPostToEduFeedPost } from "@/lib/edu/home-feed-mapper";
import type { EduFeedPost } from "@/lib/edu/feed";

const PAGE_SIZE = 10;

const isPostItem = (item: { kind: string }): item is HomeFeedPostItem =>
  item.kind === "post";

export function useEduPosts() {
  const [posts, setPosts] = useState<EduFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [feedSeed, setFeedSeed] = useState<string | undefined>(undefined);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchRankedPostsPage = useCallback(
    async (offset: number, seed?: string) => {
      const result = await getHomeFeed({
        limit: PAGE_SIZE,
        offset,
        seed,
      });

      const rankedPosts = result.items
        .filter(isPostItem)
        .map(mapHomeFeedPostToEduFeedPost);

      return {
        posts: rankedPosts,
        seed: result.seed,
        nextOffset: result.nextOffset,
        hasMore: result.hasMore,
      };
    },
    []
  );

  const refreshPosts = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const page = await fetchRankedPostsPage(0, undefined);
        setPosts(page.posts);
        setFeedSeed(page.seed);
        setNextOffset(page.nextOffset);
        setHasMore(page.hasMore);
        await syncUserFlags(page.posts.map((post) => post.id));
      } catch {
        if (!silent) {
          setPosts([]);
          setFeedSeed(undefined);
          setNextOffset(null);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchRankedPostsPage, syncUserFlags]
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
      .channel("edu-posts-feed-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_posts",
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(postsChannel);
    };
  }, [refreshPosts]);

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
      const page = await fetchRankedPostsPage(nextOffset, feedSeed);
      setFeedSeed(page.seed);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);

      if (page.posts.length) {
        setPosts((prev) => {
          const existing = new Set(prev.map((post) => post.id));
          const incoming = page.posts.filter((post) => !existing.has(post.id));
          return incoming.length ? [...prev, ...incoming] : prev;
        });
        await syncUserFlags(page.posts.map((post) => post.id));
      }
    } catch {
      setHasMore(false);
      setNextOffset(null);
    } finally {
      setLoadingMore(false);
    }
  }, [feedSeed, fetchRankedPostsPage, hasMore, loadingMore, nextOffset, syncUserFlags]);

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

      const { error } = await action;
      if (error) return;

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                stats: {
                  ...post.stats,
                  likes: String(
                    Math.max(0, (Number(post.stats.likes) || 0) + (isLiked ? -1 : 1))
                  ),
                },
              }
            : post
        )
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

      const { error } = await action;
      if (error) return;

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(postId);
        else next.add(postId);
        return next;
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                saves: String(
                  Math.max(0, (Number(post.saves ?? 0) || 0) + (isSaved ? -1 : 1))
                ),
              }
            : post
        )
      );
    },
    [savedIds]
  );

  return {
    posts,
    loading,
    refreshing,
    refreshPosts,
    loadMore,
    hasMore,
    loadingMore,
    likedIds,
    savedIds,
    toggleLike,
    toggleSave,
  };
}
