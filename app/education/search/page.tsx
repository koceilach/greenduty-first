"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { PostCard } from "@/components/edu/PostCard";
import {
  getHomeFeed,
  type HomeFeedPostItem,
} from "@/app/education/actions/get-home-feed";
import { mapHomeFeedPostToEduFeedPost } from "@/lib/edu/home-feed-mapper";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";
import {
  Droplet,
  Globe,
  Leaf,
  Loader2,
  Search,
  Sprout,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── helpers ─────────────────────────────────────────── */

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const escapeIlike = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

const CATEGORIES = ["All", "Agronomy", "Climate", "Soil", "Water"] as const;

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
  status: string | null; accuracy: number | null; source_credibility: number | null;
  greenwashing_risk: string | null; risk_flags: string[] | null; sources: string[] | null;
  notes: string | null; verified_at: string | null;
};
type SearchRow = {
  id: string; user_id: string; title: string; body: string | null;
  media_type: string; media_urls: string[] | null; resource_url: string | null; hashtags: string[] | null;
  sources: string[] | null; status: string; created_at: string;
  edu_creators: CreatorJoin | CreatorJoin[] | null;
  edu_categories: CategoryJoin | CategoryJoin[] | null;
  edu_post_stats: StatsJoin | StatsJoin[] | null;
  edu_ai_verifications: AiJoin | AiJoin[] | null;
};

type UserRow = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

