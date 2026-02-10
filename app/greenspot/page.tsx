"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { greenspotClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  MapPin,
  Sparkles,
  Trees,
  Radar,
  ArrowUpRight,
  Leaf,
  BadgeCheck,
  BarChart3,
  Zap,
  Star,
  Bell,
  CalendarCheck,
  Droplets,
  Scissors,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
});

const actionCards = [
  {
    title: "Report a GreenSpot",
    description: "Pin locations that need trees, gardens, or restoration.",
    metric: 41,
    icon: MapPin,
    cta: "Report Area",
    href: "/greenspot/report",
  },
  {
    title: "Explore Community Map",
    description: "Discover reported zones and verified planting missions.",
    metric: 58,
    icon: Radar,
    cta: "Explore Map",
    href: "/greenspot#map",
  },
  {
    title: "Track Impact",
    description: "See how each report turns into real green action.",
    metric: 72,
    icon: BarChart3,
    cta: "View Impact",
    href: "/greenspot#impact",
  },
  {
    title: "Care Reminders",
    description: "Stay on top of watering, pruning, and seasonal care tasks.",
    metric: 66,
    icon: Bell,
    cta: "Open Care",
    href: "/greenspot/care",
  },
  {
    title: "Plant Health Check",
    description: "Upload a photo to detect plant stress and get advice.",
    metric: 49,
    icon: Leaf,
    cta: "Check Health",
    href: "/greenspot/health",
  },
];

const stats = [
  { label: "GreenSpots Submitted", value: 12480 },
  { label: "Verified Planting Zones", value: 3760 },
  { label: "Trees Planned", value: 98200 },
  { label: "Community Partners", value: 220 },
];

const impactStatMeta = [
  { icon: MapPin, delta: "+18%", context: "monthly submissions", spark: [42, 58, 76, 92] },
  { icon: BadgeCheck, delta: "+11%", context: "verification consistency", spark: [36, 52, 68, 84] },
  { icon: Trees, delta: "+24%", context: "planned canopy coverage", spark: [48, 66, 82, 96] },
  { icon: Zap, delta: "+9%", context: "partner activation", spark: [30, 46, 63, 77] },
];

const progress = [
  { label: "Soil readiness", value: 78 },
  { label: "Water access", value: 62 },
  { label: "Local approval", value: 85 },
];

type RecentReportRow = {
  id: string;
  user_id: string;
  area: string;
  lat: number;
  lng: number;
  waste_type: string;
  notes: string;
  user_name: string;
  user_avatar?: string | null;
  verified_count: number;
  status: string;
  image_url?: string | null;
  created_at?: string;
};

type RecentReportsApiResponse = {
  reports?: RecentReportRow[];
  error?: string;
};

type RecentReportCard = {
  id: string;
  title: string;
  location: string;
  type: string;
  status: string;
  notes: string;
  lat: number;
  lng: number;
  createdAt: string;
  imageUrl: string | null;
  verifiedCount: number;
  reporter: {
    name: string;
    avatar: string;
    avatarUrl: string | null;
    rating: number;
    count: number;
    verified: boolean;
  };
};

const stripTrailingCoordinates = (value: string) =>
  value.replace(/\s*\(-?\d{1,3}(?:\.\d+)?,\s*-?\d{1,3}(?:\.\d+)?\)\s*$/, "").trim();

const buildReporterInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "GS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const toRecentReportCard = (report: RecentReportRow): RecentReportCard => {
  const safeLat = Number(report.lat);
  const safeLng = Number(report.lng);
  const hasCoordinates = Number.isFinite(safeLat) && Number.isFinite(safeLng);
  const normalizedArea = report.area?.trim() || "Reported area";
  const title = stripTrailingCoordinates(normalizedArea) || normalizedArea;
  const location = hasCoordinates
    ? `GPS ${safeLat.toFixed(4)}, ${safeLng.toFixed(4)}`
    : normalizedArea;
  const reporterName = report.user_name?.trim() || "Community Member";
  const verifiedCount = Number.isFinite(Number(report.verified_count))
    ? Number(report.verified_count)
    : 0;

  return {
    id: report.id,
    title,
    location,
    type: report.waste_type?.trim() || "General",
    status: report.status?.trim() || "Pending",
    notes: report.notes?.trim() || "",
    lat: hasCoordinates ? safeLat : 36.7538,
    lng: hasCoordinates ? safeLng : 3.0588,
    createdAt: report.created_at || new Date().toISOString(),
    imageUrl: report.image_url ?? null,
    verifiedCount,
    reporter: {
      name: reporterName,
      avatar: buildReporterInitials(reporterName),
      avatarUrl: report.user_avatar ?? null,
      rating: verifiedCount > 0 ? 4.7 : 4.5,
      count: Math.max(verifiedCount, 1),
      verified:
        report.status?.trim().toLowerCase() === "verified" || verifiedCount > 0,
    },
  };
};

function useCountUp(target: number, inView: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progressValue = Math.min((now - startTime) / duration, 1);
      const next = Math.floor(start + (target - start) * progressValue);
      setValue(next);
      if (progressValue < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, inView]);

  return value;
}

