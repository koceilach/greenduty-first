"use client";

import { useEffect, useMemo, useState } from "react";
import { Droplet, Globe, Leaf, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { eduProfile } from "@/lib/edu/feed";
import type { EduFeedPost } from "@/lib/edu/feed";

export type ProfileState = {
  name: string;
  handle: string;
  role: string;
  avatar: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  location?: string | null;
  phone?: string | null;
  website?: string | null;
  education?: string | null;
  work?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  stats: {
    posts: number;
    likes: number;
    saves: number;
    follows?: number;
    friends?: number;
  };
  bio: string;
};

type ProfileEduCategoryJoin = { name: string };

type ProfileEduPostRow = {
  id: string;
  title: string;
  body: string | null;
  media_type: string;
  media_urls: string[] | null;
  status: string;
  created_at: string;
  edu_categories: ProfileEduCategoryJoin | ProfileEduCategoryJoin[] | null;
};

const firstOf = <T,>(v: T | T[] | null | undefined): T | null =>
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

export function useProfileData() {
  const [profile, setProfile] = useState<ProfileState>(eduProfile);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<EduFeedPost[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const [{ data: profileRow }, { data: postRows }, { count: followCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username, role, bio, avatar_url, cover_url, location, phone, website, education, work, date_of_birth, gender")
          .eq("id", user.id)
          .single(),
        supabase
          .from("edu_posts")
          .select(
            `
              id,
              title,
              body,
              media_type,
              media_urls,
              status,
              created_at,
              edu_categories:category_id (
                name
              )
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("profile_follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);

      const postIds = (postRows ?? []).map((row) => row.id);
      let likeCount = 0;
      let saveCount = 0;
      if (postIds.length) {
        const [{ count: likes }, { count: saves }] = await Promise.all([
          supabase.from("edu_likes").select("id", { count: "exact", head: true }).in("post_id", postIds),
          supabase.from("edu_saves").select("id", { count: "exact", head: true }).in("post_id", postIds),
        ]);
        likeCount = likes ?? 0;
        saveCount = saves ?? 0;
      }

      if (!mounted) return;

      const emailHandle = user.email ? user.email.split("@")[0] : "greenduty.user";
      const roleLabel =
        profileRow?.role?.toLowerCase().includes("expert")
          ? "Expert"
          : profileRow?.role?.toLowerCase().includes("admin")
          ? "Admin"
          : "User";

      const displayName = profileRow?.full_name || eduProfile.name;
      const handle = profileRow?.username ? `@${profileRow.username}` : `@${emailHandle}`;
      const avatar = profileRow?.full_name
        ? profileRow.full_name.slice(0, 2).toUpperCase()
        : eduProfile.avatar;
      const avatarUrl = profileRow?.avatar_url ?? null;

      const mappedPosts = (postRows ?? []).map((row) => {
        const categoryLabel = firstOf(row.edu_categories)?.name ?? "Agronomy";
        const badgeClass = categoryBadge(categoryLabel);
        const mediaMeta = mediaMap(row.media_type);
        const mediaUrls = normalizeMediaUrls(row.media_urls);
        const isCarousel = row.media_type?.toLowerCase?.() === "carousel";
        const isVideo = row.media_type?.toLowerCase?.() === "video";
        return {
          id: row.id,
          creatorUserId: user.id,
          creator: {
            name: displayName,
            handle,
            avatar,
            avatarUrl,
            verified: roleLabel === "Expert",
            role: roleLabel === "Expert" ? "Expert" : "User",
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
            posterUrl: isVideo ? mediaUrls[1] ?? undefined : undefined,
          },
          caption: row.body ?? row.title,
          explanation: row.body ?? row.title,
          hashtags: ["#Agronomy", "#GreenDuty", "#Sustainability"],
          sources: [],
          stats: {
            likes: "0",
            comments: "0",
          },
          saves: "0",
          aiReport: {
            status: "VERIFIED",
            accuracy: 0.95,
            sourceCredibility: 0.9,
            greenwashingRisk: "Low",
            flags: [],
            notes: "Pending verification.",
            verifiedAt: new Date().toISOString(),
            sources: [],
          },
          comments: [],
        } satisfies EduFeedPost;
      });

      setProfile((prev) => ({
        ...prev,
        name: displayName,
        handle,
        role: roleLabel,
        avatarUrl,
        coverUrl: profileRow?.cover_url ?? null,
        location: profileRow?.location ?? null,
        phone: (profileRow as any)?.phone ?? null,
        website: (profileRow as any)?.website ?? null,
        education: (profileRow as any)?.education ?? null,
        work: (profileRow as any)?.work ?? null,
        dateOfBirth: (profileRow as any)?.date_of_birth ?? null,
        gender: (profileRow as any)?.gender ?? null,
        avatar,
        bio: profileRow?.bio || prev.bio,
        stats: {
          posts: postIds.length,
          likes: likeCount,
          saves: saveCount,
          follows: followCount ?? 0,
        },
      }));
      setUserPosts(mappedPosts);
      setLoading(false);
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const displayPosts = useMemo(() => userPosts, [userPosts]);

  const mediaPosts = useMemo(
    () => displayPosts.filter((post) => post.media.assetUrl || post.media.assetUrls?.length),
    [displayPosts]
  );

  return {
    profile,
    loading,
    currentUserId,
    displayPosts,
    mediaPosts,
  };
}