const buildPost = (row: SearchRow): EduFeedPost => {
  const creator = first(row.edu_creators);
  const cat = first(row.edu_categories);
  const stats = first(row.edu_post_stats);
  const ai = first(row.edu_ai_verifications);
  const catLabel = cat?.name ?? "Agronomy";
  const meta = mediaMap(row.media_type);
  const urls = (row.media_urls ?? []).filter(Boolean);
  const isCarousel = row.media_type?.toLowerCase() === "carousel";
  const isVideo = row.media_type?.toLowerCase() === "video";

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
    category: { label: catLabel as EduFeedPost["category"]["label"], badgeClass: categoryBadge(catLabel) },
    media: {
      type: (row.media_type?.toLowerCase() as EduFeedPost["media"]["type"]) ?? "image",
      label: meta.label,
      description: row.title,
      icon: meta.icon,
      gradientClass: meta.gradientClass,
      assetUrl: isCarousel ? undefined : urls[0],
      assetUrls: isCarousel ? urls : undefined,
      posterUrl: isVideo ? urls[1] ?? "/student2.jpg" : undefined,
      resourceUrl: row.resource_url,
    },
    caption: row.body ?? row.title,
    explanation: row.body ?? row.title,
    hashtags: (row.hashtags ?? []).length ? row.hashtags! : ["#GreenDuty"],
    sources: row.sources ?? ai?.sources ?? [],
    stats: { likes: String(stats?.likes ?? 0), comments: String(stats?.comments ?? 0) },
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

/* ── Component ───────────────────────────────────────── */

export default function EducationSearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [results, setResults] = useState<EduFeedPost[]>([]);
  const [userResults, setUserResults] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentPosts, setRecentPosts] = useState<EduFeedPost[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SELECT = `
    id, user_id, title, body, media_type, media_urls, resource_url, hashtags, sources, status, created_at,
    edu_creators:creator_id ( display_name, verified, avatar_url ),
    edu_categories:category_id ( name ),
    edu_post_stats:edu_post_stats ( likes, saves, comments ),
    edu_ai_verifications:edu_ai_verifications ( status, accuracy, source_credibility, greenwashing_risk, risk_flags, sources, notes, verified_at )
  `;

  /* Load recent / trending posts on mount */
  useEffect(() => {
    (async () => {
      const feedResult = await getHomeFeed({ limit: 12, offset: 0 });
      const feedPosts = feedResult.items
        .filter((item): item is HomeFeedPostItem => item.kind === "post")
        .map(mapHomeFeedPostToEduFeedPost)
        .slice(0, 6);
      setRecentPosts(feedPosts);
      setRecentLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Search posts + users */
  const search = useCallback(
    async (searchQuery: string, searchCategory: string) => {
      setLoading(true);
      setHasSearched(true);

      const trimmed = searchQuery.trim();

      try {
        const feedPromise = getHomeFeed({
          limit: 60,
          search: trimmed || undefined,
        });

        const usersPromise = trimmed
          ? (async () => {
              const pattern = `%${escapeIlike(trimmed)}%`;
              const [fullNameResult, usernameResult] = await Promise.all([
                supabase
                  .from("profiles")
                  .select("id, full_name, username, avatar_url")
                  .ilike("full_name", pattern)
                  .limit(5),
                supabase
                  .from("profiles")
                  .select("id, full_name, username, avatar_url")
                  .ilike("username", pattern)
                  .limit(5),
              ]);

              const merged = [
                ...(fullNameResult.data ?? []),
                ...(usernameResult.data ?? []),
              ] as UserRow[];
              const deduped = Array.from(
                new Map(merged.map((row) => [row.id, row])).values()
              ).slice(0, 5);

              return deduped;
            })()
          : Promise.resolve([] as UserRow[]);

        const [feedResult, users] = await Promise.all([feedPromise, usersPromise]);

        const rankedPosts = feedResult.items
          .filter((item): item is HomeFeedPostItem => item.kind === "post")
          .map(mapHomeFeedPostToEduFeedPost);

        const filtered = rankedPosts.filter(
          (post) =>
            searchCategory === "All" ||
            post.category.label.toLowerCase() === searchCategory.toLowerCase()
        );

        setResults(filtered);
        setUserResults(users);
      } catch {
        setResults([]);
        setUserResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* Debounced live search as user types */
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 2 || value.trim().length === 0) {
        search(value, category);
      }
    }, 350);
  };

  /* Category change triggers immediate search */
  useEffect(() => {
    if (hasSearched || category !== "All") {
      search(query, category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query, category);
  };

  const handleTopicClick = (topic: string) => {
    setQuery(topic);
    search(topic, category);
  };

  const clearSearch = () => {
    setQuery("");
    setHasSearched(false);
    setResults([]);
    setUserResults([]);
  };

  const trendingTopics = [
    "Regenerative farming",
    "Composting",
    "Soil microbiome",
    "Water harvesting",
    "Agroforestry",
    "Pollinator gardens",
    "Urban agriculture",
    "Climate adaptation",
  ];

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6">
        {/* Left sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="left" />
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Search bar */}
          <form onSubmit={handleSubmit} className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 rounded-[2rem] bg-white px-3 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow focus-within:ring-2 focus-within:ring-emerald-500/25 sm:px-4 sm:py-3">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search posts, topics, people..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                autoFocus
              />
              {query && (
                <button type="button" onClick={clearSearch} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full bg-emerald-500 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category filters */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:mb-6 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition ${
                  category === cat
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-slate-500 shadow-[0_8px_24px_rgb(0,0,0,0.04)] hover:text-emerald-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1E7F43]" />
            </div>
          ) : hasSearched ? (
            <>
              {/* User results */}
              {userResults.length > 0 && (
                <div className="mb-6 rounded-[2rem] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    <Users className="h-3.5 w-3.5" />
                    People
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                    {userResults.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2.5 transition hover:bg-emerald-50/70"
                      >
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#1E7F43]/10 text-xs font-semibold text-[#1E7F43]">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (user.full_name ?? "U").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {user.full_name ?? "User"}
                          </p>
                          {user.username && (
                            <p className="text-[11px] text-slate-400">@{user.username}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Post results */}
              {results.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                  <Search className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No posts found</p>
                  <p className="mt-1 text-xs">Try different keywords or categories</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-xs text-slate-400">
                    {results.length} post{results.length !== 1 ? "s" : ""} found
                  </p>
                  {results.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Landing state — trending topics + recent posts */
            <div className="space-y-6">
              {/* Trending topics */}
              <div className="rounded-[2rem] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <TrendingUp className="h-4 w-4 text-[#1E7F43]" />
                  Trending Topics
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trendingTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleTopicClick(topic)}
                      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent posts */}
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Sprout className="h-4 w-4 text-[#1E7F43]" />
                  Recent Posts
                </h2>
                {recentLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1E7F43]" />
                  </div>
                ) : recentPosts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No posts yet — be the first to share!</p>
                ) : (
                  <div className="space-y-6">
                    {recentPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="right" />
        </aside>
      </div>
      <div className="h-20 lg:hidden" />
      <MobileBottomNav />
    </div>
  );
}
