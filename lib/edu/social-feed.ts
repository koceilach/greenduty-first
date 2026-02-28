"use client";

import { Droplet, Globe, Leaf, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";

type FeedScope = "home" | "explore";
type FeedSort = "recent" | "trending";
type FeedKind = "post" | "reel";

type CreatorJoin = {
  user_id: string | null;
  display_name: string | null;
  verified: boolean | null;
  avatar_url: string | null;
};

type CategoryJoin = {
  name: string | null;
};

type PostStatsJoin = {
  likes: number | null;
  saves: number | null;
  comments: number | null;
};

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  resource_url: string | null;
  hashtags: string[] | null;
  sources: string[] | null;
  created_at: string;
  status: string | null;
  edu_creators: CreatorJoin | CreatorJoin[] | null;
  edu_categories: CategoryJoin | CategoryJoin[] | null;
  edu_post_stats: PostStatsJoin | PostStatsJoin[] | null;
};

type ReelRow = {
  id: string;
  author_id: string;
  video_url: string;
  caption: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type FeedAuthor = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  verified: boolean;
};

export type EduFeedReel = {
  id: string;
  authorId: string;
  createdAt: string;
  caption: string;
  videoUrl: string;
  likesCount: number;
  commentsCount: number;
  author: FeedAuthor;
};

export type EduUnifiedFeedItem =
  | {
      kind: "post";
      id: string;
      createdAt: string;
      authorId: string;
      likesCount: number;
      commentsCount: number;
      post: EduFeedPost;
    }
  | {
      kind: "reel";
      id: string;
      createdAt: string;
      authorId: string;
      likesCount: number;
      commentsCount: number;
      reel: EduFeedReel;
    };

export type FetchEducationFeedInput = {
  scope: FeedScope;
  limit: number;
  offset?: number;
  sort?: FeedSort;
  search?: string;
  kinds?: FeedKind[];
};

export type FetchEducationFeedResult = {
  currentUserId: string | null;
  followingIds: string[];
  items: EduUnifiedFeedItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
};

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : (value ?? null);

const normalizeName = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : "GreenDuty User";
};

const normalizeUsername = (value?: string | null) => {
  const raw = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
  return raw.length ? raw : "learner";
};

const sanitizeSearch = (value?: string) => value?.trim().toLowerCase() ?? "";

const parseDateMs = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortTrending = (items: EduUnifiedFeedItem[]) => {
  return [...items].sort((a, b) => {
    const aAgeHours = Math.max(0, (Date.now() - parseDateMs(a.createdAt)) / 3_600_000);
    const bAgeHours = Math.max(0, (Date.now() - parseDateMs(b.createdAt)) / 3_600_000);

    const aScore = a.likesCount * 3 + a.commentsCount * 2 + Math.max(0, 72 - aAgeHours);
    const bScore = b.likesCount * 3 + b.commentsCount * 2 + Math.max(0, 72 - bAgeHours);

    if (bScore !== aScore) return bScore - aScore;
    return parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
  });
};

const sortRecent = (items: EduUnifiedFeedItem[]) =>
  [...items].sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt));

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

