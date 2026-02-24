"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const USER_THRESHOLD = 1000;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const CANDIDATE_MULTIPLIER = 4;
const FIREHOSE_JITTER_MS = 5 * 60 * 1000;

type Nullable<T> = T | null;

type FeedPhase = "global_firehose" | "engagement_algorithm";

type ProfileRow = {
  id: string;
  full_name: Nullable<string>;
  username: Nullable<string>;
  avatar_url: Nullable<string>;
};

type PostStatsJoin = {
  likes: Nullable<number>;
  comments: Nullable<number>;
} | null;

type PostCategoryJoin = {
  name: Nullable<string>;
} | null;

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  body: Nullable<string>;
  media_type: Nullable<string>;
  media_urls: Nullable<string[]>;
  resource_url: Nullable<string>;
  hashtags: Nullable<string[]>;
  sources: Nullable<string[]>;
  created_at: string;
  edu_categories: PostCategoryJoin | PostCategoryJoin[];
  edu_post_stats: PostStatsJoin | PostStatsJoin[];
};

type ReelRow = {
  id: string;
  author_id: string;
  video_url: string;
  caption: Nullable<string>;
  likes_count: Nullable<number>;
  comments_count: Nullable<number>;
  created_at: string;
};

type InteractionRow = {
  post_id?: Nullable<string>;
  reel_id?: Nullable<string>;
  watch_time_seconds: Nullable<number>;
};

export type HomeFeedAuthor = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

type HomeFeedBase = {
  id: string;
  kind: "post" | "reel";
  createdAt: string;
  author: HomeFeedAuthor;
  score: number;
};

export type HomeFeedPostItem = HomeFeedBase & {
  kind: "post";
  post: {
    title: string;
    body: string | null;
    category: string;
    mediaType: string;
    mediaUrls: string[];
    resourceUrl: string | null;
    hashtags: string[];
    sources: string[];
    likesCount: number;
    commentsCount: number;
  };
};

export type HomeFeedReelItem = HomeFeedBase & {
  kind: "reel";
  reel: {
    videoUrl: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
  };
};

export type HomeFeedItem = HomeFeedPostItem | HomeFeedReelItem;

export type GetHomeFeedInput = {
  limit?: number;
  offset?: number;
  seed?: string;
  search?: string;
};

export type GetHomeFeedResult = {
  phase: FeedPhase;
  totalUsers: number;
  threshold: number;
  fetchedAt: string;
  seed: string;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  items: HomeFeedItem[];
};

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : (value ?? null);

const normalizeLimit = (value?: number) => {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
};

const normalizeOffset = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return 0;
  return Math.trunc(value);
};

const defaultSeed = () => `firehose-${Math.floor(Date.now() / FIREHOSE_JITTER_MS)}`;

const normalizeSeed = (value?: string) => {
  const raw = value?.trim() ?? "";
  if (!raw.length) return defaultSeed();
  return raw.slice(0, 64);
};

const sanitizeSearch = (value?: string) => {
  if (!value) return "";
  return value
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const escapeIlike = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

const safeDateMs = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeUsername = (value: string) => {
  const raw = value
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
  return raw.length ? raw : "learner";
};

const stableHash = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

function createFeedClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    throw new Error("Supabase env vars are missing for getHomeFeed().");
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function resolveTotalUsers(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("profiles")
    .select("id", { head: true, count: "exact" });

  if (!error && typeof count === "number") {
    return count;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseServiceRoleKey) return 0;

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let total = 0;
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) break;

    const users = data?.users ?? [];
    total += users.length;
    if (users.length < perPage) break;
    page += 1;
  }

  return total;
}

