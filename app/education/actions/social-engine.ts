"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ExploreOrder,
  FeedKind,
  FeedPageResult,
  SocialFeedAuthor,
  SocialFeedItem,
} from "@/lib/edu/social-engine-types";

const SOCIAL_PAGE_SIZE = 10;
const CANDIDATE_MULTIPLIER = 4;

type FeedScope = "home" | "explore";

type ViewerContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string | null;
  followingIds: string[];
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type CreatorRow = {
  user_id: string | null;
  display_name: string | null;
  verified: boolean | null;
  avatar_url: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  resource_url: string | null;
  created_at: string;
  status: string | null;
  visibility: string | null;
  edu_post_stats:
    | {
        likes: number | null;
        comments: number | null;
      }
    | Array<{
        likes: number | null;
        comments: number | null;
      }>
    | null;
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

type LikeRow = {
  post_id: string | null;
  reel_id: string | null;
};

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : (value ?? null);

const normalizePage = (page?: number) => {
  if (!page || Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
};

const normalizeUsername = (value?: string | null) => {
  const raw = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
  return raw.length ? raw : "learner";
};

const normalizeName = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : "GreenDuty User";
};

const toMs = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const scoreTrending = (item: SocialFeedItem) => {
  const ageHours = Math.max(0, (Date.now() - toMs(item.createdAt)) / 3_600_000);
  return item.likesCount * 3 + item.commentsCount * 2 + Math.max(0, 72 - ageHours);
};

const sortRecent = (items: SocialFeedItem[]) =>
  [...items].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

const sortTrending = (items: SocialFeedItem[]) =>
  [...items].sort((a, b) => {
    const delta = scoreTrending(b) - scoreTrending(a);
    if (delta !== 0) return delta;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

const buildAuthor = (
  userId: string,
  profileMap: Map<string, ProfileRow>,
  creatorMap: Map<string, CreatorRow>
): SocialFeedAuthor => {
  const profile = profileMap.get(userId);
  const creator = creatorMap.get(userId);
  const name = normalizeName(
    creator?.display_name ?? profile?.full_name ?? profile?.username ?? "GreenDuty User"
  );

  return {
    id: userId,
    name,
    username: normalizeUsername(profile?.username ?? creator?.display_name ?? name),
    avatarUrl: creator?.avatar_url ?? profile?.avatar_url ?? null,
    verified: Boolean(creator?.verified),
  };
};

async function getViewerContext(): Promise<ViewerContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      userId: null,
      followingIds: [],
    };
  }

  const { data: follows } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);

  return {
    supabase,
    userId: user.id,
    followingIds: (follows ?? []).map((row) => row.following_id).filter(Boolean),
  };
}

