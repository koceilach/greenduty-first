"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Leaf,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { eduNavItems } from "@/lib/edu/feed";

type EduSidebarProps = {
  side: "left" | "right";
};

type SidebarProfile = {
  name: string;
  role: string;
  avatar: string;
  avatarUrl: string | null;
  posts: number;
  reels: number;
};

type TrendingItem = {
  id: string;
  label: string;
  href: string;
  score: number;
};

type EventItem = {
  id: string;
  title: string;
  startsAt: string;
};

const card =
  "rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]";
const touch =
  "transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]";

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const toReadableTopic = (raw: string) =>
  raw
    .replace(/^#/, "")
    .replace(/[_-]+/g, " ")
    .trim();

const formatEventDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Upcoming";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function EduSidebar({ side }: EduSidebarProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<SidebarProfile>({
    name: "Green Duty Learner",
    role: "User",
    avatar: "GD",
    avatarUrl: null,
    posts: 0,
    reels: 0,
  });
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingRight, setLoadingRight] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadRightSidebar = useCallback(async () => {
    setLoadingRight(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    const [
      profileResult,
      postCountResult,
      reelCountResult,
      topicsResult,
      categoriesResult,
      trendingPostsResult,
      trendingReelsResult,
      eventsResult,
    ] = await Promise.all([
      userId
        ? supabase
            .from("profiles")
            .select("full_name, role, avatar_url")
            .eq("id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
      userId
        ? supabase
            .from("edu_posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "published")
        : Promise.resolve({ count: 0, error: null } as const),
      userId
        ? supabase
            .from("edu_reels")
            .select("id", { count: "exact", head: true })
            .eq("author_id", userId)
        : Promise.resolve({ count: 0, error: null } as const),
      supabase
        .from("edu_posts")
        .select("hashtags")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("edu_categories").select("name").order("name"),
      supabase
        .from("edu_posts")
        .select("id,title,created_at,edu_post_stats(likes,comments)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("edu_reels")
        .select("id,caption,created_at,likes_count,comments_count")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("edu_events")
        .select("id,title,starts_at,status,created_at")
        .eq("status", "upcoming")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(4),
    ]);

    const displayName =
      profileResult.data?.full_name?.trim() ||
      userData.user?.user_metadata?.full_name ||
      "Green Duty Learner";
    const role =
      profileResult.data?.role?.toLowerCase().includes("expert") ? "Expert" : "User";
    setProfile({
      name: displayName,
      role,
      avatar: displayName.slice(0, 2).toUpperCase(),
      avatarUrl: profileResult.data?.avatar_url ?? null,
      posts: postCountResult.count ?? 0,
      reels: reelCountResult.count ?? 0,
    });

    const topicCounts = new Map<string, number>();
    for (const row of topicsResult.data ?? []) {
      for (const tag of row.hashtags ?? []) {
        const clean = toReadableTopic(String(tag || "")).toLowerCase();
        if (!clean) continue;
        topicCounts.set(clean, (topicCounts.get(clean) ?? 0) + 1);
      }
    }
    const rankedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => topic.replace(/\b\w/g, (c) => c.toUpperCase()));

    if (rankedTopics.length > 0) {
      setSuggestedTopics(rankedTopics);
    } else {
      setSuggestedTopics(
        (categoriesResult.data ?? []).map((row) => row.name).filter(Boolean).slice(0, 6)
      );
    }

    const postTrend: TrendingItem[] = ((trendingPostsResult.data ?? []) as Array<{
      id: string;
      title: string | null;
      created_at: string;
      edu_post_stats: { likes: number | null; comments: number | null } | { likes: number | null; comments: number | null }[] | null;
    }>).map((row) => {
      const stats = first(row.edu_post_stats);
      const likes = stats?.likes ?? 0;
      const comments = stats?.comments ?? 0;
      return {
        id: row.id,
        label: (row.title ?? "Untitled post").slice(0, 42),
        href: `/education/post/${row.id}`,
        score: likes * 2 + comments * 3,
      };
    });

    const reelTrend: TrendingItem[] = ((trendingReelsResult.data ?? []) as Array<{
      id: string;
      caption: string | null;
      created_at: string;
      likes_count: number | null;
      comments_count: number | null;
    }>).map((row) => {
      const likes = row.likes_count ?? 0;
      const comments = row.comments_count ?? 0;
      return {
        id: row.id,
        label: (row.caption ?? "Untitled reel").slice(0, 42),
        href: `/education/reels?reel=${row.id}`,
        score: likes * 2 + comments * 3,
      };
    });

    setTrendingItems(
      [...postTrend, ...reelTrend]
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    );

    if (!eventsResult.error) {
      setEvents(
        ((eventsResult.data ?? []) as Array<{ id: string; title: string; starts_at: string }>).map(
          (event) => ({
            id: event.id,
            title: event.title,
            startsAt: event.starts_at,
          })
        )
      );
    } else {
      setEvents([]);
    }

    setLoadingRight(false);
  }, []);

  const loadLeftSidebarPrivileges = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const { data: isAdminResult } = await supabase.rpc("is_platform_admin", {
      p_user_id: userId,
    });
    setIsAdmin(Boolean(isAdminResult));
  }, []);

  useEffect(() => {
    if (side !== "left") return;
    void loadLeftSidebarPrivileges();
  }, [loadLeftSidebarPrivileges, side]);

  useEffect(() => {
    if (side !== "right") return;

    void loadRightSidebar();

    const channel = supabase
      .channel("edu-sidebar-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_events",
        },
        () => {
          void loadRightSidebar();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRightSidebar, side]);

  const rightProfileSubtitle = useMemo(
    () => `${profile.role} - ${profile.posts} posts / ${profile.reels} reels`,
    [profile.posts, profile.reels, profile.role]
  );

  const leftNavItems = useMemo(() => {
    if (!isAdmin) return eduNavItems;
    return [
      ...eduNavItems,
      {
        label: "Moderation",
        href: "/education/moderation",
        icon: ShieldAlert,
      },
    ];
  }, [isAdmin]);

  if (side === "left") {
    return (
      <aside className="sticky top-28 hidden h-fit space-y-4 lg:block">
        <section className={card}>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Image src="/logo.png" alt="Green Duty" width={28} height={28} className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">GreenDuty EDU</p>
              <p className="text-xs text-slate-500">Navigate your learning</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {leftNavItems.map((item) => {
              const active =
                item.href === "/education"
                  ? pathname === "/education"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold ${touch} ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${active ? "text-emerald-700" : "text-gray-400"}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className={card}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-gradient-to-r from-emerald-100/80 to-transparent px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            AI Verified Feed
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Posts and reels are quality-checked for credibility, learning value, and environmental safety.
          </p>
        </section>
      </aside>
    );
  }

  return (
    <aside className="sticky top-28 hidden h-fit space-y-4 xl:block">
      <section className={card}>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              profile.avatar
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
            <p className="truncate text-xs text-slate-500">{rightProfileSubtitle}</p>
          </div>
        </div>
        <Link
          href="/profile"
          className={`mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-white ${touch}`}
        >
          Open profile
        </Link>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Suggested topics
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {loadingRight ? (
            <span className="text-xs text-slate-500">Loading topics...</span>
          ) : suggestedTopics.length ? (
            suggestedTopics.map((topic) => (
              <Link
                key={topic}
                href={`/education/search?q=${encodeURIComponent(topic)}`}
                className={`inline-flex h-10 items-center rounded-full bg-gray-50 px-3 text-xs font-semibold text-gray-700 ${touch}`}
              >
                {topic}
              </Link>
            ))
          ) : (
            <span className="text-xs text-slate-500">No topic data yet.</span>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Leaf className="h-4 w-4 text-emerald-600" />
          Trending EDU
        </div>
        <div className="mt-3 space-y-2">
          {loadingRight ? (
            <p className="text-xs text-slate-500">Loading trends...</p>
          ) : trendingItems.length ? (
            trendingItems.map((trend) => (
              <Link
                key={trend.id}
                href={trend.href}
                className={`flex items-center justify-between rounded-full bg-gray-50 px-3 py-2 ${touch}`}
              >
                <span className="truncate text-xs font-semibold text-slate-700">{trend.label}</span>
                <Compass className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              </Link>
            ))
          ) : (
            <p className="text-xs text-slate-500">No trend data yet.</p>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          Upcoming events
        </div>
        <div className="mt-3 space-y-2">
          {loadingRight ? (
            <p className="text-xs text-slate-500">Loading events...</p>
          ) : events.length ? (
            events.map((event) => (
              <div key={event.id} className={`rounded-xl bg-gray-50 p-3 ${touch}`}>
                <p className="text-xs font-semibold text-slate-700">{event.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatEventDate(event.startsAt)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-slate-500">
              No upcoming events yet.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
