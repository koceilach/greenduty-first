"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplet, Globe, Leaf, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";

type EduCreatorJoin = { display_name: string; verified: boolean | null; avatar_url: string | null };
type EduCategoryJoin = { name: string };
type EduAiVerificationJoin = {
  status: string | null;
  accuracy: number | null;
  source_credibility: number | null;
  greenwashing_risk: string | null;
  risk_flags: string[] | null;
  sources: string[] | null;
  notes: string | null;
  verified_at: string | null;
};
type EduPostStatsJoin = { likes: number | null; saves: number | null; comments: number | null };

type EduPostRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  media_type: string;
  media_urls: string[] | null;
  hashtags: string[] | null;
  sources: string[] | null;
  status: string;
  created_at: string;
  edu_creators: EduCreatorJoin | EduCreatorJoin[] | null;
  edu_categories: EduCategoryJoin | EduCategoryJoin[] | null;
  edu_ai_verifications: EduAiVerificationJoin | EduAiVerificationJoin[] | null;
  edu_post_stats: EduPostStatsJoin | EduPostStatsJoin[] | null;
};

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const PAGE_SIZE = 4;

const categoryBadge = (label: string) => {
  switch (label) {
    case "Water":
      return "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800";
    case "Climate":
      return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
    case "Soil":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
    default:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
  }
};

const mediaMap = (type: string) => {
  const key = type?.toLowerCase?.() ?? "image";
  if (key === "video") {
    return {
      label: "Short Video",
      icon: Droplet,
      gradientClass: "from-sky-400/20 via-cyan-300/10 to-transparent",
    };
  }
  if (key === "carousel") {
    return {
      label: "Carousel",
      icon: Globe,
      gradientClass: "from-amber-400/20 via-lime-300/10 to-transparent",
    };
  }
  if (key === "infographic") {
    return {
      label: "Infographic",
      icon: Leaf,
      gradientClass: "from-emerald-500/20 via-green-400/10 to-transparent",
    };
  }
  return {
    label: "Field Note",
    icon: Sprout,
    gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent",
  };
};

const normalizeMediaUrls = (urls?: string[] | null) => (urls ?? []).filter(Boolean);

const buildPost = (row: EduPostRow): EduFeedPost => {
  const creator = first(row.edu_creators);
  const category = first(row.edu_categories);
  const aiVerification = first(row.edu_ai_verifications);
  const postStats = first(row.edu_post_stats);
  const categoryLabel = category?.name ?? "Agronomy";
  const badgeClass = categoryBadge(categoryLabel);
  const mediaMeta = mediaMap(row.media_type);
  const mediaUrls = normalizeMediaUrls(row.media_urls);
  const isCarousel = row.media_type?.toLowerCase?.() === "carousel";
  const isVideo = row.media_type?.toLowerCase?.() === "video";

  return {
    id: row.id,
    creatorUserId: row.user_id,
    creator: {
      name: creator?.display_name ?? "Green Duty",
      handle: creator?.display_name
        ? `@${creator.display_name.toLowerCase().replace(/\s+/g, ".")}`
        : "@greenduty",
      avatar: (creator?.display_name ?? "GD").slice(0, 2).toUpperCase(),
      avatarUrl: creator?.avatar_url ?? null,
      verified: Boolean(creator?.verified),
      role: creator?.verified ? "Expert" : "User",
    },
    category: {
      label: categoryLabel as EduFeedPost["category"]["label"],
      badgeClass,
    },
    media: {
      type: (row.media_type?.toLowerCase?.() as EduFeedPost["media"]["type"]) ?? "image",
      label: mediaMeta.label,
      description: row.title,
      icon: mediaMeta.icon,
      gradientClass: mediaMeta.gradientClass,
      assetUrl: isCarousel ? undefined : mediaUrls[0],
      assetUrls: isCarousel ? mediaUrls : undefined,
      posterUrl: isVideo ? mediaUrls[1] ?? "/student2.jpg" : undefined,
    },
    caption: row.body ?? row.title,
    explanation: row.body ?? row.title,
    hashtags: (row.hashtags ?? []).length ? row.hashtags! : ["#GreenDuty"],
    sources: row.sources ?? aiVerification?.sources ?? [],
    stats: {
      likes: String(postStats?.likes ?? 0),
      comments: String(postStats?.comments ?? 0),
    },
    saves: String(postStats?.saves ?? 0),
    aiReport: {
      status: (aiVerification?.status?.toUpperCase?.() as EduFeedPost["aiReport"]["status"]) ?? "VERIFIED",
      accuracy: aiVerification?.accuracy ?? 0.95,
      sourceCredibility: aiVerification?.source_credibility ?? 0.9,
      greenwashingRisk: (aiVerification?.greenwashing_risk as "Low" | "Medium" | "High") ?? "Low",
      flags: aiVerification?.risk_flags ?? [],
      notes: aiVerification?.notes ?? "No risks detected by AI.",
      verifiedAt: aiVerification?.verified_at ?? new Date().toISOString(),
      sources: aiVerification?.sources ?? [],
    },
    comments: [],
  };
};