async function fetchCombinedFeed(options: {
  scope: FeedScope;
  page: number;
  order: ExploreOrder;
  context: ViewerContext;
}): Promise<FeedPageResult> {
  const { scope, page, order, context } = options;
  const { supabase, userId: viewerId, followingIds } = context;
  const normalizedPage = normalizePage(page);
  const offset = (normalizedPage - 1) * SOCIAL_PAGE_SIZE;
  const candidateLimit = Math.max(
    SOCIAL_PAGE_SIZE * CANDIDATE_MULTIPLIER,
    (offset + SOCIAL_PAGE_SIZE) * CANDIDATE_MULTIPLIER
  );

  const authorIds =
    scope === "home" && viewerId
      ? Array.from(new Set([viewerId, ...followingIds]))
      : [];

  if (scope === "home" && (!viewerId || !authorIds.length)) {
    return {
      items: [],
      page: normalizedPage,
      pageSize: SOCIAL_PAGE_SIZE,
      hasMore: false,
      nextPage: null,
      currentUserId: viewerId,
      followingIds,
    };
  }

  let postsQuery = supabase
    .from("edu_posts")
    .select(
      "id,user_id,title,body,media_type,media_urls,resource_url,created_at,status,visibility,edu_post_stats(likes,comments)"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(candidateLimit);

  if (scope === "home") {
    postsQuery = postsQuery.in("user_id", authorIds);
  } else {
    postsQuery = postsQuery.eq("visibility", "public");
  }

  let reelsQuery = supabase
    .from("edu_reels")
    .select("id,author_id,video_url,caption,likes_count,comments_count,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(candidateLimit);

  if (scope === "home") {
    reelsQuery = reelsQuery.in("author_id", authorIds);
  }

  const [{ data: postRows }, { data: reelRows }] = await Promise.all([
    postsQuery,
    reelsQuery,
  ]);

  const safePosts = (postRows ?? []) as PostRow[];
  const safeReels = (reelRows ?? []) as ReelRow[];

  const allAuthorIds = Array.from(
    new Set([
      ...safePosts.map((row) => row.user_id),
      ...safeReels.map((row) => row.author_id),
    ])
  ).filter(Boolean);

  const [profilesResult, creatorsResult] = await Promise.all([
    allAuthorIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url")
          .in("id", allAuthorIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    allAuthorIds.length
      ? supabase
          .from("edu_creators")
          .select("user_id,display_name,verified,avatar_url")
          .in("user_id", allAuthorIds)
      : Promise.resolve({ data: [] as CreatorRow[] }),
  ]);

  const profileMap = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row])
  );

  const creatorMap = new Map(
    ((creatorsResult.data ?? []) as CreatorRow[])
      .filter((row) => Boolean(row.user_id))
      .map((row) => [row.user_id as string, row])
  );

  const postIds = safePosts.map((row) => row.id);
  const reelIds = safeReels.map((row) => row.id);

  const likedSet = new Set<string>();
  if (viewerId && (postIds.length || reelIds.length)) {
    let likeQuery = supabase
      .from("edu_social_likes")
      .select("post_id,reel_id")
      .eq("user_id", viewerId)
      .limit(Math.max(postIds.length + reelIds.length, 1));

    if (postIds.length && reelIds.length) {
      likeQuery = likeQuery.or(
        `post_id.in.(${postIds.join(",")}),reel_id.in.(${reelIds.join(",")})`
      );
    } else if (postIds.length) {
      likeQuery = likeQuery.in("post_id", postIds);
    } else {
      likeQuery = likeQuery.in("reel_id", reelIds);
    }

    const { data: likeRows } = await likeQuery;
    for (const row of (likeRows ?? []) as LikeRow[]) {
      if (row.post_id) likedSet.add(`post:${row.post_id}`);
      if (row.reel_id) likedSet.add(`reel:${row.reel_id}`);
    }
  }

  const postItems: SocialFeedItem[] = safePosts.map((row) => {
    const stats = first(row.edu_post_stats);
    const mediaUrl = (row.media_urls ?? []).filter(Boolean)[0] ?? null;

    return {
      id: row.id,
      kind: "post",
      createdAt: row.created_at,
      userId: row.user_id,
      likesCount: Number(stats?.likes ?? 0),
      commentsCount: Number(stats?.comments ?? 0),
      likedByMe: likedSet.has(`post:${row.id}`),
      author: buildAuthor(row.user_id, profileMap, creatorMap),
      post: {
        title: row.title,
        body: row.body ?? row.title,
        mediaType: row.media_type ?? "image",
        mediaUrl,
        resourceUrl: row.resource_url ?? null,
      },
    };
  });

  const reelItems: SocialFeedItem[] = safeReels.map((row) => ({
    id: row.id,
    kind: "reel",
    createdAt: row.created_at,
    userId: row.author_id,
    likesCount: Number(row.likes_count ?? 0),
    commentsCount: Number(row.comments_count ?? 0),
    likedByMe: likedSet.has(`reel:${row.id}`),
    author: buildAuthor(row.author_id, profileMap, creatorMap),
    reel: {
      caption: row.caption ?? "",
      videoUrl: row.video_url,
    },
  }));

  const merged = [...postItems, ...reelItems];
  const sorted = order === "trending" ? sortTrending(merged) : sortRecent(merged);
  const pageItems = sorted.slice(offset, offset + SOCIAL_PAGE_SIZE);
  const hasMore = sorted.length > offset + SOCIAL_PAGE_SIZE;

  return {
    items: pageItems,
    page: normalizedPage,
    pageSize: SOCIAL_PAGE_SIZE,
    hasMore,
    nextPage: hasMore ? normalizedPage + 1 : null,
    currentUserId: viewerId,
    followingIds,
  };
}

export async function getHomeFeed(page = 1): Promise<FeedPageResult> {
  noStore();
  const context = await getViewerContext();
  return fetchCombinedFeed({
    scope: "home",
    page,
    order: "recent",
    context,
  });
}

export async function getExploreFeed(
  page = 1,
  order: ExploreOrder = "trending"
): Promise<FeedPageResult> {
  noStore();
  const context = await getViewerContext();
  return fetchCombinedFeed({
    scope: "explore",
    page,
    order,
    context,
  });
}