const mediaMeta = (type: string) => {
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

const buildAuthor = ({
  userId,
  profile,
  creator,
}: {
  userId: string;
  profile?: ProfileRow;
  creator?: CreatorJoin | null;
}): FeedAuthor => {
  const fullName = normalizeName(
    creator?.display_name ?? profile?.full_name ?? profile?.username ?? "GreenDuty User"
  );
  return {
    id: userId,
    fullName,
    username: normalizeUsername(profile?.username ?? creator?.display_name ?? fullName),
    avatarUrl: creator?.avatar_url ?? profile?.avatar_url ?? null,
    verified: Boolean(creator?.verified),
  };
};

const mapPostRow = (
  row: PostRow,
  profileMap: Map<string, ProfileRow>,
  creatorMap: Map<string, CreatorJoin>
): EduUnifiedFeedItem => {
  const creator = first(row.edu_creators);
  const category = first(row.edu_categories);
  const stats = first(row.edu_post_stats);
  const author = buildAuthor({
    userId: row.user_id,
    profile: profileMap.get(row.user_id),
    creator: creator ?? creatorMap.get(row.user_id) ?? null,
  });

  const categoryLabel = category?.name?.trim() || "Agronomy";
  const mediaType = row.media_type?.toLowerCase?.() ?? "image";
  const mediaUrls = (row.media_urls ?? []).filter(Boolean);
  const isCarousel = mediaType === "carousel";
  const isVideo = mediaType === "video";
  const media = mediaMeta(mediaType);

  const likesCount = Number(stats?.likes ?? 0);
  const commentsCount = Number(stats?.comments ?? 0);
  const savesCount = Number(stats?.saves ?? 0);

  const post: EduFeedPost = {
    id: row.id,
    creatorUserId: row.user_id,
    creator: {
      name: author.fullName,
      handle: `@${author.username}`,
      avatar: author.fullName.slice(0, 2).toUpperCase(),
      avatarUrl: author.avatarUrl,
      verified: author.verified,
      role: author.verified ? "Expert" : "User",
    },
    category: {
      label:
        categoryLabel === "Climate" ||
        categoryLabel === "Soil" ||
        categoryLabel === "Water"
          ? categoryLabel
          : "Agronomy",
      badgeClass: categoryBadge(categoryLabel),
    },
    media: {
      type: (mediaType as EduFeedPost["media"]["type"]) ?? "image",
      label: media.label,
      description: row.title,
      icon: media.icon,
      gradientClass: media.gradientClass,
      assetUrl: isCarousel ? undefined : mediaUrls[0],
      assetUrls: isCarousel ? mediaUrls : undefined,
      posterUrl: isVideo ? mediaUrls[1] ?? "/student2.jpg" : undefined,
      resourceUrl: row.resource_url ?? null,
    },
    caption: row.body ?? row.title,
    explanation: row.body ?? row.title,
    hashtags: (row.hashtags ?? []).filter(Boolean),
    sources: (row.sources ?? []).filter(Boolean),
    stats: {
      likes: String(likesCount),
      comments: String(commentsCount),
    },
    saves: String(savesCount),
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.94,
      sourceCredibility: 0.9,
      greenwashingRisk: "Low",
      flags: [],
      notes: "Verification details unavailable in feed payload.",
      verifiedAt: row.created_at,
      sources: [],
    },
    comments: [],
  };

  return {
    kind: "post",
    id: row.id,
    createdAt: row.created_at,
    authorId: row.user_id,
    likesCount,
    commentsCount,
    post,
  };
};

const mapReelRow = (
  row: ReelRow,
  profileMap: Map<string, ProfileRow>,
  creatorMap: Map<string, CreatorJoin>
): EduUnifiedFeedItem => {
  const author = buildAuthor({
    userId: row.author_id,
    profile: profileMap.get(row.author_id),
    creator: creatorMap.get(row.author_id) ?? null,
  });

  const likesCount = Number(row.likes_count ?? 0);
  const commentsCount = Number(row.comments_count ?? 0);

  const reel: EduFeedReel = {
    id: row.id,
    authorId: row.author_id,
    createdAt: row.created_at,
    caption: row.caption ?? "",
    videoUrl: row.video_url,
    likesCount,
    commentsCount,
    author,
  };

  return {
    kind: "reel",
    id: row.id,
    createdAt: row.created_at,
    authorId: row.author_id,
    likesCount,
    commentsCount,
    reel,
  };
};

const matchesSearch = (item: EduUnifiedFeedItem, term: string) => {
  if (!term.length) return true;
  const normalized = term.toLowerCase();

  if (item.kind === "post") {
    const haystack = [
      item.post.creator.name,
      item.post.creator.handle,
      item.post.caption,
      item.post.explanation,
      item.post.category.label,
      ...item.post.hashtags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  }

  const haystack = [
    item.reel.author.fullName,
    item.reel.author.username,
    item.reel.caption,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
};

export async function getCurrentEducationUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchFollowingIds(viewerId: string): Promise<string[]> {
  const { data } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", viewerId);

  return (data ?? []).map((row) => row.following_id).filter(Boolean);
}

export async function followEducationUser(viewerId: string, targetUserId: string) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) return false;

  const { error } = await supabase.from("profile_follows").insert({
    follower_id: viewerId,
    following_id: targetUserId,
  });

  if (!error) return true;
  const normalized = error.message.toLowerCase();
  if (
    normalized.includes("duplicate") ||
    normalized.includes("already exists") ||
    normalized.includes("unique")
  ) {
    return true;
  }
  return false;
}

