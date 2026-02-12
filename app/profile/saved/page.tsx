"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { PostCard } from "@/components/edu/PostCard";
import { useProfileData } from "@/lib/profile/useProfileData";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";
import { Bookmark, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Droplet, Globe, Leaf, Sprout } from "lucide-react";

/* ── helpers ─────────────────────────────────────── */

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

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
  if (key === "video")
    return { label: "Short Video", icon: Droplet, gradientClass: "from-sky-400/20 via-cyan-300/10 to-transparent" };
  if (key === "carousel")
    return { label: "Carousel", icon: Globe, gradientClass: "from-amber-400/20 via-lime-300/10 to-transparent" };
  if (key === "infographic")
    return { label: "Infographic", icon: Leaf, gradientClass: "from-emerald-500/20 via-green-400/10 to-transparent" };
  return { label: "Field Note", icon: Sprout, gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent" };
};

type CreatorJoin = { display_name: string; verified: boolean | null; avatar_url: string | null };
type CategoryJoin = { name: string };
type StatsJoin = { likes: number | null; saves: number | null; comments: number | null };
type AiJoin = {
  status: string | null;
  accuracy: number | null;
  source_credibility: number | null;
  greenwashing_risk: string | null;
  risk_flags: string[] | null;
  sources: string[] | null;
  notes: string | null;
  verified_at: string | null;
};

type SavedPostRow = {
  post_id: string;
  created_at: string;
  edu_posts: {
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
    edu_creators: CreatorJoin | CreatorJoin[] | null;
    edu_categories: CategoryJoin | CategoryJoin[] | null;
    edu_post_stats: StatsJoin | StatsJoin[] | null;
    edu_ai_verifications: AiJoin | AiJoin[] | null;
  } | null;
};

const buildPost = (postData: NonNullable<SavedPostRow["edu_posts"]>): EduFeedPost => {
  const creator = first(postData.edu_creators);
  const cat = first(postData.edu_categories);
  const stats = first(postData.edu_post_stats);
  const ai = first(postData.edu_ai_verifications);
  const catLabel = cat?.name ?? "Agronomy";
  const meta = mediaMap(postData.media_type);
  const urls = (postData.media_urls ?? []).filter(Boolean);
  const isCarousel = postData.media_type?.toLowerCase() === "carousel";
  const isVideo = postData.media_type?.toLowerCase() === "video";

  return {
    id: postData.id,
    creatorUserId: postData.user_id,
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
      label: catLabel as EduFeedPost["category"]["label"],
      badgeClass: categoryBadge(catLabel),
    },
    media: {
      type: (postData.media_type?.toLowerCase() as EduFeedPost["media"]["type"]) ?? "image",
      label: meta.label,
      description: postData.title,
      icon: meta.icon,
      gradientClass: meta.gradientClass,
      assetUrl: isCarousel ? undefined : urls[0],
      assetUrls: isCarousel ? urls : undefined,
      posterUrl: isVideo ? urls[1] ?? "/student2.jpg" : undefined,
    },
    caption: postData.body ?? postData.title,
    explanation: postData.body ?? postData.title,
    hashtags: (postData.hashtags ?? []).length ? postData.hashtags! : ["#GreenDuty"],
    sources: postData.sources ?? ai?.sources ?? [],
    stats: {
      likes: String(stats?.likes ?? 0),
      comments: String(stats?.comments ?? 0),
    },
    saves: String(stats?.saves ?? 0),
    aiReport: {
      status: (ai?.status?.toUpperCase() as EduFeedPost["aiReport"]["status"]) ?? "VERIFIED",
      accuracy: ai?.accuracy ?? 0.95,
      sourceCredibility: ai?.source_credibility ?? 0.9,
      greenwashingRisk: (ai?.greenwashing_risk as "Low" | "Medium" | "High") ?? "Low",
      flags: ai?.risk_flags ?? [],
      notes: ai?.notes ?? "No risks detected by AI.",
      verifiedAt: ai?.verified_at ?? new Date().toISOString(),
      sources: ai?.sources ?? [],
    },
    comments: [],
  };
};

/* ── Component ───────────────────────────────────── */

export default function ProfileSavedPage() {
  const { profile, loading: profileLoading } = useProfileData();
  const [savedPosts, setSavedPosts] = useState<EduFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadSaved = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("edu_saves")
      .select(
        `
        post_id,
        created_at,
        edu_posts:post_id (
          id, user_id, title, body, media_type, media_urls, hashtags, sources, status, created_at,
          edu_creators:creator_id ( display_name, verified, avatar_url ),
          edu_categories:category_id ( name ),
          edu_post_stats:edu_post_stats ( likes, saves, comments ),
          edu_ai_verifications:edu_ai_verifications ( status, accuracy, source_credibility, greenwashing_risk, risk_flags, sources, notes, verified_at )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const posts: EduFeedPost[] = [];
    const ids = new Set<string>();

    for (const row of rows ?? []) {
      const postData = first((row as any).edu_posts);
      if (postData) {
        posts.push(buildPost(postData));
        ids.add(postData.id);
      }
    }

    setSavedPosts(posts);
    setSavedIds(ids);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleUnsave = async (postId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase.from("edu_saves").delete().eq("post_id", postId).eq("user_id", user.id);
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  };

  const isLoading = profileLoading || loading;

  return (
    <ProfileShell profile={profile} loading={profileLoading} activeTab="saved">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#1E7F43]" />
        </div>
      ) : savedPosts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Bookmark className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium">No saved posts yet</p>
          <p className="mt-1 text-xs">Posts you save will appear here — only you can see them</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {savedPosts.length} saved post{savedPosts.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Bookmark className="h-3 w-3" />
              Only visible to you
            </div>
          </div>
          {savedPosts.map((post) => (
            <div key={post.id} className="relative">
              <PostCard
                post={post}
                saved={savedIds.has(post.id)}
                onSave={handleUnsave}
              />
            </div>
          ))}
        </div>
      )}
    </ProfileShell>
  );
}