export async function toggleFollow(targetUserId: string) {
  noStore();
  const { supabase, userId } = await getViewerContext();

  if (!userId) {
    return { ok: false, following: false, message: "Authentication required" };
  }

  if (!targetUserId || targetUserId === userId) {
    return { ok: false, following: false, message: "Invalid target user" };
  }

  const { data: existing } = await supabase
    .from("profile_follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("profile_follows")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { ok: false, following: true, message: error.message };
    }

    revalidatePath("/education");
    revalidatePath("/education/search");
    return { ok: true, following: false };
  }

  const { error } = await supabase.from("profile_follows").insert({
    follower_id: userId,
    following_id: targetUserId,
  });

  if (error) {
    return { ok: false, following: false, message: error.message };
  }

  revalidatePath("/education");
  revalidatePath("/education/search");
  return { ok: true, following: true };
}

export async function toggleLike(postId: string) {
  noStore();
  const { supabase, userId } = await getViewerContext();

  if (!userId) {
    return { ok: false, liked: false, message: "Authentication required" };
  }

  if (!postId) {
    return { ok: false, liked: false, message: "Missing post id" };
  }

  const { data: existing } = await supabase
    .from("edu_social_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .is("reel_id", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("edu_social_likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { ok: false, liked: true, message: error.message };
    }

    revalidatePath("/education");
    revalidatePath("/education/search");
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("edu_social_likes").insert({
    user_id: userId,
    post_id: postId,
  });

  if (error) {
    return { ok: false, liked: false, message: error.message };
  }

  revalidatePath("/education");
  revalidatePath("/education/search");
  return { ok: true, liked: true };
}

export async function toggleReelLike(reelId: string) {
  noStore();
  const { supabase, userId } = await getViewerContext();

  if (!userId) {
    return { ok: false, liked: false, message: "Authentication required" };
  }

  if (!reelId) {
    return { ok: false, liked: false, message: "Missing reel id" };
  }

  const { data: existing } = await supabase
    .from("edu_social_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("reel_id", reelId)
    .is("post_id", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("edu_social_likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { ok: false, liked: true, message: error.message };
    }

    revalidatePath("/education");
    revalidatePath("/education/search");
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("edu_social_likes").insert({
    user_id: userId,
    reel_id: reelId,
  });

  if (error) {
    return { ok: false, liked: false, message: error.message };
  }

  revalidatePath("/education");
  revalidatePath("/education/search");
  return { ok: true, liked: true };
}

export async function reportFeedItem(
  kind: FeedKind,
  id: string,
  reason: string,
  details?: string | null
) {
  noStore();
  const { supabase, userId } = await getViewerContext();

  if (!userId) {
    return { ok: false, message: "Authentication required" };
  }

  if (!id) {
    return { ok: false, message: "Missing id" };
  }

  if (kind !== "post" && kind !== "reel") {
    return { ok: false, message: "Invalid content type" };
  }

  const normalizedReason = reason.trim() || "Reported by user";
  const normalizedDetails = details?.trim() || null;

  if (kind === "post") {
    const { error } = await supabase.from("edu_post_reports").insert({
      post_id: id,
      reporter_id: userId,
      reason: normalizedReason,
      details: normalizedDetails,
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("unique")
      ) {
        return { ok: false, message: "You already reported this post." };
      }
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("edu_reel_reports").insert({
      reel_id: id,
      reporter_id: userId,
      reason: normalizedReason,
      details: normalizedDetails,
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("unique")
      ) {
        return { ok: false, message: "You already reported this reel." };
      }
      if (normalized.includes("edu_reel_reports") || normalized.includes("does not exist")) {
        return { ok: false, message: "Reporting reels is not configured yet." };
      }
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/education");
  revalidatePath("/education/reels");
  revalidatePath("/mod-dashboard");
  return { ok: true, message: "Report sent." };
}

export async function deleteFeedItem(kind: FeedKind, id: string) {
  noStore();
  const { supabase, userId } = await getViewerContext();

  if (!userId) {
    return { ok: false, message: "Authentication required" };
  }

  if (!id) {
    return { ok: false, message: "Missing id" };
  }

  if (kind === "post") {
    const { error } = await supabase
      .from("edu_posts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase
      .from("edu_reels")
      .delete()
      .eq("id", id)
      .eq("author_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/education");
  revalidatePath("/education/search");
  revalidatePath("/education/reels");
  return { ok: true };
}