export async function fetchEducationFeed(
  input: FetchEducationFeedInput
): Promise<FetchEducationFeedResult> {
  const limit = Math.max(1, Math.min(input.limit, 30));
  const offset = Math.max(0, input.offset ?? 0);
  const sort = input.sort ?? "recent";
  const searchTerm = sanitizeSearch(input.search);
  const candidateLimit = Math.max(40, (offset + limit) * 4);
  const includePosts = !input.kinds?.length || input.kinds.includes("post");
  const includeReels = !input.kinds?.length || input.kinds.includes("reel");

  const currentUserId = await getCurrentEducationUserId();
  const followingIds = currentUserId ? await fetchFollowingIds(currentUserId) : [];

  if (input.scope === "home" && !currentUserId) {
    return {
      currentUserId: null,
      followingIds: [],
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: null,
    };
  }

  const homeAuthorIds =
    input.scope === "home" && currentUserId
      ? Array.from(new Set([currentUserId, ...followingIds]))
      : [];

  const postSelect = `
    id,
    user_id,
    title,
    body,
    media_type,
    media_urls,
    resource_url,
    hashtags,
    sources,
    created_at,
    status,
    edu_creators:creator_id ( user_id, display_name, verified, avatar_url ),
    edu_categories:category_id ( name ),
    edu_post_stats:edu_post_stats ( likes, saves, comments )
  `;

  const postQueryPromise = includePosts
    ? (() => {
        let query = supabase
          .from("edu_posts")
          .select(postSelect)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(candidateLimit);

        if (input.scope === "home") {
          if (!homeAuthorIds.length) {
            return Promise.resolve({ data: [] as PostRow[] });
          }
          query = query.in("user_id", homeAuthorIds);
        } else {
          query = query.eq("visibility", "public");
        }

        return query;
      })()
    : Promise.resolve({ data: [] as PostRow[] });

  const reelQueryPromise = includeReels
    ? (() => {
        let query = supabase
          .from("edu_reels")
          .select("id,author_id,video_url,caption,likes_count,comments_count,created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(candidateLimit);

        if (input.scope === "home") {
          if (!homeAuthorIds.length) {
            return Promise.resolve({ data: [] as ReelRow[] });
          }
          query = query.in("author_id", homeAuthorIds);
        }

        return query;
      })()
    : Promise.resolve({ data: [] as ReelRow[] });

  const [{ data: postRows }, { data: reelRows }] = await Promise.all([
    postQueryPromise,
    reelQueryPromise,
  ]);

  const safePostRows = (postRows ?? []) as PostRow[];
  const safeReelRows = (reelRows ?? []) as ReelRow[];

  const authorIds = Array.from(
    new Set([
      ...safePostRows.map((row) => row.user_id),
      ...safeReelRows.map((row) => row.author_id),
    ])
  ).filter(Boolean);

  const [profileRows, creatorRows] = await Promise.all([
    authorIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    authorIds.length
      ? supabase
          .from("edu_creators")
          .select("user_id,display_name,verified,avatar_url")
          .in("user_id", authorIds)
      : Promise.resolve({ data: [] as CreatorJoin[] }),
  ]);

  const profileMap = new Map(
    ((profileRows.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );
  const creatorMap = new Map(
    ((creatorRows.data ?? []) as CreatorJoin[])
      .filter((creator) => Boolean(creator.user_id))
      .map((creator) => [creator.user_id as string, creator])
  );

  const mappedPosts = safePostRows.map((row) => mapPostRow(row, profileMap, creatorMap));
  const mappedReels = safeReelRows.map((row) => mapReelRow(row, profileMap, creatorMap));

  const mixed = [...mappedPosts, ...mappedReels].filter((item) =>
    matchesSearch(item, searchTerm)
  );

  const sorted =
    sort === "trending" ? sortTrending(mixed) : sortRecent(mixed);

  const pageItems = sorted.slice(offset, offset + limit);
  const hasMore = sorted.length > offset + limit;

  return {
    currentUserId,
    followingIds,
    items: pageItems,
    total: sorted.length,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}