export function useEduPosts() {
  const [posts, setPosts] = useState<EduFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const syncUserFlags = useCallback(async (postIds: string[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user || !postIds.length) return;

    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase.from("edu_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("edu_saves").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    setLikedIds(new Set((likes ?? []).map((row) => row.post_id)));
    setSavedIds(new Set((saves ?? []).map((row) => row.post_id)));
  }, []);

  const fetchPage = useCallback(
    async (pageCursor: { created_at: string; id: string } | null = null) => {
      const query = supabase
        .from("edu_posts")
        .select(
          `
          id,
          user_id,
          title,
          body,
          media_type,
          media_urls,
          hashtags,
          sources,
          status,
          created_at,
          edu_creators:creator_id (
            display_name,
            verified,
            avatar_url
          ),
          edu_categories:category_id (
            name
          ),
          edu_ai_verifications:edu_ai_verifications (
            status,
            accuracy,
            source_credibility,
            greenwashing_risk,
            risk_flags,
            sources,
            notes,
            verified_at
          ),
          edu_post_stats:edu_post_stats (
            likes,
            saves,
            comments
          )
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageCursor) {
        query.or(
          `created_at.lt.${pageCursor.created_at},and(created_at.eq.${pageCursor.created_at},id.lt.${pageCursor.id})`
        );
      }

      return query;
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      const { data, error } = await fetchPage(null);
      if (!mounted) return;

      if (error || !data?.length) {
        setPosts([]);
        setHasMore(false);
      } else {
        const mapped = (data as EduPostRow[]).map(buildPost);
        setPosts(mapped);
        setHasMore(data.length === PAGE_SIZE);
        const last = data[data.length - 1] as EduPostRow;
        setCursor({ created_at: last.created_at, id: last.id });
        syncUserFlags(mapped.map((post) => post.id));
      }
      setLoading(false);
    };

    loadInitial();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data, error } = await fetchPage(cursor);
    if (!error && data?.length) {
      const mapped = (data as EduPostRow[]).map(buildPost);
      setPosts((prev) => [...prev, ...mapped]);
      setHasMore(data.length === PAGE_SIZE);
      const last = data[data.length - 1] as EduPostRow;
      setCursor({ created_at: last.created_at, id: last.id });
      syncUserFlags(mapped.map((post) => post.id));
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [cursor, fetchPage, hasMore, loadingMore, syncUserFlags]);

  const toggleLike = useCallback(
    async (postId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const isLiked = likedIds.has(postId);
      if (isLiked) {
        await supabase.from("edu_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("edu_likes").insert({ post_id: postId, user_id: user.id });
      }
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
      if (isSaved) {
        await supabase.from("edu_saves").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("edu_saves").insert({ post_id: postId, user_id: user.id });
      }
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
                saves: String(Math.max(0, (Number(post.saves ?? 0) || 0) + (isSaved ? -1 : 1))),
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
    loadMore,
    hasMore,
    loadingMore,
    likedIds,
    savedIds,
    toggleLike,
    toggleSave,
  };
}