async function fetchPosts(
  client: SupabaseClient,
  limit: number,
  search: string
): Promise<PostRow[]> {
  const runBase = () =>
    client
      .from("edu_posts")
      .select(
        "id,user_id,title,body,media_type,media_urls,resource_url,hashtags,sources,created_at,edu_categories:category_id(name),edu_post_stats(likes,comments)"
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

  const runPlain = () => runBase().limit(limit);

  const runSearch = async () => {
    const pattern = `%${escapeIlike(search)}%`;
    const [titleResult, bodyResult] = await Promise.all([
      runBase().ilike("title", pattern).limit(limit),
      runBase().ilike("body", pattern).limit(limit),
    ]);

    if (titleResult.error && bodyResult.error) {
      return {
        data: null as PostRow[] | null,
        error: titleResult.error,
      };
    }

    const mergedRows = [
      ...((titleResult.data ?? []) as PostRow[]),
      ...((bodyResult.data ?? []) as PostRow[]),
    ];
    const deduped = Array.from(
      new Map(mergedRows.map((row) => [row.id, row])).values()
    )
      .sort((a, b) => {
        const dateDelta = safeDateMs(b.created_at) - safeDateMs(a.created_at);
        if (dateDelta !== 0) return dateDelta;
        return b.id.localeCompare(a.id);
      })
      .slice(0, limit);

    const hasSuccess = !titleResult.error || !bodyResult.error;

    return {
      data: deduped,
      error: hasSuccess ? null : titleResult.error ?? bodyResult.error ?? null,
    };
  };

  const run = search ? runSearch : runPlain;

  const { data, error } = await run();

  if (error) return [];
  return (data ?? []) as PostRow[];
}

async function fetchReels(
  client: SupabaseClient,
  limit: number,
  search: string
): Promise<ReelRow[]> {
  let query = client
    .from("edu_reels")
    .select("id,author_id,video_url,caption,likes_count,comments_count,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike("caption", `%${escapeIlike(search)}%`);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ReelRow[];
}

async function fetchProfiles(
  client: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  if (!userIds.length) return new Map();

  const { data, error } = await client
    .from("profiles")
    .select("id,full_name,username,avatar_url")
    .in("id", userIds);

  if (error) return new Map();

  const map = new Map<string, ProfileRow>();
  for (const row of (data ?? []) as ProfileRow[]) {
    map.set(row.id, row);
  }
  return map;
}

const toAuthor = (profile: ProfileRow | undefined, userId: string): HomeFeedAuthor => {
  const fallbackName = "GreenDuty User";
  const profileName = profile?.full_name?.trim() || profile?.username?.trim() || fallbackName;
  const profileUsername = normalizeUsername(
    profile?.username?.trim() || profileName.replace(/\s+/g, ".")
  );

  return {
    id: userId,
    name: profileName,
    username: profileUsername,
    avatarUrl: profile?.avatar_url ?? null,
  };
};

const toPostItems = (
  rows: PostRow[],
  profiles: Map<string, ProfileRow>
): HomeFeedPostItem[] =>
  rows.map((row) => {
    const stats = first(row.edu_post_stats);
    const category = first(row.edu_categories)?.name?.trim() || "Agronomy";
    const likesCount = Number(stats?.likes ?? 0);
    const commentsCount = Number(stats?.comments ?? 0);

    return {
      id: row.id,
      kind: "post",
      createdAt: row.created_at,
      author: toAuthor(profiles.get(row.user_id), row.user_id),
      score: safeDateMs(row.created_at),
      post: {
        title: row.title,
        body: row.body,
        category,
        mediaType: row.media_type ?? "image",
        mediaUrls: (row.media_urls ?? []).filter(Boolean),
        resourceUrl: row.resource_url ?? null,
        hashtags: (row.hashtags ?? []).filter(Boolean),
        sources: (row.sources ?? []).filter(Boolean),
        likesCount,
        commentsCount,
      },
    };
  });

const toReelItems = (
  rows: ReelRow[],
  profiles: Map<string, ProfileRow>
): HomeFeedReelItem[] =>
  rows.map((row) => ({
    id: row.id,
    kind: "reel",
    createdAt: row.created_at,
    author: toAuthor(profiles.get(row.author_id), row.author_id),
    score: safeDateMs(row.created_at),
    reel: {
      videoUrl: row.video_url,
      caption: row.caption ?? "",
      likesCount: Number(row.likes_count ?? 0),
      commentsCount: Number(row.comments_count ?? 0),
    },
  }));

async function fetchViewAverages(
  client: SupabaseClient,
  idColumn: "post_id" | "reel_id",
  ids: string[]
): Promise<Map<string, number>> {
  if (!ids.length) return new Map();

  const { data, error } = await client
    .from("user_interactions")
    .select(`${idColumn},watch_time_seconds`)
    .eq("interaction_type", "view")
    .in(idColumn, ids);

  if (error) return new Map();

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of (data ?? []) as InteractionRow[]) {
    const entityId = (idColumn === "post_id" ? row.post_id : row.reel_id) ?? null;
    if (!entityId) continue;
    const seconds = Number(row.watch_time_seconds ?? 0);
    if (!Number.isFinite(seconds) || seconds <= 0) continue;

    const current = totals.get(entityId) ?? { sum: 0, count: 0 };
    current.sum += seconds;
    current.count += 1;
    totals.set(entityId, current);
  }

  const averages = new Map<string, number>();
  for (const [entityId, item] of totals) {
    averages.set(entityId, item.count ? item.sum / item.count : 0);
  }
  return averages;
}

const rankFirehose = (items: HomeFeedItem[], seed: string): HomeFeedItem[] =>
  items
    .map((item) => {
      const hashUnit = (stableHash(`${seed}:${item.kind}:${item.id}`) % 10000) / 10000;
      const jitter = (hashUnit - 0.5) * FIREHOSE_JITTER_MS;
      return { ...item, score: safeDateMs(item.createdAt) + jitter };
    })
    .sort((a, b) => b.score - a.score);

const rankByEngagement = (
  items: HomeFeedItem[],
  postWatchAverage: Map<string, number>,
  reelWatchAverage: Map<string, number>
): HomeFeedItem[] =>
  items
    .map((item) => {
      if (item.kind === "post") {
        const watchAverage = postWatchAverage.get(item.id) ?? 0;
        const score =
          Math.log1p(item.post.likesCount) * 0.5 +
          Math.log1p(item.post.commentsCount) * 0.35 +
          Math.log1p(watchAverage) * 0.15;
        return { ...item, score };
      }

      const watchAverage = reelWatchAverage.get(item.id) ?? 0;
      const score =
        Math.log1p(item.reel.likesCount) * 0.5 +
        Math.log1p(item.reel.commentsCount) * 0.35 +
        Math.log1p(watchAverage) * 0.15;
      return { ...item, score };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return safeDateMs(b.createdAt) - safeDateMs(a.createdAt);
    });

export async function getHomeFeed(input: GetHomeFeedInput = {}): Promise<GetHomeFeedResult> {
  noStore();

  const limit = normalizeLimit(input.limit);
  const offset = normalizeOffset(input.offset);
  const seed = normalizeSeed(input.seed);
  const search = sanitizeSearch(input.search);
  const candidateLimit = Math.max((offset + limit) * CANDIDATE_MULTIPLIER, 40);

  try {
    const client = createFeedClient();
    const totalUsers = await resolveTotalUsers(client);

    const [postRows, reelRows] = await Promise.all([
      fetchPosts(client, candidateLimit, search),
      fetchReels(client, candidateLimit, search),
    ]);

    const authorIds = Array.from(
      new Set([...postRows.map((item) => item.user_id), ...reelRows.map((item) => item.author_id)])
    ).filter(Boolean);

    const profiles = await fetchProfiles(client, authorIds);
    const mixedItems: HomeFeedItem[] = [...toPostItems(postRows, profiles), ...toReelItems(reelRows, profiles)];

    const phase: FeedPhase = totalUsers < USER_THRESHOLD ? "global_firehose" : "engagement_algorithm";
    let ranked: HomeFeedItem[] = [];

    if (phase === "global_firehose") {
      ranked = rankFirehose(mixedItems, seed);
    } else {
      const postIds = mixedItems.filter((item): item is HomeFeedPostItem => item.kind === "post").map((item) => item.id);
      const reelIds = mixedItems.filter((item): item is HomeFeedReelItem => item.kind === "reel").map((item) => item.id);

      const [postWatchAverage, reelWatchAverage] = await Promise.all([
        fetchViewAverages(client, "post_id", postIds),
        fetchViewAverages(client, "reel_id", reelIds),
      ]);

      ranked = rankByEngagement(mixedItems, postWatchAverage, reelWatchAverage);
    }

    const pageItems = ranked.slice(offset, offset + limit);
    const hasMore = ranked.length > offset + limit;

    return {
      phase,
      totalUsers,
      threshold: USER_THRESHOLD,
      fetchedAt: new Date().toISOString(),
      seed,
      offset,
      nextOffset: hasMore ? offset + limit : null,
      hasMore,
      items: pageItems,
    };
  } catch {
    return {
      phase: "global_firehose",
      totalUsers: 0,
      threshold: USER_THRESHOLD,
      fetchedAt: new Date().toISOString(),
      seed: defaultSeed(),
      offset: 0,
      nextOffset: null,
      hasMore: false,
      items: [],
    };
  }
}