function StatCard({
  label,
  value,
  inView,
  index,
}: {
  label: string;
  value: number;
  inView: boolean;
  index: number;
}) {
  const count = useCountUp(value, inView);
  const meta = impactStatMeta[index % impactStatMeta.length];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[24px] border border-white/15 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.3)] light:border-slate-300/65 light:bg-white/90 dark:border-white/15 dark:bg-white/5 green:border-white/15 green:bg-white/5"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl light:bg-emerald-300/40" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/55 light:text-slate-600 dark:text-white/55 green:text-white/55">
            {label}
          </p>
          <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 light:border-emerald-400/35 light:bg-emerald-100 light:text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-500/15 dark:text-emerald-100 green:border-emerald-300/30 green:bg-emerald-500/15 green:text-emerald-100">
            {meta.delta}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-3xl font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
            {count.toLocaleString()}
          </p>
          <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/15 p-2 light:border-emerald-400/35 light:bg-emerald-100 dark:border-emerald-300/35 dark:bg-emerald-500/15 green:border-emerald-300/35 green:bg-emerald-500/15">
            <Icon className="h-4 w-4 text-emerald-200 light:text-emerald-700 dark:text-emerald-200 green:text-emerald-200" />
          </div>
        </div>

        <p className="mt-1 text-xs text-white/60 light:text-slate-600 dark:text-white/60 green:text-white/60">
          {meta.context}
        </p>

        <div className="mt-4 flex h-9 items-end gap-1.5">
          {meta.spark.map((point, sparkIndex) => (
            <motion.span
              key={`${label}-${sparkIndex}`}
              initial={{ height: 6, opacity: 0.35 }}
              whileInView={{ height: `${point}%`, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 + sparkIndex * 0.06, ease: "easeOut" }}
              className="w-2 rounded-full bg-gradient-to-t from-emerald-500/40 to-emerald-300/90 light:from-emerald-400/55 light:to-emerald-600"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

type CareTaskRow = {
  id: string;
  plant_name: string;
  task_type: string;
  due_at: string;
  description: string;
  tips?: string | null;
  status: "not_done" | "done";
  photo_url?: string | null;
};

const taskIcon = (type: string) => {
  if (type === "watering") return Droplets;
  if (type === "pruning") return Scissors;
  if (type === "fertilizing") return CalendarCheck;
  return Leaf;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export default function GreenSpotPage() {
  const statsRef = useRef<HTMLDivElement | null>(null);
  const careRef = useRef<HTMLDivElement | null>(null);
  const statsInView = useInView(statsRef, { margin: "-100px", once: true });
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [ratingTarget, setRatingTarget] = useState<{
    name: string;
  } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [reporterStats, setReporterStats] = useState<Record<string, { rating: number; count: number }>>({});
  const [recentReports, setRecentReports] = useState<RecentReportCard[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [careTasks, setCareTasks] = useState<CareTaskRow[]>([]);
  const [careLoading, setCareLoading] = useState(false);
  const [careError, setCareError] = useState("");
  const [careTab, setCareTab] = useState<"today" | "upcoming" | "completed">("today");
  const [dueTasks, setDueTasks] = useState<CareTaskRow[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);


  useEffect(() => {
    const storedRatings = JSON.parse(localStorage.getItem("gd_reporter_ratings") ?? "{}") as Record<
      string,
      { rating: number; comment: string }
    >;
    const storedStats = JSON.parse(localStorage.getItem("gd_reporter_stats") ?? "{}") as Record<
      string,
      { rating: number; count: number }
    >;
    setRatings(storedRatings);
    setReporterStats(storedStats);
  }, []);

  useEffect(() => {
    const loadRecentReports = async () => {
      setReportsLoading(true);
      setReportsError("");
      try {
        const response = await fetch("/api/greenspot/reports?public=1", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | RecentReportsApiResponse
          | null;
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load recent reports.");
        }

        const parsedReports = Array.isArray(payload?.reports)
          ? payload.reports.map((report) => toRecentReportCard(report))
          : [];
        parsedReports.sort((a, b) => {
          const left = new Date(b.createdAt).getTime();
          const right = new Date(a.createdAt).getTime();
          return left - right;
        });
        setRecentReports(parsedReports);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load recent reports.";
        setReportsError(message);
        setRecentReports([]);
      } finally {
        setReportsLoading(false);
      }
    };

    void loadRecentReports();
  }, []);

  const scrollToCare = () => {
    const target = careRef.current ?? document.getElementById("care");
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#care") {
        setTimeout(scrollToCare, 80);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      setCareLoading(true);
      setCareError("");
      const userId = user?.id;
      if (!userId) {
        setCareLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/greenspot/care");
        const data = await res.json();
        if (!res.ok) {
          setCareError(data.error || "Failed to load care tasks.");
          setCareLoading(false);
          return;
        }
        setCareTasks(data.tasks || []);

        const dueRes = await fetch("/api/greenspot/care/due");
        const dueData = await dueRes.json();
        if (dueRes.ok) {
          setDueTasks(dueData.tasks || []);
          if (remindersEnabled && "Notification" in window && Notification.permission === "granted") {
            dueData.tasks?.forEach((task: CareTaskRow) => {
              new Notification("GreenSpot Care Reminder", {
                body: `${task.plant_name}: ${task.task_type} due today.`,
              });
            });
          }
        }
      } catch {
        setCareError("Failed to load care tasks.");
      } finally {
        setCareLoading(false);
      }
    };

    loadTasks();
  }, [remindersEnabled, user?.id]);


  const today = new Date();
  const todayTasks = careTasks.filter((task) => {
    const due = new Date(task.due_at);
    return task.status !== "done" && due.toDateString() === today.toDateString();
  });
  const upcomingTasks = careTasks.filter((task) => {
    const due = new Date(task.due_at);
    return task.status !== "done" && due > today;
  });
  const completedTasks = careTasks.filter((task) => task.status === "done");

  const visibleTasks =
    careTab === "today" ? todayTasks : careTab === "upcoming" ? upcomingTasks : completedTasks;

  const nextTip = upcomingTasks[0]?.tips || "Keep soil moist and monitor sun exposure.";
  const totalCareTasks = careTasks.length;
  const completionRate = totalCareTasks ? Math.round((completedTasks.length / totalCareTasks) * 100) : 0;
  const dueSoonCount = upcomingTasks.filter((task) => {
    const due = new Date(task.due_at).getTime();
    const delta = due - today.getTime();
    return delta > 0 && delta <= 3 * 24 * 60 * 60 * 1000;
  }).length;
  const verificationRate = Math.round((stats[1].value / Math.max(stats[0].value, 1)) * 100);
  const treesPerZone = Math.round(stats[2].value / Math.max(stats[1].value, 1));
  const treesPerPartner = Math.round(stats[2].value / Math.max(stats[3].value, 1));
  const visibleRecentReports = recentReports.slice(0, 6);
  const featuredReport = visibleRecentReports[0] ?? null;
  const mapReports = recentReports.map((report) => ({
    id: report.id,
    lat: report.lat,
    lng: report.lng,
    waste_type: report.type,
    notes: report.notes,
    image_url: report.imageUrl,
    user_name: report.reporter.name,
    user_avatar: report.reporter.avatarUrl,
    verified_count: report.verifiedCount,
    status: report.status,
    created_at: report.createdAt,
  }));
  const totalCommunityReports = recentReports.length;
  const activeMissions = recentReports.filter(
    (report) => report.status.toLowerCase() !== "rejected"
  ).length;

  const contributorMap = new Map<
    string,
    { name: string; reports: number; verifiedCount: number }
  >();
  recentReports.forEach((report) => {
    const current = contributorMap.get(report.reporter.name) ?? {
      name: report.reporter.name,
      reports: 0,
      verifiedCount: 0,
    };
    current.reports += 1;
    current.verifiedCount += report.verifiedCount;
    contributorMap.set(report.reporter.name, current);
  });

  const communityLeaders = Array.from(contributorMap.values())
    .map((entry) => ({
      ...entry,
      points: entry.reports * 10 + entry.verifiedCount * 6,
    }))
    .sort((left, right) => right.points - left.points);

  const contributorsOnline = communityLeaders.length;
  const verifiedMentors = communityLeaders.filter(
    (entry) => entry.verifiedCount > 0
  ).length;

  const categoryCounts = new Map<string, number>();
  recentReports.forEach((report) => {
    const current = categoryCounts.get(report.type) ?? 0;
    categoryCounts.set(report.type, current + 1);
  });
  const communityBadges =
    Array.from(categoryCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([type]) => `${type} Crew`) || [];

  const displayedCommunityBadges =
    communityBadges.length > 0
      ? communityBadges
      : ["Seed Starter", "Canopy Builder", "Soil Guardian"];

  const boardEntries = communityLeaders.slice(0, 3).map((entry) => ({
    name: entry.name,
    badge: buildReporterInitials(entry.name),
    score: `+${entry.points} points`,
  }));

  const unlockStages = [
    { label: "Seed Starter", threshold: 5 },
    { label: "Canopy Builder", threshold: 15 },
    { label: "Soil Guardian", threshold: 30 },
    { label: "District Champion", threshold: 60 },
  ] as const;

  const nextStage = unlockStages.find((stage) => totalCommunityReports < stage.threshold);
  const previousThreshold = nextStage
    ? unlockStages[Math.max(unlockStages.indexOf(nextStage) - 1, 0)]?.threshold ?? 0
    : unlockStages[unlockStages.length - 1]?.threshold ?? 0;
  const nextThreshold = nextStage?.threshold ?? previousThreshold;
  const nextUnlockLabel = nextStage?.label ?? "District Champion";
  const missionProgress = nextStage
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((totalCommunityReports - previousThreshold) /
              Math.max(nextThreshold - previousThreshold, 1)) *
              100
          )
        )
      )
    : 100;


  const markTaskDone = async (task: CareTaskRow, file?: File | null) => {
    try {
      let photoUrl: string | null = null;
      const userId = user?.id;
      if (file && userId) {
        const filePath = `${userId}/${task.id}-${file.name}`;
        const { error: uploadError } = await greenspotClient.storage
          .from("greenspot-care")
          .upload(filePath, file);
        if (!uploadError) {
          const { data } = greenspotClient.storage
            .from("greenspot-care")
            .getPublicUrl(filePath);
          photoUrl = data.publicUrl;
        }
      }

      await fetch(`/api/greenspot/care/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done", photoUrl }),
      });

      setCareTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: "done", photo_url: photoUrl ?? item.photo_url } : item
        )
      );
    } catch {
      setCareError("Failed to update care task.");
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <main className="greenspot-page min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(239,68,68,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white light:text-slate-900 dark:text-white green:text-white">
      <Navbar />
      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-[#0b0f12] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Rate reporter</p>
                <h3 className="text-xl font-semibold">{ratingTarget.name}</h3>
              </div>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  setRatingTarget(null);
                  setRatingSubmitted(false);
                  setRatingValue(0);
                  setRatingComment("");
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRatingValue(value)}
                  className="rounded-full bg-white/5 border border-white/10 p-2 hover:bg-white/10 transition"
                  aria-label={`Rate ${value} star`}
                >
                  <Star className={`w-5 h-5 ${ratingValue >= value ? "text-amber-300" : "text-white/30"}`} />
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-xs text-white/60">Comment</label>
              <textarea
                rows={4}
                value={ratingComment}
                onChange={(event) => setRatingComment(event.target.value)}
                placeholder="Share feedback about this reporter..."
                className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={() => {
                  if (!ratingTarget) return;
                  const updatedRatings = {
                    ...ratings,
                    [ratingTarget.name]: { rating: ratingValue, comment: ratingComment },
                  };
                  const previous = reporterStats[ratingTarget.name];
                  const nextCount = (previous?.count ?? 0) + 1;
                  const nextRating = previous
                    ? Math.round(((previous.rating * previous.count + ratingValue) / nextCount) * 10) / 10
                    : ratingValue;
                  const updatedStats = {
                    ...reporterStats,
                    [ratingTarget.name]: { rating: nextRating, count: nextCount },
                  };
                  localStorage.setItem("gd_reporter_ratings", JSON.stringify(updatedRatings));
                  localStorage.setItem("gd_reporter_stats", JSON.stringify(updatedStats));
                  setRatings(updatedRatings);
                  setReporterStats(updatedStats);
                  setRatingSubmitted(true);
                }}
              >
                Submit rating
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  setRatingTarget(null);
                  setRatingSubmitted(false);
                  setRatingValue(0);
                  setRatingComment("");
                }}
              >
                Cancel
              </Button>
            </div>

            {ratingSubmitted && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Thanks! Your rating has been recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-12 left-10 h-16 w-16 rounded-full bg-emerald-300/20 blur-xl"
            animate={{ y: [0, -16, 0], x: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-16 right-20 h-16 w-16 rounded-full bg-emerald-400/30"
            animate={{ y: [0, -12, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-24 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border border-dashed border-emerald-400/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-40 right-32 h-32 w-32 rounded-[40%] bg-emerald-400/20 blur-2xl"
            animate={{ rotate: [0, 12, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <img
                    src="/logo.png"
                    alt="GreenDuty logo"
                    width={800}
                    height={800}
                    className="h-10 w-10 object-contain"
                  />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-emerald-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                GreenSpot Reporter
              </motion.div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
                {t("greenspot.hero.title")}
                <span className="block text-emerald-300">{t("greenspot.hero.subtitle")}</span>
              </h1>
              <p className="mt-5 text-lg text-white/70 max-w-2xl">
                {t("greenspot.hero.desc")}
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="group"
                  >
                    <div className="rounded-full bg-gradient-to-r from-emerald-300/40 via-white/40 to-teal-200/40 p-[1px] shadow-[0_18px_40px_rgba(15,118,110,0.25)]">
                      <Button
                        asChild
                        size="lg"
                        className="rounded-full border border-white/10 bg-black/40 px-8 text-emerald-100 backdrop-blur transition hover:bg-black/30"
                      >
                        <Link href="/greenspot/login" className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                          Login
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="group"
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-200 px-8 text-emerald-950 shadow-[0_20px_40px_rgba(16,185,129,0.35)] transition hover:brightness-105"
                    >
                      <Link href="/greenspot/register" className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                        Register
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-300" />
                  AI-verified submissions
                </div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-300" />
                  Community-led planting
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-300" />
                  Real-time impact tracking
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="relative group"
              id="map"
              whileHover={{ y: -6 }}
            >
              <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-0 blur-2xl transition duration-500 group-hover:opacity-100" />
              <div className="relative rounded-[28px] bg-white/5 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-6 backdrop-blur-[10px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Interactive Map</p>
                    <h2 className="text-2xl font-semibold mt-1">Algeria GreenSpot Grid</h2>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                    <MapPin className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-black/40 p-0 relative overflow-hidden">
                  <div className="relative h-56 sm:h-60">
                    <MapComponent
                      reports={mapReports}
                      mapTheme="dark"
                      onToggleTheme={() => {}}
                      heatmapEnabled={false}
                      showControls={false}
                      mapId="greenspot-hero-map"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  {progress.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-emerald-500/20 bg-black/30 p-4">
                      <p className="text-xs text-white/60">{item.label}</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-emerald-950/60">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-2 rounded-full bg-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-emerald-500/20 bg-black/30 p-4 flex items-center gap-3">
                    <Trees className="w-5 h-5 text-emerald-300" />
                    <div>
                      <p className="text-xs text-white/60">Planting readiness</p>
                      <p className="text-sm font-medium text-emerald-300">High</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true }}
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Action Cards</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">Report. Explore. Track.</h2>
            </div>
            <div className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
              EcoMotion UI
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {actionCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.12 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, scale: 1.005 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
              >
                <motion.div
                  className="absolute inset-0 opacity-60"
                  animate={{ opacity: [0.55, 0.7, 0.55] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div
                    className="absolute -top-8 right-6 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl"
                    animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-3xl"
                    animate={{ y: [0, 8, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)]" />
                </motion.div>

                <div className="relative">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      GreenSpot
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      {card.cta}
                    </span>
                  </div>

                  <motion.div
                    className="mt-8"
                    animate={{ y: [0, -1, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center justify-between">
                      <motion.div
                        className="text-4xl font-semibold text-white"
                        animate={{ opacity: [0.92, 1, 0.92] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {card.metric}%
                      </motion.div>
                      <div className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition group-hover:scale-105">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">
                      {card.title}
                    </p>
                    <p className="mt-4 text-sm text-white/70 leading-relaxed">
                      {card.description}
                    </p>
                  </motion.div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 p-2">
                        <card.icon className="h-4 w-4 text-emerald-300" />
                      </div>
                      <span>Eco motion</span>
                    </div>
                    <Link
                      href={card.href ?? "/greenspot/report"}
                      className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200 transition group-hover:text-emerald-100"
                    >
                      View
                    </Link>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/30 bg-emerald-400/30 text-[9px] font-semibold text-emerald-100">
                            GS
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/30 bg-emerald-300/20 text-[9px] font-semibold text-emerald-100">
                            EC
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/30 bg-emerald-200/20 text-[9px] font-semibold text-emerald-100">
                            TR
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/55">
                          Active Cluster
                        </span>
                      </div>
                      <motion.span
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200"
                        animate={{ opacity: [0.75, 1, 0.75] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        Live
                      </motion.span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[68, 84, 57].map((value, barIndex) => (
                        <div key={barIndex} className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-emerald-900/70">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${value}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.1, ease: "easeOut", delay: barIndex * 0.08 }}
                              className="h-1.5 rounded-full bg-emerald-400"
                            />
                          </div>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-white/45">
                            {barIndex === 0 ? "Pin" : barIndex === 1 ? "Care" : "Verify"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reports */}
      <section
        id="reports"
        className="py-16 bg-[#0a0d10] light:bg-[#edf4f0] dark:bg-[#0a0d10] green:bg-[#0a1713] scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Recent Reports</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">{t("greenspot.reports.title")}</h2>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-emerald-300/25 bg-white/5 text-emerald-100 hover:bg-emerald-500/10"
            >
              <Link href="/greenspot/reported-green">
                {t("greenspot.reports.button")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="space-y-6">
              {reportsLoading ? (
                <div className="rounded-3xl border border-emerald-400/20 bg-black/30 px-5 py-4 text-sm text-white/70">
                  Loading recent reports...
                </div>
              ) : null}

              {!reportsLoading && reportsError ? (
                <div className="rounded-3xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                  {reportsError}
                </div>
              ) : null}

              {!reportsLoading && !reportsError && visibleRecentReports.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/20 bg-black/30 px-5 py-4 text-sm text-white/70">
                  No community reports yet. Submit one from Reported Green to populate this feed.
                </div>
              ) : null}

              {!reportsLoading &&
                visibleRecentReports.map((report) => (
                  <motion.article
                    key={report.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    viewport={{ once: true }}
                    whileHover={{ y: -3 }}
                    className="group relative overflow-hidden rounded-[30px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-black/20 to-transparent p-6 shadow-[0_22px_55px_rgba(0,0,0,0.4)]"
                  >
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
                      <div className="absolute bottom-0 left-0 h-24 w-40 bg-gradient-to-r from-emerald-500/10 to-transparent" />
                    </div>

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-emerald-200">
                            <Sparkles className="h-3 w-3" />
                            {report.type}
                          </p>
                          <h3 className="mt-3 text-xl font-semibold text-white">{report.title}</h3>
                          <p className="mt-1 text-sm text-white/65">{report.location}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          {report.status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Report ID</p>
                          <p className="mt-1 text-sm font-medium text-white/85">{report.id}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Community Trust</p>
                          <p className="mt-1 text-sm font-medium text-emerald-200">
                            {Math.round((reporterStats[report.reporter.name]?.rating ?? report.reporter.rating) * 20)}%
                          </p>
                        </div>
                      </div>

                      {report.notes ? (
                        <p className="mt-4 text-sm text-white/70">{report.notes}</p>
                      ) : null}

                      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {report.reporter.avatarUrl ? (
                            <img
                              src={report.reporter.avatarUrl}
                              alt={`${report.reporter.name} avatar`}
                              className="h-12 w-12 rounded-2xl border border-emerald-400/20 object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-200 flex items-center justify-center font-semibold border border-emerald-400/20">
                              {report.reporter.avatar}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{report.reporter.name}</p>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              {report.reporter.verified && (
                                <span className="inline-flex items-center gap-1 text-emerald-300">
                                  <BadgeCheck className="w-3.5 h-3.5" />
                                  ID verified
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-300" />
                                {reporterStats[report.reporter.name]?.rating ?? report.reporter.rating} (
                                {reporterStats[report.reporter.name]?.count ?? report.reporter.count})
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          className="border-emerald-300/25 bg-white/5 text-emerald-100 hover:bg-emerald-500/10"
                        >
                          <Link href={`/greenspot/reported-green?focus=${encodeURIComponent(report.id)}`}>
                            View details
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                ))}
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-black/20 to-transparent p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
                <div className="absolute -left-10 bottom-0 h-28 w-44 bg-gradient-to-r from-emerald-500/10 to-transparent" />
              </div>

              <div className="relative">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">{t("greenspot.selected")}</p>
                {featuredReport ? (
                  <>
                    <h3 className="mt-3 text-2xl font-semibold text-white">{featuredReport.title}</h3>
                    <p className="text-sm text-white/60 mt-2">{featuredReport.location}</p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Status</p>
                        <p className="mt-1 text-sm font-medium text-emerald-200">{featuredReport.status}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Trust Score</p>
                        <p className="mt-1 text-sm font-medium text-white/85">
                          {Math.round(
                            (reporterStats[featuredReport.reporter.name]?.rating ??
                              featuredReport.reporter.rating) * 20
                          )}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-black/40 p-5 border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        {featuredReport.reporter.avatarUrl ? (
                          <img
                            src={featuredReport.reporter.avatarUrl}
                            alt={`${featuredReport.reporter.name} avatar`}
                            className="h-12 w-12 rounded-2xl border border-emerald-400/20 object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-200 flex items-center justify-center font-semibold border border-emerald-400/20">
                            {featuredReport.reporter.avatar}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{featuredReport.reporter.name}</p>
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            {featuredReport.reporter.verified && (
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <BadgeCheck className="w-3.5 h-3.5" />
                                ID verified
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-300" />
                              {reporterStats[featuredReport.reporter.name]?.rating ??
                                featuredReport.reporter.rating} (
                              {reporterStats[featuredReport.reporter.name]?.count ??
                                featuredReport.reporter.count})
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="mt-4 w-full border-emerald-300/25 bg-white/5 text-emerald-100 hover:bg-emerald-500/10"
                      >
                        <Link href={`/greenspot/reported-green?focus=${encodeURIComponent(featuredReport.id)}`}>
                          Open on map
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/40 p-4">
                      <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        Community note
                      </p>
                      <p className="text-sm mt-2 text-white/80">
                        {featuredReport.notes ||
                          "Community members flagged this area and are waiting for coordinated action."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm text-white/75">
                    {reportsLoading
                      ? "Loading featured report..."
                      : reportsError
                        ? "Unable to load featured report right now."
                        : "No reports available yet. Submit one from Reported Green to populate this section."}
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="relative py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 -right-12 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              viewport={{ once: true }}
              className="relative"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Community</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">
                {t("greenspot.community.title")}
              </h2>
              <p className="mt-4 text-white/70">
                Build momentum with local teams, verified mentors, and weekly impact challenges.
                {` ${contributorsOnline} active contributors are tracking ${activeMissions} missions right now.`}
              </p>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Contributors online", value: contributorsOnline.toString() },
                  { label: "Active missions", value: activeMissions.toString() },
                  { label: "Verified mentors", value: verifiedMentors.toString() },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-emerald-400/20 bg-black/30 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-emerald-200">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {displayedCommunityBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                  >
                    <Leaf className="w-4 h-4" />
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="border border-emerald-300/50 bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:from-emerald-300 hover:to-emerald-400 light:border-emerald-500/35 dark:text-emerald-950 green:text-emerald-950"
                >
                  <Link href="/greenspot/report">
                    {t("greenspot.community.add")}
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 light:border-slate-300/60 light:bg-white/85 light:text-slate-900 light:hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white green:border-emerald-300/35 green:bg-emerald-500/10 green:text-emerald-100"
                >
                  <Link href="/greenspot/reported-green">View Community Map</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-[30px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-black/25 to-transparent p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-8 right-4 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
                <div className="absolute bottom-0 left-0 h-24 w-36 bg-gradient-to-r from-emerald-500/15 to-transparent" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Community Pulse</p>
                  <h3 className="text-xl font-semibold mt-1 text-white">Weekly Mission Board</h3>
                </div>
                <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                  <Trees className="w-6 h-6 text-emerald-300" />
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-black/40 p-5">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{`Next unlock: ${nextUnlockLabel}`}</span>
                  <span>{`${missionProgress}%`}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-emerald-950/70">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${missionProgress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-2 rounded-full bg-emerald-400"
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {boardEntries.length > 0 ? (
                    boardEntries.map((entry, idx) => (
                      <motion.div
                        key={entry.name}
                        initial={{ opacity: 0, x: 8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: idx * 0.08, ease: "easeOut" }}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/15 text-[10px] font-semibold text-emerald-200">
                            {entry.badge}
                          </div>
                          <p className="text-sm text-white/85">{entry.name}</p>
                        </div>
                        <p className="text-xs text-emerald-200">{entry.score}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm text-white/70">
                      No leaderboard data yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/40 p-4">
                <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("greenspot.community.empty")}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Report a location now to trigger the next celebration and help your district climb the board.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Watering & Care Reminder System */}
      <section id="care" ref={careRef} className="py-20 bg-[#0a0d10] light:bg-[#edf4f0] dark:bg-[#0a0d10] green:bg-[#0a1713] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[38px] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-black/35 to-emerald-950/35 p-6 sm:p-8 shadow-[0_28px_70px_rgba(0,0,0,0.45)] light:border-slate-300/70 light:from-emerald-100/65 light:via-white/95 light:to-cyan-100/60 dark:from-emerald-500/10 dark:via-black/35 dark:to-emerald-950/35 green:from-emerald-500/10 green:via-black/35 green:to-emerald-950/35"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-1/4 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl light:bg-emerald-300/30" />
              <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl light:bg-cyan-200/45" />
              <div className="absolute left-6 top-6 h-[1px] w-24 bg-gradient-to-r from-emerald-300/70 to-transparent light:from-emerald-500/60" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300 light:text-emerald-700 dark:text-emerald-300 green:text-emerald-300">
                    Watering & Care Reminder System
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold sm:text-4xl text-white light:text-slate-900 dark:text-white green:text-white">
                    Care cockpit for every submitted GreenSpot.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-white/70 light:text-slate-700 dark:text-white/70 green:text-white/70">
                    Manage daily plant care with a calmer workflow: due tasks, quick proof uploads,
                    and a live completion pulse for your district.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { label: "Due today", value: dueTasks.length },
                      { label: "Upcoming", value: upcomingTasks.length },
                      { label: "Completed", value: completedTasks.length },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/85 light:border-slate-300/70 light:bg-white/90 light:text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-white/85 green:border-white/15 green:bg-white/10 green:text-white/85"
                      >
                        <span className="text-emerald-300 light:text-emerald-700 dark:text-emerald-300 green:text-emerald-300">
                          {item.value}
                        </span>
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10 light:border-slate-300/70 light:bg-white/90 light:text-slate-900 light:hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white green:border-emerald-300/35 green:bg-emerald-500/10 green:text-emerald-100"
                    onClick={() => {
                      if ("Notification" in window) {
                        Notification.requestPermission().then((permission) => {
                          if (permission === "granted") setRemindersEnabled(true);
                        });
                      }
                    }}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Enable reminders
                  </Button>
                  <div className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 light:border-emerald-400/35 light:bg-emerald-100/80 light:text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-500/15 dark:text-emerald-100 green:border-emerald-300/30 green:bg-emerald-500/15 green:text-emerald-100">
                    {dueTasks.length} tasks due today
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75 light:border-slate-300/70 light:bg-white/85 light:text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/75 green:border-white/15 green:bg-white/5 green:text-white/75">
                    {remindersEnabled ? "Reminders active" : "Reminders off"}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[30px] border border-white/15 bg-black/30 p-5 light:border-slate-300/60 light:bg-white/80 dark:border-white/15 dark:bg-black/30 green:border-white/15 green:bg-black/30">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { key: "today", label: `Today (${todayTasks.length})` },
                      { key: "upcoming", label: `Upcoming (${upcomingTasks.length})` },
                      { key: "completed", label: `Completed (${completedTasks.length})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setCareTab(tab.key as "today" | "upcoming" | "completed")}
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                          careTab === tab.key
                            ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-100 light:border-emerald-400/45 light:bg-emerald-100 light:text-emerald-800 dark:border-emerald-300/50 dark:bg-emerald-500/20 dark:text-emerald-100 green:border-emerald-300/50 green:bg-emerald-500/20 green:text-emerald-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 light:border-slate-300/60 light:bg-white light:text-slate-600 light:hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 green:border-white/10 green:bg-white/5 green:text-white/70 green:hover:bg-white/10"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {careLoading && <p className="mt-5 text-sm text-white/65 light:text-slate-600 dark:text-white/65 green:text-white/65">Loading care tasks...</p>}
                  {careError && <p className="mt-5 text-sm text-red-300 light:text-red-600 dark:text-red-300 green:text-red-300">{careError}</p>}

                  {!careLoading && visibleTasks.length === 0 && (
                    <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-white/5 p-7 text-sm text-white/65 light:border-slate-300/70 light:bg-white/85 light:text-slate-600 dark:border-white/20 dark:bg-white/5 dark:text-white/65 green:border-white/20 green:bg-white/5 green:text-white/65">
                      No tasks found. Submit a GreenSpot report to generate your schedule.
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {visibleTasks.map((task, index) => {
                      const Icon = taskIcon(task.task_type);
                      return (
                        <motion.article
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                          className={`group relative overflow-hidden rounded-2xl border p-4 ${
                            task.status === "done"
                              ? "border-emerald-300/35 bg-emerald-500/12 light:border-emerald-400/40 light:bg-emerald-100/80 dark:border-emerald-300/35 dark:bg-emerald-500/12 green:border-emerald-300/35 green:bg-emerald-500/12"
                              : "border-white/10 bg-black/30 light:border-slate-300/60 light:bg-white dark:border-white/10 dark:bg-black/30 green:border-white/10 green:bg-black/30"
                          }`}
                        >
                          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-300/80 via-emerald-500/35 to-transparent" />
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-xl border border-emerald-300/35 bg-emerald-500/15 p-2 light:border-emerald-400/40 light:bg-emerald-100 dark:border-emerald-300/35 dark:bg-emerald-500/15 green:border-emerald-300/35 green:bg-emerald-500/15">
                                <Icon className="h-4 w-4 text-emerald-200 light:text-emerald-700 dark:text-emerald-200 green:text-emerald-200" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                                  {task.plant_name}
                                </p>
                                <p className="mt-1 inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/70 light:border-slate-300/70 light:bg-slate-100 light:text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-white/70 green:border-white/15 green:bg-white/10 green:text-white/70">
                                  {task.task_type}
                                </p>
                                <p className="mt-2 text-xs text-white/60 light:text-slate-600 dark:text-white/60 green:text-white/60">
                                  Due {formatDate(task.due_at)}
                                </p>
                                <p className="mt-2 text-sm text-white/75 light:text-slate-700 dark:text-white/75 green:text-white/75">
                                  {task.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                              {task.status !== "done" && (
                                <>
                                  <label className="inline-flex cursor-pointer items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10 light:border-slate-300/70 light:bg-white light:text-slate-700 light:hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 green:border-white/15 green:bg-white/5 green:text-white/75 green:hover:bg-white/10">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) markTaskDone(task, file);
                                      }}
                                    />
                                    Attach photo proof
                                  </label>
                                  <Button
                                    className="border border-emerald-300/45 bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-[0_8px_24px_rgba(16,185,129,0.28)] hover:from-emerald-300 hover:to-emerald-400"
                                    onClick={() => markTaskDone(task, null)}
                                  >
                                    Mark done
                                  </Button>
                                </>
                              )}
                              {task.status === "done" && (
                                <span className="inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-100 light:border-emerald-400/40 light:bg-emerald-100 light:text-emerald-700 dark:border-emerald-300/35 dark:bg-emerald-500/15 dark:text-emerald-100 green:border-emerald-300/35 green:bg-emerald-500/15 green:text-emerald-100">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[30px] border border-white/15 bg-black/30 p-5 light:border-slate-300/60 light:bg-white/85 dark:border-white/15 dark:bg-black/30 green:border-white/15 green:bg-black/30">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/55 light:text-slate-600 dark:text-white/55 green:text-white/55">
                        Care pulse
                      </p>
                      <div className="rounded-full border border-emerald-300/35 bg-emerald-500/15 p-2 light:border-emerald-400/40 light:bg-emerald-100 dark:border-emerald-300/35 dark:bg-emerald-500/15 green:border-emerald-300/35 green:bg-emerald-500/15">
                        <Leaf className="h-4 w-4 text-emerald-200 light:text-emerald-700 dark:text-emerald-200 green:text-emerald-200" />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                      <div
                        className="grid h-40 w-40 place-items-center rounded-full p-[10px]"
                        style={{
                          background: `conic-gradient(rgba(52,211,153,0.95) ${completionRate * 3.6}deg, rgba(148,163,184,0.28) ${completionRate * 3.6}deg 360deg)`,
                        }}
                      >
                        <div className="grid h-full w-full place-items-center rounded-full border border-white/15 bg-black/45 light:border-slate-300/60 light:bg-white dark:border-white/15 dark:bg-black/45 green:border-white/15 green:bg-black/45">
                          <p className="text-3xl font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                            {completionRate}%
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-white/55 light:text-slate-600 dark:text-white/55 green:text-white/55">
                            completion
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 light:border-slate-300/70 light:bg-white dark:border-white/10 dark:bg-white/5 green:border-white/10 green:bg-white/5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 light:text-slate-500 dark:text-white/50 green:text-white/50">
                          Total
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                          {totalCareTasks}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 light:border-slate-300/70 light:bg-white dark:border-white/10 dark:bg-white/5 green:border-white/10 green:bg-white/5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 light:text-slate-500 dark:text-white/50 green:text-white/50">
                          Due soon
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                          {dueSoonCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/15 bg-black/35 p-5 light:border-slate-300/60 light:bg-white/85 dark:border-white/15 dark:bg-black/35 green:border-white/15 green:bg-black/35">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55 light:text-slate-600 dark:text-white/55 green:text-white/55">
                      Next care tip
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                      Keep your GreenSpot thriving.
                    </h3>
                    <p className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm text-white/80 light:border-emerald-400/35 light:bg-emerald-100 light:text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-500/10 dark:text-white/80 green:border-emerald-300/25 green:bg-emerald-500/10 green:text-white/80">
                      {nextTip}
                    </p>
                    <p className="mt-4 text-xs text-white/60 light:text-slate-600 dark:text-white/60 green:text-white/60">
                      Tip refreshes from your upcoming task queue.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="py-20 bg-[#0a0d10] light:bg-[#edf4f0] dark:bg-[#0a0d10] green:bg-[#0a1713]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[38px] border border-emerald-400/25 bg-gradient-to-br from-cyan-400/10 via-black/35 to-emerald-900/35 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] light:border-slate-300/70 light:from-cyan-100/70 light:via-white/95 light:to-emerald-100/65 dark:from-cyan-400/10 dark:via-black/35 dark:to-emerald-900/35 green:from-cyan-400/10 green:via-black/35 green:to-emerald-900/35"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-8 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl light:bg-cyan-200/45" />
              <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-emerald-400/18 blur-3xl light:bg-emerald-300/35" />
            </div>

            <div className="relative z-10 grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-200 light:text-cyan-700 dark:text-cyan-200 green:text-cyan-200">
                    Impact & Stats
                  </p>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 light:border-emerald-400/35 light:bg-emerald-100 light:text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-500/15 dark:text-emerald-100 green:border-emerald-300/30 green:bg-emerald-500/15 green:text-emerald-100">
                    Community-driven growth
                  </span>
                </div>

                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white light:text-slate-900 dark:text-white green:text-white">
                  {t("greenspot.impact.title")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-white/70 light:text-slate-700 dark:text-white/70 green:text-white/70">
                  A quick executive view of how reports convert into verified zones, planned trees,
                  and active partner momentum.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Verification rate", value: `${verificationRate}%` },
                    { label: "Trees / zone", value: treesPerZone.toString() },
                    { label: "Trees / partner", value: treesPerPartner.toString() },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 light:border-slate-300/70 light:bg-white/85 dark:border-white/15 dark:bg-white/5 green:border-white/15 green:bg-white/5"
                    >
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 light:text-slate-500 dark:text-white/50 green:text-white/50">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white light:text-slate-900 dark:text-white green:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/15 bg-black/30 p-4 light:border-slate-300/60 light:bg-white/85 dark:border-white/15 dark:bg-black/30 green:border-white/15 green:bg-black/30">
                  <div className="flex items-center justify-between text-xs text-white/60 light:text-slate-600 dark:text-white/60 green:text-white/60">
                    <span>Annual canopy momentum</span>
                    <span>{Math.min(verificationRate + 18, 96)}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 light:bg-slate-200/90 dark:bg-white/10 green:bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.min(verificationRate + 18, 96)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-emerald-400 light:from-cyan-500 light:via-emerald-500 light:to-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div ref={statsRef} className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat, index) => (
                  <StatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    inView={statsInView}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[32px] border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 via-black/45 to-black/50 px-8 py-10 text-white shadow-[0_22px_60px_rgba(0,0,0,0.4)] light:border-slate-300/70 light:from-emerald-100/70 light:via-white/95 light:to-cyan-100/70 light:text-slate-900 dark:from-emerald-500/10 dark:via-black/45 dark:to-black/50 dark:text-white green:from-emerald-500/10 green:via-black/45 green:to-black/50 green:text-white sm:px-10 sm:py-12"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-14 left-20 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl light:bg-emerald-300/40" />
              <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl light:bg-cyan-200/40" />
            </div>

            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-semibold sm:text-4xl text-white light:text-slate-900 dark:text-white green:text-white">
                  {t("greenspot.cta.title")}
                </h2>
                <p className="mt-4 text-white/70 light:text-slate-700 dark:text-white/70 green:text-white/70">
                  {t("greenspot.cta.desc")}
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="border border-emerald-300/50 bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:from-emerald-300 hover:to-emerald-400"
                >
                  {t("greenspot.cta.primary")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 light:border-slate-300/70 light:bg-white/90 light:text-slate-900 light:hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white green:border-emerald-300/35 green:bg-emerald-500/10 green:text-emerald-100"
                >
                  {t("greenspot.cta.secondary")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}




