"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";
import { Droplet, Globe, Leaf, Sprout } from "lucide-react";

type EduCreatorJoin = {
  display_name: string;
  verified: boolean | null;
  avatar_url: string | null;
};

type EduCategoryJoin = {
  name: string;
};

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

type EduPostStatsJoin = {
  likes: number | null;
  saves: number | null;
  comments: number | null;
};

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

type EduCommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

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

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

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

export function useEduPostDetail(postId?: string) {
  const [post, setPost] = useState<EduFeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<EduFeedPost["comments"]>([]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!postId) return;

    const load = async () => {
      const { data, error } = await supabase
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
        .eq("id", postId)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setPost(null);
      } else {
        setPost(buildPost(data as EduPostRow));
      }

      const { data: commentRows } = await supabase
        .from("edu_comments")
        .select("id, body, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (commentRows) {
        const userIds = Array.from(
          new Set((commentRows as EduCommentRow[]).map((row) => row.user_id).filter(Boolean))
        );
        let creatorsByUser = new Map<string, { name: string; role: string }>();
        if (userIds.length) {
          const { data: creators } = await supabase
            .from("edu_creators")
            .select("user_id,display_name,verified")
            .in("user_id", userIds);
          if (creators) {
            creators.forEach((creator) => {
              if (!creator.user_id) return;
              creatorsByUser.set(creator.user_id, {
                name: creator.display_name ?? "User",
                role: creator.verified ? "Expert" : "User",
              });
            });
          }
        }

        const mapped = (commentRows as EduCommentRow[]).map((row) => {
          const creator = creatorsByUser.get(row.user_id);
          return {
            id: row.id,
            userId: row.user_id,
            author: creator?.name ?? "User",
            role: creator?.role ?? "User",
            body: row.body,
            time: new Date(row.created_at).toLocaleDateString(),
          };
        });
        setComments(mapped);
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from("edu_likes").select("id").eq("post_id", postId).eq("user_id", user.id).limit(1),
          supabase.from("edu_saves").select("id").eq("post_id", postId).eq("user_id", user.id).limit(1),
        ]);
        setLiked(Boolean(likes?.length));
        setSaved(Boolean(saves?.length));
      }

      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [postId]);

  const addComment = useCallback(
    async (body: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || !postId) return;

      const { data, error } = await supabase
        .from("edu_comments")
        .insert({ post_id: postId, user_id: user.id, body })
        .select("id, body, created_at, user_id")
        .single();

      if (!error && data) {
        const { data: creatorRow } = await supabase
          .from("edu_creators")
          .select("display_name,verified")
          .eq("user_id", user.id)
          .maybeSingle();
        const next = {
          id: data.id,
          userId: data.user_id,
          author: creatorRow?.display_name ?? "User",
          role: creatorRow?.verified ? "Expert" : "User",
          body: data.body,
          time: new Date(data.created_at).toLocaleDateString(),
        };
        setComments((prev) => [next, ...prev]);
        setPost((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  comments: String(Math.max(0, Number(prev.stats.comments) + 1)),
                },
              }
            : prev
        );
      }
    },
    [postId]
  );

  return { post, loading, comments, liked, saved, addComment };
}
