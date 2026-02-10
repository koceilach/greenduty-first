"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Users,
  Camera,
  Upload,
  MapPin,
  ShieldCheck,
  X,
  Plus,
  Flame,
  Droplets,
  Leaf,
  Trash2,
  Skull,
  Factory,
  Sparkles,
  Sun,
  Moon,
  Menu,
  LogOut,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { setActivePage, subscribeActivePage } from "@/lib/active-page";
import { supabaseClient } from "@/lib/supabase/client";

const GD_System_REPORT_XP = 120;
const GD_System_DEFAULT_CENTER = { lat: 36.7538, lng: 3.0588 };
const GD_System_disableAuthRedirect = false;
const GD_System_STORAGE_BUCKET = "pollution_images";
const GD_System_AVATAR_BUCKET = "avatars";
const GD_System_LOCATION_PULSE_MS = 1600;
const GD_System_MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

const GD_System_WASTE_TYPES = [
  { id: "plastic", label: "Plastic Dump", icon: Trash2 },
  { id: "toxic", label: "Toxic Spill", icon: Skull },
  { id: "forest_fire", label: "Forest Fire", icon: Flame },
  { id: "chemical", label: "Chemical Leak", icon: Droplets },
  { id: "logging", label: "Illegal Logging", icon: Leaf },
  { id: "industrial", label: "Industrial Smoke", icon: Factory },
] as const;

const GD_System_CITY_LOOKUP = [
  { name: "Algiers", lat: 36.7538, lng: 3.0588 },
  { name: "Oran", lat: 35.6971, lng: -0.6308 },
  { name: "Constantine", lat: 36.365, lng: 6.6147 },
  { name: "Annaba", lat: 36.9, lng: 7.7667 },
  { name: "Blida", lat: 36.47, lng: 2.83 },
  { name: "Tizi Ouzou", lat: 36.7118, lng: 4.045 },
  { name: "Setif", lat: 36.19, lng: 5.41 },
  { name: "Bejaia", lat: 36.75, lng: 5.06 },
] as const;

const GD_System_RECOVERY_WEIGHTS: Record<string, number> = {
  "Plastic Dump": 180,
  "Toxic Spill": 120,
  "Forest Fire": 45,
  "Chemical Leak": 90,
  "Illegal Logging": 70,
  "Industrial Smoke": 110,
};

const GD_System_LEGEND_ITEMS = [
  { label: "Organic", detail: "Illegal Logging", color: "#31f2b2" },
  { label: "Toxic", detail: "Spill / Chemical", color: "#ff5f6d" },
  { label: "Recyclable", detail: "Plastic Dump", color: "#4cc9f0" },
] as const;

const GD_System_getNearestCity = (lat: number, lng: number) => {
  let nearest = GD_System_CITY_LOOKUP[0]?.name ?? "Unknown";
  let minDistance = Number.POSITIVE_INFINITY;
  GD_System_CITY_LOOKUP.forEach((city) => {
    const distance = Math.hypot(lat - city.lat, lng - city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city.name;
    }
  });
  return nearest;
};

const GD_System_formatHotspotLabel = (lat: number, lng: number) => {
  const city = GD_System_getNearestCity(lat, lng);
  const latKey = (Math.round(lat * 100) / 100).toFixed(2);
  const lngKey = (Math.round(lng * 100) / 100).toFixed(2);
  return `${city} • Sector ${latKey}, ${lngKey}`;
};

type GD_System_Report = {
  id: string | number;
  lat: number;
  lng: number;
  waste_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
  user_name?: string | null;
  user_id?: string | null;
  user_avatar?: string | null;
  verified_count?: number | null;
  image_url?: string | null;
  status?: string | null;
};

type GD_System_ReportLocation = {
  lat: number;
  lng: number;
};

type GD_System_MapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type GD_System_TopRanger = {
  name: string;
  count: number;
};

function GD_System_GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function GD_System_TiltCard({
  children,
  className,
  glareClassName,
  enabled = true,
  maxTilt = 8,
}: {
  children: React.ReactNode;
  className?: string;
  glareClassName?: string;
  enabled?: boolean;
  maxTilt?: number;
}) {
  const GD_System_ref = useRef<HTMLDivElement | null>(null);
  const GD_System_x = useMotionValue(0);
  const GD_System_y = useMotionValue(0);
  const GD_System_rotateX = useTransform(
    GD_System_y,
    [-0.5, 0.5],
    [maxTilt, -maxTilt]
  );
  const GD_System_rotateY = useTransform(
    GD_System_x,
    [-0.5, 0.5],
    [-maxTilt, maxTilt]
  );
  const GD_System_glareX = useTransform(GD_System_x, [-0.5, 0.5], ["20%", "80%"]);
  const GD_System_glareY = useTransform(GD_System_y, [-0.5, 0.5], ["15%", "85%"]);
  const GD_System_glare = useMotionTemplate`radial-gradient(circle at ${GD_System_glareX} ${GD_System_glareY}, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 70%)`;

  const GD_System_handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !GD_System_ref.current) return;
    const rect = GD_System_ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    GD_System_x.set(px);
    GD_System_y.set(py);
  };

  const GD_System_handleLeave = () => {
    GD_System_x.set(0);
    GD_System_y.set(0);
  };

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={clsx("relative", className)} style={{ perspective: "1000px" }}>
      <motion.div
        ref={GD_System_ref}
        onMouseMove={GD_System_handleMove}
        onMouseLeave={GD_System_handleLeave}
        style={{
          rotateX: GD_System_rotateX,
          rotateY: GD_System_rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative"
      >
        <motion.div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-0 opacity-70 mix-blend-screen",
            glareClassName ?? "rounded-3xl"
          )}
          style={{ background: GD_System_glare }}
        />
        {children}
      </motion.div>
    </div>
  );
}

function GD_System_StatChip({
  label,
  value,
  tiltEnabled,
}: {
  label: string;
  value: string | number;
  tiltEnabled: boolean;
  isDarkMode?: boolean;
}) {
  const toneClassName = "text-[var(--gd-ink)]";
  return (
    <GD_System_TiltCard
      enabled={tiltEnabled}
      glareClassName="rounded-full"
      className="relative"
    >
      <div
        className={clsx(
          "gd-tilt-surface rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-3 py-1 text-xs shadow-[0_12px_30px_rgba(5,28,24,0.45)]",
          toneClassName
        )}
      >
        <div className="gd-3d-layer-sm flex items-center gap-2">
          <span className={toneClassName}>{label}</span>
          <span className={toneClassName}>{value}</span>
        </div>
      </div>
    </GD_System_TiltCard>
  );
}

function GD_System_StatCard({
  label,
  value,
  accent,
  tiltEnabled = false,
}: {
  label: string;
  value: string;
  accent?: string;
  tiltEnabled?: boolean;
}) {
  const card = (
    <div className="gd-tilt-surface rounded-xl border border-[var(--gd-border)] bg-[var(--gd-surface)] p-4 shadow-[0_14px_30px_rgba(5,28,24,0.45)]">
      <div className="gd-3d-layer-sm text-xs uppercase tracking-[0.28em] text-[var(--gd-muted-2)]">
        {label}
      </div>
      <div
        className={clsx(
          "gd-3d-layer mt-2 text-2xl font-medium text-[var(--gd-ink)]",
          accent
        )}
      >
        {value}
      </div>
    </div>
  );

  if (!tiltEnabled) return card;

  return (
    <GD_System_TiltCard enabled glareClassName="rounded-xl">
      {card}
    </GD_System_TiltCard>
  );
}


function GD_System_SidebarContent({
  reports,
  onFocusReport,
  xp,
  level,
  activeUsers,
  verifiedCount,
  syncLabel,
  mapReady,
}: {
  reports: GD_System_Report[];
  onFocusReport: (report: GD_System_Report) => void;
  xp: number;
  level: number;
  activeUsers: number;
  verifiedCount: number;
  syncLabel: string;
  mapReady: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-6 text-[var(--gd-ink)]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.45em] text-[var(--gd-muted-2)]">
              GreenDuty
            </div>
            <div className="gd-system-title mt-2 text-xl font-semibold">
              Pollution Reporting Dashboard
            </div>
          </div>
          <div className="rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] px-3 py-1 text-xs text-[var(--gd-muted)]">
            {mapReady ? "Map Synced" : "Map Loading"}
          </div>
        </div>
        <div className="mt-3 text-sm text-[var(--gd-muted)]">
          Live intelligence for rapid response squads. Tap the map to drop a
          report pin.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GD_System_StatCard label="Total Reports" value={String(reports.length)} />
        <GD_System_StatCard
          label="Verified"
          value={String(verifiedCount)}
          accent="text-[var(--gd-accent)]"
        />
        <GD_System_StatCard label="Active Users" value={String(activeUsers)} />
        <GD_System_StatCard
          label="Sync"
          value={syncLabel}
          accent="text-[var(--gd-muted)]"
        />
      </div>

      <div className="rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--gd-muted-2)]">
              Ranger XP
            </div>
            <div className="mt-1 text-lg font-semibold">Level {level}</div>
          </div>
          <div className="rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-3 py-1 text-sm text-[var(--gd-ink)]">
            {xp} XP
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[var(--gd-surface-strong)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--gd-accent)] to-[var(--gd-muted)]"
            style={{ width: `${Math.min(100, (xp % 500) / 5)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Recent Reports</div>
          <div className="text-xs text-[var(--gd-muted-2)]">
            {reports.length} signals
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {reports.slice(0, 8).map((report) => (
            <motion.button
              key={report.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => onFocusReport(report)}
              className="w-full rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)] p-3 text-left transition hover:border-[var(--gd-border)] hover:bg-[var(--gd-surface)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--gd-ink)]">
                  {report.waste_type ?? "Unspecified"}
                </div>
                <div className="text-xs text-[var(--gd-muted-2)]">
                  {report.created_at
                    ? new Date(report.created_at).toLocaleTimeString()
                    : "--"}
                </div>
              </div>
              <div className="mt-1 text-xs text-[var(--gd-muted)]">
                {report.user_name ?? "Anonymous Ranger"}
              </div>
              <div className="mt-2 text-xs text-[var(--gd-muted-2)]">
                {report.notes ?? "No notes"}
              </div>
            </motion.button>
          ))}
          {reports.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--gd-border-soft)] p-6 text-center text-sm text-[var(--gd-muted)]">
              No reports yet. Be the first to deploy a signal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GD_System_ActivityFeed({
  reports,
  loading = false,
  onFocusReport,
  totalCount,
  maxHeightClass,
  currentUserId,
  onDeleteReport,
}: {
  reports: GD_System_Report[];
  loading?: boolean;
  onFocusReport: (report: GD_System_Report) => void;
  totalCount?: number;
  maxHeightClass: string;
  isDarkMode?: boolean;
  currentUserId?: string | null;
  onDeleteReport?: (reportId: string | number) => void;
}) {
  const displayCount = loading ? "--" : totalCount ?? reports.length;
  const itemCardClassName =
    "rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)] p-3";
  const emptyCardClassName =
    "rounded-xl border border-dashed border-[var(--gd-border-soft)] p-4 text-center text-xs text-[var(--gd-muted)]";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gd-muted-2)] md:text-xs">
          Activity Feed
        </div>
        <div className="text-[9px] text-[var(--gd-muted-2)] md:text-[10px]">
          {displayCount} updates
        </div>
      </div>
      <div
        className={`mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto pb-4 pr-1 touch-pan-y ${maxHeightClass}`}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`activity-skeleton-${index}`}
                className="h-20 rounded-xl border border-dashed border-[var(--gd-border-soft)] bg-[var(--gd-surface)] animate-pulse"
              />
            ))
          : reports.map((report, index) => (
              <motion.div
                key={`${report.id}-${report.created_at ?? "na"}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={itemCardClassName}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-[var(--gd-ink)] md:text-xs">
                      {report.waste_type ?? "Unspecified"}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)] md:text-[10px]">
                      {report.created_at
                        ? new Date(report.created_at).toLocaleTimeString()
                        : "--"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-[var(--gd-muted)] md:text-[11px]">
                      {report.user_name ?? "Anonymous Ranger"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onFocusReport(report)}
                        aria-label="View on Map"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full border border-[var(--gd-border)] bg-transparent px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-[var(--gd-ink)] transition hover:border-[var(--gd-border)] hover:bg-[var(--gd-surface-strong)]"
                      >
                        <MapPin className="h-3 w-3" />
                        <span className="hidden sm:inline">View on Map</span>
                        <span className="sm:hidden">View</span>
                      </button>
                      {currentUserId &&
                        report.user_id &&
                        String(report.user_id) === String(currentUserId) &&
                        onDeleteReport && (
                        <button
                          onClick={() => onDeleteReport(report.id)}
                          aria-label="Delete report"
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
        {loading && (
          <div className="text-center text-[10px] uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
            Loading...
          </div>
        )}
        {!loading && reports.length === 0 && (
          <div className={emptyCardClassName}>
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}

function GD_System_IntelContent({
  reports,
  loading = false,
  onFocusReport,
  totalCount,
  stats,
  hotspots,
  onClose,
  listHeightClass,
  currentUserId,
  onDeleteReport,
}: {
  reports: GD_System_Report[];
  loading?: boolean;
  onFocusReport: (report: GD_System_Report) => void;
  totalCount?: number;
  stats: {
    totalRecoveredKg: number;
    mostPollutedCity: string;
    leaderName: string;
    leaderCount: number;
  };
  hotspots: Array<{
    label: string;
    score: number;
    count: number;
  }>;
  onClose?: () => void;
  listHeightClass: string;
  currentUserId?: string | null;
  onDeleteReport?: (reportId: string | number) => void;
}) {
  const hasReports = !loading && reports.length > 0;
  const totalRecoveredLabel = hasReports
    ? `${stats.totalRecoveredKg.toLocaleString()} kg`
    : "--";
  const mostPollutedLabel = hasReports ? stats.mostPollutedCity : "--";
  const leaderName = stats.leaderName || "--";
  const leaderCount = stats.leaderCount ?? 0;
  const leaderCountLabel = `${leaderCount} Reports - Current Leader`;
  const sectionCardClassName =
    "rounded-2xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)] p-4";
  const hotspotCardClassName =
    "rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface)] px-4 py-3";
  const densityBadgeClassName =
    "rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gd-ink)] shadow-[0_0_12px_rgba(16,185,129,0.35)]";
  const smartStatCardClassName =
    "rounded-xl border border-[var(--gd-border)] bg-[var(--gd-surface)] p-4 min-h-[120px] md:min-h-[140px]";
  const headerClassName =
    "sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl border-b border-[var(--gd-border)] bg-[var(--gd-surface-strong)]/80 px-2 py-3 backdrop-blur-md";
  const intelTextTone = "text-[var(--gd-ink)]";
  const scrollContainerClassName =
    "h-full max-h-[calc(100vh-120px)] overflow-y-auto pr-1 scrollbar-hide touch-pan-y";
  const emptyStateClassName =
    "rounded-xl border border-dashed border-[var(--gd-border-soft)] p-3 text-center text-xs text-[var(--gd-muted)]";

  return (
    <div className="flex h-full min-h-0 flex-col text-[11px] md:text-xs">
      <div className={scrollContainerClassName}>
        <div className={headerClassName}>
          <div
            className={clsx(
              "text-[10px] font-medium uppercase tracking-[0.4em] md:text-xs",
              intelTextTone
            )}
          >
            Intelligence
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] p-2 text-[var(--gd-ink)] transition hover:bg-[var(--gd-surface-strong)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-6 pb-6">
          <div className={sectionCardClassName}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gd-muted-2)] md:text-xs">
              Smart Stats
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className={smartStatCardClassName}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                  Total Recovered
                </div>
                <div className="mt-2 text-sm font-semibold leading-tight text-[var(--gd-ink)]">
                  {totalRecoveredLabel}
                </div>
              </div>
              <div className={smartStatCardClassName}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                  Most Polluted City
                </div>
                <div className="mt-2 text-sm font-semibold leading-tight break-words text-[var(--gd-ink)]">
                  {mostPollutedLabel}
                </div>
              </div>
              <div className={smartStatCardClassName}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                  User of the Month
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--gd-ink)]">
                  <span role="img" aria-label="Trophy">
                    🏆
                  </span>
                  <span className="break-words">{leaderName}</span>
                </div>
                <div className="mt-2 text-[10px] text-[var(--gd-muted-2)]">
                  {leaderCountLabel}
                </div>
                <div className="mt-1 text-[10px] text-[var(--gd-muted)]">
                  Keep it up! You are saving the environment.
                </div>
              </div>
            </div>
          </div>

          <div className={clsx("flex max-h-[250px] flex-col overflow-hidden", sectionCardClassName)}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gd-muted-2)] md:text-xs">
              Predicted Hotspots
            </div>
            <div className="mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 scrollbar-hide touch-pan-y">
              {hotspots.length > 0 ? (
                hotspots.map((hotspot, index) => (
                  <div
                    key={hotspot.label}
                    className={clsx(
                      "flex min-h-[84px] flex-shrink-0 items-start justify-between gap-4",
                      hotspotCardClassName
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold leading-tight text-[var(--gd-ink)] md:text-base">
                          {hotspot.label}
                        </span>
                        {hotspot.score > 5 && (
                          <span className="text-sm" role="img" aria-label="Urgency">
                            🔥
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                        {hotspot.count} reports
                      </span>
                    </div>
                    <span className={densityBadgeClassName}>
                      Density {hotspot.score.toFixed(1)}
                    </span>
                  </div>
                ))
              ) : (
                <div className={emptyStateClassName}>
                  No hotspot predictions yet.
                </div>
              )}
            </div>
          </div>

          <div className={clsx("flex min-h-0 flex-col overflow-hidden", sectionCardClassName)}>
            <GD_System_ActivityFeed
              reports={reports}
              loading={loading}
              onFocusReport={onFocusReport}
              totalCount={totalCount}
              maxHeightClass={listHeightClass}
              currentUserId={currentUserId}
              onDeleteReport={onDeleteReport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GD_System_ActivityPanel({
  open,
  onClose,
  reports,
  loading = false,
  onFocusReport,
  totalCount,
  variant,
  stats,
  hotspots,
  currentUserId,
  onDeleteReport,
}: {
  open: boolean;
  onClose: () => void;
  reports: GD_System_Report[];
  loading?: boolean;
  onFocusReport: (report: GD_System_Report) => void;
  totalCount?: number;
  variant: "desktop" | "mobile";
  stats: {
    totalRecoveredKg: number;
    mostPollutedCity: string;
    leaderName: string;
    leaderCount: number;
  };
  hotspots: Array<{
    label: string;
    score: number;
    count: number;
  }>;
  currentUserId?: string | null;
  onDeleteReport?: (reportId: string | number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  const listHeight = "max-h-full scrollbar-hide touch-pan-y";

  if (variant === "desktop") return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 md:hidden"
        >
          <motion.div
            initial={false}
            animate={{ height: expanded ? "90vh" : "30vh" }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="mx-3 mb-4 overflow-hidden rounded-3xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-4 text-[var(--gd-ink)] backdrop-blur-xl"
          >
            <motion.button
              type="button"
              drag="y"
              dragConstraints={{ top: -30, bottom: 30 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y < -25) setExpanded(true);
                if (info.offset.y > 25) setExpanded(false);
              }}
              onClick={() => setExpanded((prev) => !prev)}
              className="mx-auto mb-3 flex h-11 w-20 items-center justify-center rounded-full"
              aria-label="Toggle intelligence panel"
            >
              <span className="h-1.5 w-12 rounded-full bg-[var(--gd-muted)]" />
            </motion.button>
            <div className="flex h-full flex-col gap-4 overflow-hidden">
              <GD_System_IntelContent
                reports={reports}
                loading={loading}
                onFocusReport={onFocusReport}
                totalCount={totalCount}
                stats={stats}
                hotspots={hotspots}
                onClose={onClose}
                listHeightClass={listHeight}
                currentUserId={currentUserId}
                onDeleteReport={onDeleteReport}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GD_System_EcoSquadPanel({
  open,
  onClose,
  activeUsers,
  topRangers,
}: {
  open: boolean;
  onClose: () => void;
  activeUsers: number;
  topRangers: GD_System_TopRanger[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className="pointer-events-auto fixed bottom-24 right-6 z-30 w-[320px]"
        >
          <GD_System_GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                  Eco-Squad
                </div>
                <div className="gd-system-title mt-1 text-lg font-semibold">
                  Live Rangers
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-2 text-[var(--gd-ink)] transition hover:border-[var(--gd-border)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-4">
              <div className="flex items-center justify-between">
                <div className="gd-3d-layer-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                    Active Users
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{activeUsers}</div>
                </div>
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute h-12 w-12 animate-ping rounded-full bg-[var(--gd-accent)]/20" />
                  <div className="h-3 w-3 rounded-full bg-[var(--gd-accent)] shadow-[0_0_12px_rgba(49,242,178,0.85)]" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                Top Rangers
              </div>
              <div className="mt-3 space-y-2">
                {topRangers.map((ranger, index) => (
                  <div
                    key={`${ranger.name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gd-surface)] text-sm font-semibold text-[var(--gd-ink)]">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--gd-ink)]">
                          {ranger.name}
                        </div>
                        <div className="text-xs text-[var(--gd-muted-2)]">
                          {ranger.count} reports
                        </div>
                      </div>
                    </div>
                    <Sparkles className="h-4 w-4 text-[var(--gd-accent)]" />
                  </div>
                ))}
                {topRangers.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--gd-border-soft)] p-4 text-center text-sm text-[var(--gd-muted)]">
                    No ranger activity yet.
                  </div>
                )}
              </div>
            </div>
          </GD_System_GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GD_System_ReportModal({
  open,
  onClose,
  onSubmit,
  reportLocation,
  onDetectLocation,
  detectingLocation,
  wasteType,
  setWasteType,
  notes,
  setNotes,
  cameraMode,
  setCameraMode,
  capturedImage,
  setCapturedImage,
  isSubmitting,
  tiltEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  reportLocation: GD_System_ReportLocation | null;
  onDetectLocation: () => void;
  detectingLocation: boolean;
  wasteType: string;
  setWasteType: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  cameraMode: "live" | "upload";
  setCameraMode: (value: "live" | "upload") => void;
  capturedImage: string | null;
  setCapturedImage: (value: string | null) => void;
  isSubmitting: boolean;
  tiltEnabled: boolean;
}) {
  const GD_System_videoRef = useRef<HTMLVideoElement | null>(null);
  const GD_System_canvasRef = useRef<HTMLCanvasElement | null>(null);
  const GD_System_streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open || cameraMode !== "live") {
      GD_System_streamRef.current?.getTracks().forEach((track) => track.stop());
      GD_System_streamRef.current = null;
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) return;
        GD_System_streamRef.current = stream;
        if (GD_System_videoRef.current) {
          GD_System_videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraMode("upload");
      });

    return () => {
      cancelled = true;
      GD_System_streamRef.current?.getTracks().forEach((track) => track.stop());
      GD_System_streamRef.current = null;
    };
  }, [open, cameraMode, setCameraMode]);

  const GD_System_captureFrame = () => {
    const video = GD_System_videoRef.current;
    const canvas = GD_System_canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
  };

  const GD_System_handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setCapturedImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#041a18]/70"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="relative w-full max-w-5xl"
          >
            <GD_System_TiltCard
              enabled={tiltEnabled}
              className="mx-4"
              glareClassName="rounded-3xl"
            >
              <GD_System_GlassCard className="gd-tilt-surface max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--gd-border)] bg-[var(--gd-surface)] p-6 shadow-[0_20px_60px_rgba(6,26,23,0.55)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                    Report Hub
                  </div>
                  <div className="gd-system-title mt-1 text-2xl font-semibold">
                    Instagram-Style Capture
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="gd-3d-layer-sm rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-2 text-[var(--gd-ink)] transition hover:border-[var(--gd-border)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="gd-3d-layer-sm flex gap-3">
                    <button
                      onClick={() => setCameraMode("live")}
                      className={clsx(
                        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        cameraMode === "live"
                          ? "border-[var(--gd-accent)] bg-[var(--gd-accent)]/15 text-[var(--gd-ink)]"
                          : "border-[var(--gd-border)] bg-[var(--gd-surface-strong)] text-[var(--gd-muted)]"
                      )}
                    >
                      <Camera className="h-4 w-4" />
                      Live Capture
                    </button>
                    <button
                      onClick={() => setCameraMode("upload")}
                      className={clsx(
                        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        cameraMode === "upload"
                          ? "border-[var(--gd-accent)] bg-[var(--gd-accent)]/15 text-[var(--gd-ink)]"
                          : "border-[var(--gd-border)] bg-[var(--gd-surface-strong)] text-[var(--gd-muted)]"
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Upload from Gallery
                    </button>
                  </div>

                  <div className="gd-3d-layer relative overflow-hidden rounded-3xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] shadow-[0_18px_40px_rgba(5,28,24,0.45)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-[var(--gd-accent)]/15" />
                    <div className="relative flex min-h-[320px] items-center justify-center">
                      {!capturedImage && cameraMode === "live" && (
                        <video
                          ref={GD_System_videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover"
                        />
                      )}
                      {capturedImage && (
                        <img
                          src={capturedImage}
                          alt="Captured preview"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {capturedImage && (
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-md transition hover:bg-black/60"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {!capturedImage && cameraMode === "upload" && (
                        <div className="flex flex-col items-center gap-3 p-8 text-center">
                          <Upload className="h-8 w-8 text-[var(--gd-muted)]" />
                          <div className="text-sm text-[var(--gd-muted)]">
                            Drag an image or upload from your device.
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      {cameraMode === "live" && (
                        <button
                          onClick={GD_System_captureFrame}
                          className="rounded-full border border-[var(--gd-accent)]/40 bg-[var(--gd-accent)]/15 px-4 py-2 text-sm text-[var(--gd-ink)]"
                        >
                          Capture
                        </button>
                      )}
                      {cameraMode === "upload" && (
                        <label className="cursor-pointer rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-2 text-sm text-[var(--gd-ink)]">
                          Choose File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={GD_System_handleFileChange}
                          />
                        </label>
                      )}
                      {capturedImage && (
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] px-4 py-2 text-sm text-[var(--gd-ink)]"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <canvas ref={GD_System_canvasRef} className="hidden" />
                </div>

                <div className="space-y-5">
                  <div className="gd-3d-layer-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                      Waste Type
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {GD_System_WASTE_TYPES.map((type) => {
                        const Icon = type.icon;
                        const active = wasteType === type.label;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setWasteType(type.label)}
                            className={clsx(
                              "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                              active
                                ? "border-[var(--gd-accent)] bg-[var(--gd-accent)]/15 shadow-[0_0_16px_rgba(49,242,178,0.25)]"
                                : "border-[var(--gd-border-soft)] bg-[var(--gd-surface-strong)]"
                            )}
                          >
                            <div className="rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface)] p-2">
                              <Icon className="h-4 w-4 text-[var(--gd-ink)]" />
                            </div>
                            <div className="text-sm text-[var(--gd-ink)]">
                              {type.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="gd-3d-layer-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                      Location
                    </div>
                    <div className="mt-2 rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-3 text-sm text-[var(--gd-ink)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-[var(--gd-muted-2)]">
                            {reportLocation ? "Coordinates" : "Location"}
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {reportLocation
                              ? `${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)}`
                              : "Tap the map or detect location."}
                          </div>
                        </div>
                        <button
                          onClick={onDetectLocation}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-3 py-1 text-xs text-[var(--gd-ink)]"
                          disabled={detectingLocation}
                        >
                          {detectingLocation && (
                            <span className="h-3 w-3 animate-spin rounded-full border border-[var(--gd-border)] border-t-[var(--gd-ink)]" />
                          )}
                          {detectingLocation ? "Detecting" : "Detect My Location"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="gd-3d-layer-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                      Ranger Notes
                    </div>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-3 text-sm text-[var(--gd-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gd-accent)]/40"
                      placeholder="Add a brief note (optional)."
                    />
                  </div>

                  <button
                    onClick={onSubmit}
                    disabled={!reportLocation || isSubmitting}
                    className={clsx(
                      "gd-3d-layer w-full rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-3 text-sm font-semibold text-[var(--gd-ink)] shadow-[0_14px_30px_rgba(5,28,24,0.5)] transition",
                      !reportLocation || isSubmitting
                        ? "cursor-not-allowed opacity-60"
                        : "hover:border-[var(--gd-accent)]/60 hover:bg-[var(--gd-accent)]/10"
                    )}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border border-[var(--gd-border)] border-t-[var(--gd-ink)]" />
                        Processing...
                      </span>
                    ) : (
                      "Deploy Report"
                    )}
                  </button>
                </div>
              </div>
              </GD_System_GlassCard>
            </GD_System_TiltCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function GD_System_ReportedAreaPage() {
  const GD_System_router = useRouter();
  const GD_System_mapRef = useRef<any | null>(null);
  const GD_System_channelRef = useRef<any>(null);
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const { profile: GD_System_profile, refreshProfile: GD_System_refreshProfile } =
    useAuth();
  const GD_System_supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const [GD_System_viewState, setGD_System_viewState] = useState<GD_System_MapViewState>({
    longitude: GD_System_DEFAULT_CENTER.lng,
    latitude: GD_System_DEFAULT_CENTER.lat,
    zoom: 11.8,
  });

  const GD_System_supabase = useMemo<SupabaseClient | null>(
    () => supabaseClient,
    []
  );

  const [GD_System_reports, setGD_System_reports] = useState<GD_System_Report[]>([]);
  const [GD_System_reportsLoading, setGD_System_reportsLoading] = useState(true);
  const [GD_System_selectedReport, setGD_System_selectedReport] = useState<GD_System_Report | null>(null);
  const [GD_System_reportModalOpen, setGD_System_reportModalOpen] = useState(false);
  const [GD_System_reportLocation, setGD_System_reportLocation] = useState<GD_System_ReportLocation | null>(null);
  const [GD_System_wasteType, setGD_System_wasteType] = useState("Plastic Dump");
  const [GD_System_notes, setGD_System_notes] = useState("");
  const [GD_System_cameraMode, setGD_System_cameraMode] = useState<"live" | "upload">("live");
  const [GD_System_capturedImage, setGD_System_capturedImage] = useState<string | null>(null);
  const [GD_System_isSubmitting, setGD_System_isSubmitting] = useState(false);
  const [GD_System_levelUp, setGD_System_levelUp] = useState(false);
  const [GD_System_xp, setGD_System_xp] = useState(980);
  const [GD_System_ecoSquadOpen, setGD_System_ecoSquadOpen] = useState(false);
  const [GD_System_locationModalOpen, setGD_System_locationModalOpen] = useState(false);
  const [GD_System_detectingLocation, setGD_System_detectingLocation] = useState(false);
  const [GD_System_locationPulse, setGD_System_locationPulse] = useState(false);
  const [GD_System_tiltEnabled, setGD_System_tiltEnabled] = useState(false);
  const [GD_System_intelOpen, setGD_System_intelOpen] = useState(false);
  const GD_System_mapTheme: "dark" | "light" = globalTheme === "light" ? "light" : "dark";
  const [GD_System_showHeatmap, setGD_System_showHeatmap] = useState(false);
  const GD_System_audioRef = useRef<AudioContext | null>(null);
  const [GD_System_deployToast, setGD_System_deployToast] = useState<string | null>(
    null
  );
  const [GD_System_isAuthorized, setGD_System_isAuthorized] = useState<boolean | null>(
    null
  );
  const [GD_System_authState, setGD_System_authState] = useState<{
    loading: boolean;
    user: User | null;
    userName: string;
    restricted: boolean;
  }>({
    loading: true,
    user: null,
    userName: "",
    restricted: false,
  });

  const [GD_System_syncLabel, setGD_System_syncLabel] = useState("Idle");
  const [GD_System_mapReady, setGD_System_mapReady] = useState(false);
  const GD_System_currentUserId = GD_System_authState.user?.id ?? null;
  const [GD_System_reportToDelete, setGD_System_reportToDelete] = useState<
    string | number | null
  >(null);
  const [GD_System_profileModalOpen, setGD_System_profileModalOpen] = useState(false);
  const [GD_System_profileDraftName, setGD_System_profileDraftName] = useState("");
  const [GD_System_profileDraftAvatar, setGD_System_profileDraftAvatar] = useState<
    string | null
  >(null);

  useEffect(() => {
    setActivePage("reported-area");
    return subscribeActivePage((page) => {
      if (page !== "reported-area") {
        setGD_System_reports([]);
        setGD_System_selectedReport(null);
        setGD_System_reportLocation(null);
      }
    });
  }, [setActivePage, subscribeActivePage]);
  const [GD_System_profileCroppedBlob, setGD_System_profileCroppedBlob] =
    useState<Blob | null>(null);
  const [GD_System_cropSource, setGD_System_cropSource] = useState<string | null>(
    null
  );
  const [GD_System_cropZoom, setGD_System_cropZoom] = useState(1);
  const [GD_System_cropOffset, setGD_System_cropOffset] = useState({
    x: 0,
    y: 0,
  });
  const [GD_System_cropMeta, setGD_System_cropMeta] = useState({
    width: 0,
    height: 0,
  });
  const GD_System_cropDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const GD_System_cropImageRef = useRef<HTMLImageElement | null>(null);
  const [GD_System_profileUploading, setGD_System_profileUploading] = useState(false);
  const [GD_System_profileSaving, setGD_System_profileSaving] = useState(false);
  const GD_System_profileFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGD_System_mapReady(true);
  }, []);

  useEffect(() => {
    if (!GD_System_deployToast) return;
    const timer = setTimeout(() => setGD_System_deployToast(null), 3200);
    return () => clearTimeout(timer);
  }, [GD_System_deployToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setGD_System_tiltEnabled(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const GD_System_getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!GD_System_audioRef.current) {
      const AudioContextConstructor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextConstructor) return null;
      GD_System_audioRef.current = new AudioContextConstructor();
    }
    return GD_System_audioRef.current;
  }, []);

  const GD_System_playBreezeSound = useCallback(() => {
    const ctx = GD_System_getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const duration = 1.2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.18;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  }, [GD_System_getAudioContext]);

  const GD_System_playSuccessChime = useCallback(() => {
    const ctx = GD_System_getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.2);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(660, now + 0.05);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start(now + 0.05);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.9);
  }, [GD_System_getAudioContext]);

  const GD_System_toggleIntel = useCallback(() => {
    setGD_System_intelOpen((prev) => {
      const next = !prev;
      if (next) {
        GD_System_playBreezeSound();
      }
      return next;
    });
  }, [GD_System_playBreezeSound]);

  const GD_System_checkLocationPermission = useCallback(async () => {
    if (typeof navigator === "undefined") return "prompt";
    try {
      if (!navigator.permissions?.query) return "prompt";
      const status = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return status.state;
    } catch {
      return "prompt";
    }
  }, []);

  const GD_System_triggerLocationPulse = useCallback(() => {
    setGD_System_locationPulse(true);
    setTimeout(
      () => setGD_System_locationPulse(false),
      GD_System_LOCATION_PULSE_MS
    );
  }, []);

  const GD_System_detectLocation = useCallback(async () => {
    if (!navigator.geolocation) return null;
    setGD_System_detectingLocation(true);
    return new Promise<GD_System_ReportLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          const nextZoom = Math.max(
            GD_System_mapRef.current?.getZoom() ?? GD_System_viewState.zoom,
            13
          );
          setGD_System_reportLocation(location);
          setGD_System_viewState((prev) => ({
            ...prev,
            latitude,
            longitude,
            zoom: nextZoom,
          }));
          GD_System_mapRef.current?.flyTo([latitude, longitude], nextZoom, {
            duration: 0.9,
          });
          setGD_System_detectingLocation(false);
          GD_System_triggerLocationPulse();
          resolve(location);
        },
        () => {
          setGD_System_detectingLocation(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        }
      );
    });
  }, [GD_System_triggerLocationPulse, GD_System_viewState.zoom]);

  useEffect(() => {
    let mounted = true;
    GD_System_checkLocationPermission().then((state) => {
      if (!mounted) return;
      if (state !== "granted") {
        setGD_System_locationModalOpen(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [GD_System_checkLocationPermission]);

  const GD_System_verifiedCount = useMemo(() => {
    return GD_System_reports.reduce(
      (total, report) => total + (report.verified_count ?? 0),
      0
    );
  }, [GD_System_reports]);

  const GD_System_activeUsers = useMemo(() => {
    const set = new Set<string>();
    GD_System_reports.forEach((report) => {
      const key = report.user_id ?? report.user_name;
      if (key) set.add(String(key));
    });
    return set.size;
  }, [GD_System_reports]);

  const GD_System_topRangers = useMemo<GD_System_TopRanger[]>(() => {
    const counts = new Map<string, number>();
    GD_System_reports.forEach((report) => {
      const name = report.user_name ?? "Anonymous";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [GD_System_reports]);

  const GD_System_recentReports = useMemo(() => {
    return [...GD_System_reports]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 12);
  }, [GD_System_reports]);

  const GD_System_isDarkMode = GD_System_mapTheme === "dark";
  const GD_System_navTextTone = "text-[var(--gd-ink)]";
  const GD_System_navBadgeClassName = clsx(
    "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
    "border-[var(--gd-border)] bg-[var(--gd-surface)] text-[var(--gd-ink)]"
  );
  const GD_System_navButtonClassName = clsx(
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border px-2.5 py-2 text-[11px] font-medium transition-all duration-200 hover:scale-105 active:scale-[0.98] md:px-3",
    "border-[var(--gd-border)] bg-[var(--gd-surface)] text-[var(--gd-ink)] shadow-[0_10px_24px_rgba(0,0,0,0.2)] hover:bg-[var(--gd-surface-strong)]"
  );

  const GD_System_totalRecoveredKg = useMemo(() => {
    const total = GD_System_reports.reduce((sum, report) => {
      const base =
        GD_System_RECOVERY_WEIGHTS[report.waste_type ?? ""] ?? 60;
      const multiplier =
        report.verified_count && report.verified_count > 0 ? 1.15 : 1;
      return sum + base * multiplier;
    }, 0);
    return Math.round(total);
  }, [GD_System_reports]);

  const GD_System_mostPollutedCity = useMemo(() => {
    if (GD_System_reports.length === 0) return "--";
    const counts = new Map<string, number>();
    GD_System_reports.forEach((report) => {
      const lat = Number(report.lat);
      const lng = Number(report.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const city = GD_System_getNearestCity(lat, lng);
      counts.set(city, (counts.get(city) ?? 0) + 1);
    });
    let topCity = "--";
    let topCount = 0;
    counts.forEach((count, city) => {
      if (count > topCount) {
        topCity = city;
        topCount = count;
      }
    });
    return topCity;
  }, [GD_System_reports]);

  const GD_System_leaderboardUser = useMemo(() => {
    if (GD_System_reports.length === 0) {
      return { name: "--", count: 0 };
    }
    const counts = new Map<string, number>();
    GD_System_reports.forEach((report) => {
      const name = report.user_name ?? "Anonymous Ranger";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    let topUser = "Anonymous Ranger";
    let topCount = 0;
    counts.forEach((count, name) => {
      if (count > topCount) {
        topUser = name;
        topCount = count;
      }
    });
    return { name: topUser, count: topCount };
  }, [GD_System_reports]);

  const GD_System_predictedHotspots = useMemo(() => {
    if (GD_System_reports.length === 0) return [];
    const buckets = new Map<
      string,
      { lat: number; lng: number; score: number; count: number }
    >();
    GD_System_reports.forEach((report) => {
      const lat = Number(report.lat);
      const lng = Number(report.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const latKey = Math.round(lat * 100) / 100;
      const lngKey = Math.round(lng * 100) / 100;
      const key = `${latKey},${lngKey}`;
      const score = 1 + Math.max(0, report.verified_count ?? 0) * 0.4;
      const current = buckets.get(key) ?? {
        lat: latKey,
        lng: lngKey,
        score: 0,
        count: 0,
      };
      current.score += score;
      current.count += 1;
      buckets.set(key, current);
    });
    return Array.from(buckets.values())
      .map((item) => ({
        label: GD_System_formatHotspotLabel(item.lat, item.lng),
        score: item.score,
        count: item.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [GD_System_reports]);

  const GD_System_intelStats = useMemo(
    () => ({
      totalRecoveredKg: GD_System_totalRecoveredKg,
      mostPollutedCity: GD_System_mostPollutedCity,
      leaderName: GD_System_leaderboardUser.name,
      leaderCount: GD_System_leaderboardUser.count,
    }),
    [
      GD_System_totalRecoveredKg,
      GD_System_mostPollutedCity,
      GD_System_leaderboardUser,
    ]
  );

  const GD_System_level = useMemo(() => {
    return Math.max(1, Math.floor(GD_System_xp / 500) + 1);
  }, [GD_System_xp]);

  const GD_System_displayName = useMemo(() => {
    const profileName =
      GD_System_profile?.full_name?.trim() ||
      GD_System_profile?.username?.trim() ||
      "";
    return (
      profileName ||
      GD_System_authState.userName ||
      GD_System_authState.user?.email ||
      "Eco Ranger"
    );
  }, [
    GD_System_profile?.full_name,
    GD_System_profile?.username,
    GD_System_authState.userName,
    GD_System_authState.user?.email,
  ]);

  const GD_System_userAvatar = useMemo(() => {
    if (GD_System_profile?.avatar_url) {
      return GD_System_profile.avatar_url;
    }
    const metadata = GD_System_authState.user?.user_metadata as
      | { avatar_url?: string; picture?: string }
      | undefined;
    return metadata?.avatar_url ?? metadata?.picture ?? null;
  }, [GD_System_profile?.avatar_url, GD_System_authState.user]);

  const GD_System_userInitials = useMemo(() => {
    const source = GD_System_displayName || "Eco Ranger";
    const parts = source.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "GD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [GD_System_displayName]);

  const GD_System_profileLabel = useMemo(() => {
    if (GD_System_authState.restricted) return "Guest";
    return GD_System_displayName || "Guest";
  }, [GD_System_authState.restricted, GD_System_displayName]);

  const GD_System_CROP_SIZE = 220;

  const GD_System_getCropScale = useCallback(
    (zoom: number) => {
      if (!GD_System_cropMeta.width || !GD_System_cropMeta.height) return zoom;
      const baseScale = Math.max(
        GD_System_CROP_SIZE / GD_System_cropMeta.width,
        GD_System_CROP_SIZE / GD_System_cropMeta.height
      );
      return baseScale * zoom;
    },
    [GD_System_cropMeta.height, GD_System_cropMeta.width]
  );

  const GD_System_clampCropOffset = useCallback(
    (offsetX: number, offsetY: number, zoom: number) => {
      if (!GD_System_cropMeta.width || !GD_System_cropMeta.height) {
        return { x: offsetX, y: offsetY };
      }
      const scale = GD_System_getCropScale(zoom);
      const maxX = Math.max(
        0,
        (GD_System_cropMeta.width * scale - GD_System_CROP_SIZE) / 2
      );
      const maxY = Math.max(
        0,
        (GD_System_cropMeta.height * scale - GD_System_CROP_SIZE) / 2
      );
      return {
        x: Math.max(-maxX, Math.min(maxX, offsetX)),
        y: Math.max(-maxY, Math.min(maxY, offsetY)),
      };
    },
    [GD_System_cropMeta.height, GD_System_cropMeta.width, GD_System_getCropScale]
  );

  useEffect(() => {
    if (!GD_System_cropSource) return;
    setGD_System_cropOffset((prev) =>
      GD_System_clampCropOffset(prev.x, prev.y, GD_System_cropZoom)
    );
  }, [
    GD_System_cropSource,
    GD_System_cropZoom,
    GD_System_cropMeta,
    GD_System_clampCropOffset,
  ]);

  useEffect(() => {
    if (!GD_System_profileModalOpen) return;
    const fallbackName =
      GD_System_profile?.full_name?.trim() ||
      GD_System_profile?.username?.trim() ||
      GD_System_displayName ||
      "";
    setGD_System_profileDraftName(fallbackName);
    setGD_System_profileDraftAvatar(
      GD_System_profile?.avatar_url ?? GD_System_userAvatar ?? null
    );
    setGD_System_profileCroppedBlob(null);
    setGD_System_cropSource(null);
    setGD_System_cropZoom(1);
    setGD_System_cropOffset({ x: 0, y: 0 });
    setGD_System_cropMeta({ width: 0, height: 0 });
  }, [
    GD_System_profileModalOpen,
    GD_System_profile?.full_name,
    GD_System_profile?.username,
    GD_System_profile?.avatar_url,
    GD_System_displayName,
    GD_System_userAvatar,
  ]);

  const GD_System_resolveImageUrl = useCallback(
    (value?: string | null) => {
      if (!value) return null;
      if (/^(https?:|data:|blob:)/.test(value)) return value;
      if (value.startsWith("storage/") && GD_System_supabaseUrl) {
        const base = GD_System_supabaseUrl.replace(/\/+$/, "");
        return `${base}/${value.replace(/^\/+/, "")}`;
      }
      if (!GD_System_supabase) return value;
      const cleaned = value.replace(/^\/+/, "");
      const bucketPrefix = `${GD_System_STORAGE_BUCKET}/`;
      const path = cleaned.startsWith(bucketPrefix)
        ? cleaned.slice(bucketPrefix.length)
        : cleaned;
      const { data } = GD_System_supabase.storage
        .from(GD_System_STORAGE_BUCKET)
        .getPublicUrl(path);
      return data?.publicUrl ?? value;
    },
    [GD_System_supabase, GD_System_supabaseUrl]
  );

  const GD_System_normalizeReport = useCallback((row: any): GD_System_Report | null => {
    const lat = Number(row?.lat ?? row?.latitude ?? row?.latitud);
    const lng = Number(row?.lng ?? row?.longitude ?? row?.long);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const profile = row?.profiles ?? row?.profile ?? null;
    const profileName =
      profile?.full_name ?? profile?.username ?? row?.user_name ?? row?.username ?? null;
    const profileAvatar = profile?.avatar_url ?? row?.avatar_url ?? null;
    return {
      id:
        row?.id ??
        row?.report_id ??
        row?.reportId ??
        `${lat}-${lng}-${row?.created_at ?? ""}`,
      lat,
      lng,
      waste_type: row?.waste_type ?? row?.type ?? null,
      notes: row?.notes ?? row?.description ?? null,
      created_at: row?.created_at ?? null,
      user_name: profileName,
      user_id: row?.user_id ?? profile?.id ?? null,
      user_avatar: profileAvatar,
      verified_count: row?.verified_count ?? row?.verified ?? 0,
      status: row?.status ?? null,
      image_url: GD_System_resolveImageUrl(
        row?.image_url ?? row?.image ?? row?.photo_url ?? null
      ),
    };
  }, [GD_System_resolveImageUrl]);

  const GD_System_enrichReportsWithProfiles = useCallback(
    async (reports: GD_System_Report[]) => {
      if (!GD_System_supabase) return reports;
      const ids = Array.from(
        new Set(
          reports
            .map((report) => report.user_id)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (ids.length === 0) return reports;

      const { data, error } = await GD_System_supabase
        .from("marketplace_profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", ids);

      if (error || !data) {
        if (error) {
          console.warn("Profile lookup failed:", error.message);
        }
        return reports;
      }

      const profileMap = new Map(
        data.map((profile) => [profile.id, profile])
      );
      return reports.map((report) => {
        const profile = report.user_id ? profileMap.get(report.user_id) : null;
        if (!profile) return report;
        return {
          ...report,
          user_name:
            profile.full_name ?? profile.username ?? report.user_name,
          user_avatar: profile.avatar_url ?? report.user_avatar,
        };
      });
    },
    [GD_System_supabase]
  );

  const GD_System_dataUrlToBlob = useCallback((dataUrl: string) => {
    const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
    if (!match) return null;
    const mime = match[1];
    const base64Data = match[2];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }, []);

  const GD_System_uploadReportImage = useCallback(
    async (dataUrl: string) => {
      if (!GD_System_supabase || !GD_System_authState.user) {
        setGD_System_deployToast("Please sign in to upload report images.");
        return null;
      }
      const blob = GD_System_dataUrlToBlob(dataUrl);
      if (!blob) {
        setGD_System_deployToast("Image data is invalid. Please retry.");
        return null;
      }
      const { data: bucketList, error: bucketError } =
        await GD_System_supabase.storage.listBuckets();
      if (bucketError) {
        setGD_System_deployToast("Storage unavailable. Check Supabase settings.");
      }
      const bucketData = bucketList?.find((bucket) => bucket.name === "avatars");
      if (!bucketData) {
        setGD_System_deployToast("Create avatars bucket in Supabase!");
      }
      const extension = blob.type?.split("/")[1] ?? "png";
      const filePath = `reports/${GD_System_authState.user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;
      const { error } = await GD_System_supabase.storage
        .from(GD_System_STORAGE_BUCKET)
        .upload(filePath, blob, {
          contentType: blob.type ?? "image/png",
          upsert: true,
        });
      if (error) {
        setGD_System_deployToast("Report image upload failed. Please try again.");
        return null;
      }
      const GD_System_getPublicUrlWithRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          }
          const { data } = GD_System_supabase.storage
            .from(GD_System_STORAGE_BUCKET)
            .getPublicUrl(filePath);
          if (data?.publicUrl) {
            return data.publicUrl;
          }
        }
        return null;
      };
      const publicUrl = await GD_System_getPublicUrlWithRetry();
      if (!publicUrl) {
        setGD_System_deployToast("Image URL unavailable. Please retry.");
      }
      return publicUrl;
    },
    [GD_System_supabase, GD_System_authState.user, GD_System_dataUrlToBlob]
  );

  const GD_System_fetchReports = useCallback(async () => {
    if (!GD_System_supabase) return;
    setGD_System_reportsLoading(true);
    setGD_System_syncLabel("Syncing");
    try {
      const { data, error } = await GD_System_supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        console.error("Report fetch failed:", error);
        setGD_System_syncLabel("Syncing");
        setGD_System_reportsLoading(true);
        return;
      }

      const normalized = (data ?? [])
        .map(GD_System_normalizeReport)
        .filter((report): report is GD_System_Report => Boolean(report));
      const enriched = await GD_System_enrichReportsWithProfiles(normalized);
      setGD_System_reports(enriched);
      setGD_System_syncLabel("Live");
      setGD_System_reportsLoading(false);
    } catch (error) {
      console.error("Report fetch failed:", error);
      setGD_System_syncLabel("Syncing");
      setGD_System_reportsLoading(true);
    }
  }, [GD_System_supabase, GD_System_normalizeReport, GD_System_enrichReportsWithProfiles]);

  useEffect(() => {
    if (!GD_System_supabase) {
      setGD_System_authState({
        loading: false,
        user: null,
        userName: "Guest",
        restricted: true,
      });
      setGD_System_isAuthorized(false);
      return;
    }

    let mounted = true;

    GD_System_supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const user = data.session?.user ?? null;
        console.log("Current User:", user);
        setGD_System_isAuthorized(Boolean(user));
        if (!user) {
          setGD_System_authState({
            loading: false,
            user: null,
            userName: "Guest",
            restricted: true,
          });
          return;
        }
        setGD_System_authState({
          loading: false,
          user,
          userName:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split("@")[0] ??
            "Eco Ranger",
          restricted: false,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setGD_System_isAuthorized(false);
        setGD_System_authState({
          loading: false,
          user: null,
          userName: "Guest",
          restricted: true,
        });
      });

    const { data: authListener } = GD_System_supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        console.log("Current User:", user);
        setGD_System_isAuthorized(Boolean(user));
        setGD_System_authState({
          loading: false,
          user,
          userName:
            user?.user_metadata?.full_name ??
            user?.user_metadata?.name ??
            user?.email?.split("@")[0] ??
            "Eco Ranger",
          restricted: !user,
        });
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [GD_System_supabase]);

  useEffect(() => {
    if (GD_System_authState.restricted && !GD_System_disableAuthRedirect) {
      GD_System_router.push("/login");
    }
    return;
  }, [GD_System_authState.restricted, GD_System_router]);

  useEffect(() => {
    if (GD_System_authState.user) {
      GD_System_fetchReports();
      const interval = setInterval(() => {
        GD_System_fetchReports();
      }, 30000);
      return () => clearInterval(interval);
    }
    return;
  }, [GD_System_authState.user, GD_System_fetchReports]);

  useEffect(() => {
    if (!GD_System_supabase) return;
    let active = true;
    const loadReports = async () => {
      setGD_System_reportsLoading(true);
      setGD_System_syncLabel("Syncing");
      try {
        const { data, error } = await GD_System_supabase.from("reports").select("*");
        if (error) {
          console.error("Report fetch failed:", error);
          setGD_System_syncLabel("Syncing");
          setGD_System_reportsLoading(true);
          return;
        }
        if (!active) return;
        const normalized = (data ?? [])
          .map(GD_System_normalizeReport)
          .filter((report): report is GD_System_Report => Boolean(report));
        if ((data ?? []).length > 0 && normalized.length === 0) {
          console.error("Reports loaded but no valid coordinates found", data);
        }
        const enriched = await GD_System_enrichReportsWithProfiles(normalized);
        setGD_System_reports(enriched);
        setGD_System_syncLabel("Live");
        setGD_System_reportsLoading(false);
      } catch (error) {
        console.error("Report fetch failed:", error);
        setGD_System_syncLabel("Syncing");
        setGD_System_reportsLoading(true);
      }
    };
    loadReports();
    return () => {
      active = false;
    };
  }, [
    GD_System_supabase,
    GD_System_normalizeReport,
    GD_System_enrichReportsWithProfiles,
  ]);

  useEffect(() => {
    if (!GD_System_supabase) return;
    const channel = GD_System_supabase
      .channel("public:reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const normalized = GD_System_normalizeReport(payload.new);
          if (!normalized) return;
          const enriched =
            normalized.user_id &&
            GD_System_profile &&
            String(normalized.user_id) === String(GD_System_profile.id)
              ? {
                  ...normalized,
                  user_name:
                    GD_System_profile.full_name ??
                    GD_System_profile.username ??
                    normalized.user_name,
                  user_avatar:
                    GD_System_profile.avatar_url ?? normalized.user_avatar,
                }
              : normalized;
          setGD_System_reports((prev) => {
            if (prev.some((item) => String(item.id) === String(enriched.id))) {
              return prev;
            }
            return [enriched, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reports" },
        (payload) => {
          const normalized = GD_System_normalizeReport(payload.new);
          if (!normalized) return;
          setGD_System_reports((prev) =>
            prev.map((item) =>
              String(item.id) === String(normalized.id)
                ? {
                    ...item,
                    ...normalized,
                    user_name: normalized.user_name ?? item.user_name,
                    user_avatar: normalized.user_avatar ?? item.user_avatar,
                  }
                : item
            )
          );
          setGD_System_selectedReport((prev) =>
            prev && String(prev.id) === String(normalized.id)
              ? {
                  ...prev,
                  ...normalized,
                  user_name: normalized.user_name ?? prev.user_name,
                  user_avatar: normalized.user_avatar ?? prev.user_avatar,
                }
              : prev
          );
        }
      )
      .subscribe();
    GD_System_channelRef.current = channel;

    return () => {
      GD_System_supabase.removeChannel(channel);
      if (GD_System_channelRef.current === channel) {
        GD_System_channelRef.current = null;
      }
    };
  }, [GD_System_supabase, GD_System_normalizeReport, GD_System_profile]);

  const GD_System_handleMapClick = useCallback((lat: number, lng: number) => {
    setGD_System_reportLocation({
      lat,
      lng,
    });
  }, []);

  const GD_System_openReportModal = async () => {
    const permission = await GD_System_checkLocationPermission();
    if (permission !== "granted") {
      setGD_System_locationModalOpen(true);
      return;
    }
    await GD_System_detectLocation();
    setGD_System_reportModalOpen(true);
  };

  const GD_System_handleLocationModalConfirm = async () => {
    const location = await GD_System_detectLocation();
    if (location) {
      setGD_System_locationModalOpen(false);
      setGD_System_reportModalOpen(true);
    }
  };

  const GD_System_handleSubmitReport = async () => {
    if (!GD_System_reportLocation || !GD_System_supabase) return;
    const { data: userData, error: userError } =
      await GD_System_supabase.auth.getUser();
    if (userError) {
      console.error("User fetch failed:", userError.message, userError.details, userError.hint);
    }
    const activeUser = userData?.user ?? GD_System_authState.user;
    if (!activeUser) {
      console.error("Insert aborted: user is not authenticated");
      return;
    }
    const GD_System_reporterName =
      GD_System_displayName ||
      activeUser.user_metadata?.full_name ||
      activeUser.user_metadata?.name ||
      activeUser.email?.split("@")[0] ||
      "Eco Ranger";
    if (
      GD_System_reportLocation.lat === undefined ||
      GD_System_reportLocation.lng === undefined ||
      !GD_System_wasteType
    ) {
      console.error("Insert aborted: missing fields", {
        lat: GD_System_reportLocation.lat,
        lng: GD_System_reportLocation.lng,
        waste_type: GD_System_wasteType,
      });
      return;
    }
    setGD_System_isSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticReport: GD_System_Report = {
      id: tempId,
      lat: GD_System_reportLocation.lat,
      lng: GD_System_reportLocation.lng,
      waste_type: GD_System_wasteType,
      notes: GD_System_notes || null,
      created_at: new Date().toISOString(),
      user_id: activeUser.id,
      user_name: GD_System_reporterName,
      user_avatar: GD_System_userAvatar ?? GD_System_profile?.avatar_url ?? null,
      verified_count: 0,
      image_url: GD_System_capturedImage ?? null,
    };
    setGD_System_reports((prev) => [...prev, optimisticReport]);
    setGD_System_selectedReport(optimisticReport);
    setGD_System_viewState((prev) => ({
      ...prev,
      latitude: GD_System_reportLocation.lat,
      longitude: GD_System_reportLocation.lng,
      zoom: Math.max(prev.zoom, 13),
    }));
    GD_System_mapRef.current?.flyTo(
      [GD_System_reportLocation.lat, GD_System_reportLocation.lng],
      14.5,
      { duration: 0.9 }
    );

    let imageUrl: string | null = null;
    if (GD_System_capturedImage) {
      imageUrl = await GD_System_uploadReportImage(GD_System_capturedImage);
      if (!imageUrl) {
        console.error("Report upload step failed: no image URL");
      }
    }

    const payload: Record<string, any> = {
      lat: GD_System_reportLocation.lat,
      lng: GD_System_reportLocation.lng,
      waste_type: GD_System_wasteType,
      notes: GD_System_notes || null,
      user_id: activeUser.id,
      user_name: GD_System_reporterName,
      verified_count: 0,
      image_url: imageUrl,
    };

    const { data, error } = await GD_System_supabase
      .from("reports")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error(
        "Full Supabase Error:",
        error.message,
        error.details,
        error.hint
      );
      setGD_System_reports((prev) => prev.filter((item) => item.id !== tempId));
      setGD_System_selectedReport((prev) =>
        prev && prev.id === tempId ? null : prev
      );
    }

    if (!error && data) {
      const normalized = GD_System_normalizeReport(data);
      if (normalized) {
        setGD_System_reports((prev) =>
          prev.map((item) => (item.id === tempId ? normalized : item))
        );
        setGD_System_selectedReport(normalized);
      }
      setGD_System_reportModalOpen(false);
      setGD_System_notes("");
      setGD_System_capturedImage(null);
      setGD_System_wasteType("Plastic Dump");
      GD_System_playSuccessChime();
      setGD_System_deployToast("Report Deployed Successfully");
      setGD_System_levelUp(true);
      setGD_System_xp((prev) => prev + GD_System_REPORT_XP);
      setTimeout(() => setGD_System_levelUp(false), 1800);
    }

    setGD_System_isSubmitting(false);
  };

  const GD_System_handleVerify = async (report: GD_System_Report) => {
    if (!GD_System_supabase) return;
    const previousCount = report.verified_count ?? 0;
    const nextCount = previousCount + 1;
    setGD_System_reports((prev) =>
      prev.map((item) =>
        item.id === report.id
          ? { ...item, verified_count: nextCount }
          : item
      )
    );
    setGD_System_selectedReport((prev) =>
      prev && prev.id === report.id
        ? { ...prev, verified_count: nextCount }
        : prev
    );
    const { error } = await GD_System_supabase.rpc(
      "increment_report_verification",
      { report_id: report.id }
    );
    if (error) {
      setGD_System_deployToast("Unable to verify report right now.");
      setGD_System_reports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? { ...item, verified_count: previousCount }
            : item
        )
      );
      setGD_System_selectedReport((prev) =>
        prev && prev.id === report.id
          ? { ...prev, verified_count: previousCount }
          : prev
      );
    }
  };

  const GD_System_focusReport = (report: GD_System_Report) => {
    setGD_System_selectedReport(report);
    GD_System_mapRef.current?.flyTo([report.lat, report.lng], 14.5, {
      duration: 1.2,
    });
  };

  const GD_System_handleDeleteReport = useCallback(
    async (reportId: string | number) => {
      if (typeof window === "undefined") return;
      if (!GD_System_supabase) {
        console.error("Delete failed: Supabase client missing");
        return;
      }
      try {
        const { data: userData, error: userError } =
          await GD_System_supabase.auth.getUser();
        if (userError) {
          console.error("User fetch failed:", userError.message);
        }
        const userId = userData?.user?.id ?? GD_System_currentUserId;
        if (!userId) {
          setGD_System_deployToast("Please sign in to delete reports.");
          return;
        }

        const { data, error } = await GD_System_supabase
          .from("reports")
          .delete()
          .eq("id", reportId)
          .eq("user_id", userId)
          .select("id");

        if (error) {
          console.error("Delete failed:", error.message, error.details, error.hint);
          setGD_System_deployToast(error.message || "Delete failed. Please try again.");
          return;
        }

        if (!data || data.length === 0) {
          setGD_System_deployToast("Delete failed. Please try again.");
          return;
        }

        setGD_System_reports((prev) =>
          prev.filter((report) => String(report.id) !== String(reportId))
        );
        setGD_System_selectedReport((prev) =>
          prev && String(prev.id) === String(reportId) ? null : prev
        );
        setGD_System_deployToast("Report deleted successfully");
        GD_System_fetchReports();
      } finally {
        setGD_System_reportToDelete(null);
      }
    },
    [GD_System_supabase, GD_System_currentUserId, GD_System_fetchReports]
  );

  const GD_System_promptDeleteReport = useCallback((reportId: string | number) => {
    setGD_System_reportToDelete(reportId);
  }, []);

  const GD_System_handleProfileAvatarPick = useCallback(() => {
    GD_System_profileFileRef.current?.click();
  }, []);

  const GD_System_handleProfileAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      if (!file.type.startsWith("image/")) {
        setGD_System_deployToast("Please choose an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setGD_System_cropSource(reader.result);
          setGD_System_cropZoom(1);
          setGD_System_cropOffset({ x: 0, y: 0 });
          setGD_System_cropMeta({ width: 0, height: 0 });
        }
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    []
  );

  const GD_System_confirmCrop = useCallback(() => {
    if (!GD_System_cropSource || !GD_System_cropImageRef.current) {
      setGD_System_cropSource(null);
      return;
    }
    const image = GD_System_cropImageRef.current;
    const scale = GD_System_getCropScale(GD_System_cropZoom);
    const canvas = document.createElement("canvas");
    canvas.width = GD_System_CROP_SIZE;
    canvas.height = GD_System_CROP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const dx = GD_System_CROP_SIZE / 2 - drawWidth / 2 + GD_System_cropOffset.x;
    const dy = GD_System_CROP_SIZE / 2 - drawHeight / 2 + GD_System_cropOffset.y;

    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (GD_System_profileDraftAvatar?.startsWith("blob:")) {
          URL.revokeObjectURL(GD_System_profileDraftAvatar);
        }
        const previewUrl = URL.createObjectURL(blob);
        setGD_System_profileDraftAvatar(previewUrl);
        setGD_System_profileCroppedBlob(blob);
        setGD_System_cropSource(null);
      },
      "image/png",
      0.92
    );
  }, [
    GD_System_cropSource,
    GD_System_cropImageRef,
    GD_System_cropZoom,
    GD_System_cropOffset,
    GD_System_getCropScale,
    GD_System_CROP_SIZE,
    GD_System_profileDraftAvatar,
  ]);

  const GD_System_cancelCrop = useCallback(() => {
    setGD_System_cropSource(null);
  }, []);

  const GD_System_handleProfileSave = useCallback(async () => {
    if (!GD_System_supabase || !GD_System_currentUserId) return;
    const trimmedName = GD_System_profileDraftName.trim();
    const payload: Record<string, any> = { id: GD_System_currentUserId };
    if (trimmedName) {
      payload.full_name = trimmedName;
      payload.username = trimmedName;
    }
    let nextAvatarUrl = GD_System_profileDraftAvatar;

    setGD_System_profileSaving(true);

    if (GD_System_profileCroppedBlob) {
      setGD_System_profileUploading(true);
      try {
        const { data: bucketList, error: bucketError } =
          await GD_System_supabase.storage.listBuckets();
        if (bucketError) {
          console.error("Bucket check failed:", bucketError);
        }
        const bucketData = bucketList?.find((bucket) => bucket.name === "avatars");
        if (!bucketData) {
          console.error("Create avatars bucket in Supabase!");
        }
        const extension = "png";
        const filePath = `${GD_System_currentUserId}/${Date.now()}.${extension}`;
        const uploadToBucket = async (bucket: string) => {
          const { error: uploadError } = await GD_System_supabase.storage
            .from(bucket)
            .upload(filePath, GD_System_profileCroppedBlob, {
              upsert: true,
              contentType: "image/png",
            });
          if (uploadError) {
            return { error: uploadError, publicUrl: null };
          }
          const { data } = GD_System_supabase.storage.from(bucket).getPublicUrl(filePath);
          return { error: null, publicUrl: data?.publicUrl ?? null };
        };

        const primaryResult = await uploadToBucket(GD_System_AVATAR_BUCKET);
        if (primaryResult.publicUrl) {
          nextAvatarUrl = primaryResult.publicUrl;
        } else {
          const bucketMissing =
            primaryResult.error?.message?.toLowerCase().includes("bucket not found");
          if (
            bucketMissing &&
            GD_System_STORAGE_BUCKET &&
            GD_System_STORAGE_BUCKET !== GD_System_AVATAR_BUCKET
          ) {
            const fallbackResult = await uploadToBucket(GD_System_STORAGE_BUCKET);
            if (fallbackResult.publicUrl) {
              nextAvatarUrl = fallbackResult.publicUrl;
              setGD_System_deployToast("Avatar updated using the fallback bucket.");
            }
          }
        }
      } catch (error) {
        console.error("Avatar upload failed:", error);
        setGD_System_deployToast("Avatar upload failed. Please try again.");
        setGD_System_profileSaving(false);
        setGD_System_profileUploading(false);
        return;
      } finally {
        setGD_System_profileUploading(false);
      }
    }

    if (nextAvatarUrl) {
      payload.avatar_url = nextAvatarUrl;
    }

    if (Object.keys(payload).length <= 1) {
      setGD_System_profileModalOpen(false);
      setGD_System_profileSaving(false);
      return;
    }

    const { error } = await GD_System_supabase
      .from("marketplace_profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Profile update failed:", error.message);
      setGD_System_deployToast("Profile update failed. Please try again.");
      setGD_System_profileSaving(false);
      return;
    }

    setGD_System_reports((prev) =>
      prev.map((report) =>
        report.user_id === GD_System_currentUserId
          ? {
              ...report,
              user_name: trimmedName || report.user_name,
              user_avatar: nextAvatarUrl ?? report.user_avatar,
            }
          : report
      )
    );

    setGD_System_selectedReport((prev) =>
      prev && prev.user_id === GD_System_currentUserId
        ? {
            ...prev,
            user_name: trimmedName || prev.user_name,
            user_avatar: nextAvatarUrl ?? prev.user_avatar,
          }
        : prev
    );

    if (GD_System_profileCroppedBlob && nextAvatarUrl) {
      if (GD_System_profileDraftAvatar?.startsWith("blob:")) {
        URL.revokeObjectURL(GD_System_profileDraftAvatar);
      }
      setGD_System_profileDraftAvatar(nextAvatarUrl);
      setGD_System_profileCroppedBlob(null);
    }

    await GD_System_refreshProfile();
    setGD_System_deployToast("Profile updated successfully");
    setGD_System_profileSaving(false);
    setGD_System_profileModalOpen(false);
    GD_System_fetchReports();
  }, [
    GD_System_supabase,
    GD_System_currentUserId,
    GD_System_profileDraftName,
    GD_System_profileDraftAvatar,
    GD_System_profileCroppedBlob,
    GD_System_refreshProfile,
    GD_System_fetchReports,
  ]);

  const GD_System_handleLogout = useCallback(async () => {
    GD_System_router.push("/login");
    if (!GD_System_supabase) {
      return;
    }
    const { error } = await GD_System_supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message, error.details, error.hint);
    }
    if (GD_System_channelRef.current) {
      GD_System_supabase.removeChannel(GD_System_channelRef.current);
      GD_System_channelRef.current = null;
    }
    GD_System_mapRef.current = null;
    setGD_System_reports([]);
    setGD_System_selectedReport(null);
    setGD_System_reportLocation(null);
    setGD_System_authState({
      loading: false,
      user: null,
      userName: "Guest",
      restricted: true,
    });
    setGD_System_isAuthorized(false);
  }, [GD_System_supabase, GD_System_router]);

  useEffect(() => {
    if (!GD_System_selectedReport) return;
    const lat = GD_System_selectedReport.lat;
    const lng = GD_System_selectedReport.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setGD_System_viewState((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: Math.max(prev.zoom, 13),
    }));
    GD_System_mapRef.current?.flyTo([lat, lng], 14.5, { duration: 0.9 });
  }, [GD_System_selectedReport]);

  return (
    <div className="relative min-h-screen w-screen overflow-hidden overflow-x-hidden bg-[var(--gd-bg)] text-[var(--gd-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "var(--gd-bg-gradient)" }}
        />
        <div
          className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-[180px]"
          style={{ backgroundColor: "var(--gd-glow-1)" }}
        />
        <div
          className="absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full blur-[200px]"
          style={{ backgroundColor: "var(--gd-glow-2)" }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen w-screen">
        <aside
          className={clsx(
            "hidden h-screen shrink-0 overflow-hidden transition-[width] duration-300 md:flex",
            GD_System_intelOpen ? "w-64 lg:w-[350px]" : "w-0"
          )}
        >
          <div
            className={clsx(
              "flex h-full w-full flex-col overflow-hidden px-4 py-5",
              GD_System_intelOpen ? "opacity-100" : "opacity-0 pointer-events-none",
              "border-r border-[var(--gd-border)] bg-[var(--gd-surface-strong)] backdrop-blur-xl text-[var(--gd-ink)]"
            )}
          >
            <GD_System_IntelContent
              reports={GD_System_recentReports}
              loading={GD_System_reportsLoading}
              onFocusReport={GD_System_focusReport}
              totalCount={GD_System_reports.length}
              stats={GD_System_intelStats}
              hotspots={GD_System_predictedHotspots}
              onClose={() => setGD_System_intelOpen(false)}
              listHeightClass="max-h-full scrollbar-hide"
              currentUserId={GD_System_currentUserId}
              onDeleteReport={GD_System_promptDeleteReport}
            />
          </div>
        </aside>

        <main className="relative flex min-h-screen min-w-0 flex-1 overflow-hidden overflow-x-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-[var(--gd-overlay-top)] via-transparent to-[var(--gd-overlay-bottom)]" />
            <div className="relative z-10 h-full w-full">
              <GD_System_MapComponent
                reports={GD_System_reports}
                externalMapRef={GD_System_mapRef}
                mapTheme={GD_System_mapTheme}
                onToggleTheme={() =>
                  setGlobalTheme(globalTheme === "light" ? "green" : "light")
                }
                heatmapEnabled={GD_System_showHeatmap}
                onHeatmapToggle={setGD_System_showHeatmap}
              />
            </div>
          </div>

          <div className="absolute inset-0 z-20 pointer-events-none">
            <div
              className={clsx(
                "pointer-events-auto fixed top-4 left-4 right-4 z-[1000] transition-[left] duration-300",
                GD_System_intelOpen && "md:left-[calc(1rem+16rem)] lg:left-[calc(1rem+350px)]"
              )}
            >
              <motion.div
                initial={{ y: -18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                className="relative flex h-14 items-center rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-2 backdrop-blur-2xl shadow-[0_18px_48px_rgba(0,0,0,0.2)] md:h-16 md:px-4 overflow-visible"
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--gd-surface-strong)] via-[var(--gd-surface)] to-transparent"
                />
                <div className="relative flex w-full items-center gap-3 md:gap-4">
                  <div className="flex min-w-0 flex-col">
                    <span
                      className={clsx(
                        "text-sm font-medium uppercase tracking-[0.35em]",
                        GD_System_navTextTone
                      )}
                    >
                      GREENDUTY
                    </span>
                    <span
                      className={clsx(
                        "hidden text-xs font-medium md:block",
                        GD_System_navTextTone
                      )}
                    >
                      Pollution Dashboard
                    </span>
                  </div>

                  <div className="hidden md:flex flex-1 items-center justify-center gap-2">
                    <div className={GD_System_navBadgeClassName}>
                      <span
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          GD_System_mapReady ? "bg-emerald-400" : "bg-amber-300"
                        )}
                      />
                      <span>{GD_System_mapReady ? "Map Synced" : "Map Loading"}</span>
                    </div>
                    <div className={GD_System_navBadgeClassName}>
                      <span>Reports</span>
                      <span className="tabular-nums">{GD_System_reports.length}</span>
                    </div>
                    <div className={GD_System_navBadgeClassName}>
                      <span
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          GD_System_syncLabel === "Live"
                            ? "bg-emerald-400"
                            : "bg-amber-300"
                        )}
                      />
                      <span>{GD_System_syncLabel}</span>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setGD_System_profileModalOpen(true)}
                      className="hidden max-w-[170px] items-center gap-2 rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--gd-ink)] transition hover:scale-[1.02] hover:bg-[var(--gd-surface-strong)] md:flex"
                      aria-label="Open profile settings"
                      type="button"
                    >
                      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] text-[10px] font-semibold">
                        {GD_System_userAvatar ? (
                          <img
                            src={GD_System_userAvatar}
                            alt="User avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{GD_System_userInitials}</span>
                        )}
                      </div>
                      <span className="truncate">{GD_System_profileLabel}</span>
                    </button>
                    <button
                      onClick={GD_System_toggleIntel}
                      className={clsx(GD_System_navButtonClassName, "hidden md:inline-flex lg:hidden")}
                      aria-label="Toggle intelligence sidebar"
                    >
                      <Menu className="h-4 w-4" />
                      <span className="hidden lg:inline">Menu</span>
                    </button>
                    <button
                      onClick={GD_System_toggleIntel}
                      className={clsx(GD_System_navButtonClassName, "hidden lg:inline-flex")}
                      aria-label="Toggle intelligence panel"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden md:inline">Intelligence</span>
                    </button>
                    <button
                      onClick={() =>
                        setGlobalTheme(globalTheme === "light" ? "green" : "light")
                      }
                      className={GD_System_navButtonClassName}
                      aria-label="Toggle theme"
                    >
                      {GD_System_isDarkMode ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                      <span className="hidden md:inline">
                        {GD_System_isDarkMode ? "Light" : "Green"}
                      </span>
                    </button>
                    <button
                      onClick={GD_System_handleLogout}
                      className={GD_System_navButtonClassName}
                      aria-label="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                </div>

                <div className="hidden" />
              </motion.div>
            </div>

            <div className="pointer-events-auto absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 md:flex flex-col items-center">
              <button
                onClick={GD_System_openReportModal}
                className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                <div className="absolute inset-0 rounded-full bg-[var(--gd-accent)]/15 blur-xl transition group-hover:bg-[var(--gd-accent)]/25" />
                <Plus className="relative h-6 w-6 text-[var(--gd-ink)]" />
              </button>
              <div className="mt-2 text-center text-xs uppercase tracking-[0.35em] text-[var(--gd-muted-2)]">
                Report
              </div>
            </div>

            <button
              onClick={() => setGD_System_ecoSquadOpen(true)}
              className="pointer-events-auto absolute right-6 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] text-[var(--gd-ink)] shadow-[0_8px_22px_rgba(0,0,0,0.2)] backdrop-blur-md md:flex"
            >
              <Users className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
              className="pointer-events-auto absolute bottom-24 left-6 z-20 w-56 md:bottom-6"
            >
              <GD_System_GlassCard
                className="rounded-2xl p-3"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                  {GD_System_showHeatmap ? "Density Scale" : "Legend"}
                </div>
                {GD_System_showHeatmap ? (
                  <div className="mt-3 space-y-3">
                    <div className="text-xs text-[var(--gd-ink)]">
                      Pollution density by concentration.
                    </div>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, #4cc9f0 0%, #ff5f6d 100%)",
                      }}
                    />
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[var(--gd-muted-2)]">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {GD_System_LEGEND_ITEMS.map((item) => (
                      <motion.div
                        key={item.label}
                        whileHover={{ x: 3 }}
                        className="flex items-center justify-between rounded-xl border border-[var(--gd-border-soft)] bg-[var(--gd-surface)] px-2 py-1 text-xs"
                      >
                        <div className="flex items-center gap-2 text-[var(--gd-ink)]">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--gd-muted-2)]">
                          {item.detail}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GD_System_GlassCard>
            </motion.div>

            <div
              className={clsx(
                "pointer-events-auto absolute left-1/2 z-30 w-[min(92vw,420px)] -translate-x-1/2 transition-[bottom] duration-300 md:hidden",
                GD_System_intelOpen ? "bottom-[calc(30vh+16px)]" : "bottom-5"
              )}
            >
              <div className="relative">
                <div
                  className="flex items-center justify-between rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-2 backdrop-blur-md shadow-[0_8px_26px_rgba(0,0,0,0.2)]"
                >
                  <button
                    className="flex h-11 w-11 items-center justify-center text-[var(--gd-muted)] transition hover:text-[var(--gd-ink)]"
                  >
                    <MapPin className="h-5 w-5" />
                  </button>
                  <button
                    onClick={GD_System_toggleIntel}
                    className="flex h-11 w-11 items-center justify-center text-[var(--gd-muted)] transition hover:text-[var(--gd-ink)]"
                  >
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <div className="w-10" />
                  <button
                    className="flex h-11 w-11 items-center justify-center text-[var(--gd-muted)] transition hover:text-[var(--gd-ink)]"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setGD_System_ecoSquadOpen(true)}
                    className="flex h-11 w-11 items-center justify-center text-[var(--gd-muted)] transition hover:text-[var(--gd-ink)]"
                  >
                    <Users className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={GD_System_openReportModal}
                  className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)] shadow-[0_10px_26px_rgba(0,0,0,0.25)]"
                >
                  <Plus className="h-6 w-6 text-[var(--gd-ink)]" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <GD_System_EcoSquadPanel
        open={GD_System_ecoSquadOpen}
        onClose={() => setGD_System_ecoSquadOpen(false)}
        activeUsers={GD_System_activeUsers}
        topRangers={GD_System_topRangers}
      />

      <GD_System_ActivityPanel
        open={GD_System_intelOpen}
        onClose={() => setGD_System_intelOpen(false)}
        reports={GD_System_recentReports}
        loading={GD_System_reportsLoading}
        onFocusReport={GD_System_focusReport}
        totalCount={GD_System_reports.length}
        variant="mobile"
        stats={GD_System_intelStats}
        hotspots={GD_System_predictedHotspots}
        currentUserId={GD_System_currentUserId}
        onDeleteReport={GD_System_promptDeleteReport}
      />

      <AnimatePresence>
        {GD_System_reportToDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-md rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-6 text-center shadow-2xl backdrop-blur-xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--gd-ink)]">
                Confirm Deletion
              </h3>
              <p className="mt-2 text-sm text-[var(--gd-muted)]">
                Are you sure you want to permanently delete this report? This action
                cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setGD_System_reportToDelete(null)}
                  className="rounded-lg border border-[var(--gd-border)] bg-transparent px-5 py-2 text-sm font-medium text-[var(--gd-ink)] transition hover:bg-[var(--gd-surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (GD_System_reportToDelete !== null) {
                      GD_System_handleDeleteReport(GD_System_reportToDelete);
                    }
                  }}
                  className="rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {GD_System_profileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-md rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] p-6 text-[var(--gd-ink)] shadow-2xl backdrop-blur-xl"
            >
              <div className="text-center">
                <div className="text-sm uppercase tracking-[0.3em] text-[var(--gd-muted)]">
                  Profile
                </div>
                <h3 className="mt-2 text-xl font-semibold">Edit Profile</h3>
              </div>

              <div className="mt-6 flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={GD_System_handleProfileAvatarPick}
                    className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--gd-border)] bg-[var(--gd-surface)]"
                  >
                  {GD_System_profileDraftAvatar ? (
                    <img
                      src={GD_System_profileDraftAvatar}
                      alt="Profile avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--gd-muted)]">
                      {GD_System_userInitials}
                    </div>
                  )}
                  {GD_System_profileUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="h-6 w-6 animate-spin rounded-full border border-white/30 border-t-white" />
                    </div>
                  )}
                  {GD_System_profileCroppedBlob && (
                    <div className="absolute bottom-1 right-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Cropped
                    </div>
                  )}
                </button>
                <input
                  ref={GD_System_profileFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={GD_System_handleProfileAvatarChange}
                />

                {GD_System_cropSource && (
                  <div className="mt-2 w-full">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted)]">
                      Crop Avatar
                    </div>
                    <div
                      className="relative mt-3 flex items-center justify-center rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] p-4"
                    >
                      <div
                        className="relative h-[220px] w-[220px] overflow-hidden rounded-full border border-[var(--gd-border)]"
                        style={{ touchAction: "none" }}
                        onPointerDown={(event) => {
                          GD_System_cropDragRef.current.active = true;
                          GD_System_cropDragRef.current.startX = event.clientX;
                          GD_System_cropDragRef.current.startY = event.clientY;
                          GD_System_cropDragRef.current.originX = GD_System_cropOffset.x;
                          GD_System_cropDragRef.current.originY = GD_System_cropOffset.y;
                          (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                          if (!GD_System_cropDragRef.current.active) return;
                          const deltaX = event.clientX - GD_System_cropDragRef.current.startX;
                          const deltaY = event.clientY - GD_System_cropDragRef.current.startY;
                          const next = GD_System_clampCropOffset(
                            GD_System_cropDragRef.current.originX + deltaX,
                            GD_System_cropDragRef.current.originY + deltaY,
                            GD_System_cropZoom
                          );
                          setGD_System_cropOffset(next);
                        }}
                        onPointerUp={() => {
                          GD_System_cropDragRef.current.active = false;
                        }}
                        onPointerLeave={() => {
                          GD_System_cropDragRef.current.active = false;
                        }}
                      >
                        <img
                          ref={GD_System_cropImageRef}
                          src={GD_System_cropSource}
                          alt="Crop source"
                          onLoad={(event) => {
                            const img = event.currentTarget;
                            setGD_System_cropMeta({
                              width: img.naturalWidth,
                              height: img.naturalHeight,
                            });
                          }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: `translate(-50%, -50%) translate(${GD_System_cropOffset.x}px, ${GD_System_cropOffset.y}px) scale(${GD_System_getCropScale(
                              GD_System_cropZoom
                            )})`,
                          }}
                          className="select-none"
                          draggable={false}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted)]">
                        Zoom
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={2.6}
                        step={0.02}
                        value={GD_System_cropZoom}
                        onChange={(event) =>
                          setGD_System_cropZoom(Number(event.target.value))
                        }
                        className="mt-2 w-full"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={GD_System_cancelCrop}
                        className="rounded-lg border border-[var(--gd-border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--gd-ink)] transition hover:bg-[var(--gd-surface)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={GD_System_confirmCrop}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                      >
                        Confirm Crop
                      </button>
                    </div>
                  </div>
                )}

                <div className="w-full">
                  <label className="text-xs uppercase tracking-[0.2em] text-[var(--gd-muted)]">
                    Full Name
                  </label>
                  <input
                    value={GD_System_profileDraftName}
                    onChange={(event) =>
                      setGD_System_profileDraftName(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-3 text-sm text-[var(--gd-ink)] placeholder:text-[var(--gd-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setGD_System_profileModalOpen(false)}
                  className="rounded-lg border border-[var(--gd-border)] bg-transparent px-5 py-2 text-sm font-medium text-[var(--gd-ink)] transition hover:bg-[var(--gd-surface)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={GD_System_handleProfileSave}
                  disabled={
                    GD_System_profileSaving ||
                    GD_System_profileUploading ||
                    Boolean(GD_System_cropSource)
                  }
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {GD_System_profileSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                      Saving...
                    </span>
                  ) : GD_System_profileUploading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                      Uploading...
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GD_System_ReportModal
        open={GD_System_reportModalOpen}
        onClose={() => setGD_System_reportModalOpen(false)}
        onSubmit={GD_System_handleSubmitReport}
        reportLocation={GD_System_reportLocation}
        onDetectLocation={GD_System_detectLocation}
        detectingLocation={GD_System_detectingLocation}
        wasteType={GD_System_wasteType}
        setWasteType={setGD_System_wasteType}
        notes={GD_System_notes}
        setNotes={setGD_System_notes}
        cameraMode={GD_System_cameraMode}
        setCameraMode={setGD_System_cameraMode}
        capturedImage={GD_System_capturedImage}
        setCapturedImage={setGD_System_capturedImage}
        isSubmitting={GD_System_isSubmitting}
        tiltEnabled={GD_System_tiltEnabled}
      />

      <AnimatePresence>
        {GD_System_levelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-3xl border border-[var(--gd-border)] bg-[var(--gd-surface-strong)] px-10 py-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                Level Up
              </div>
              <div className="gd-system-title mt-2 text-3xl font-semibold text-[var(--gd-ink)]">
                +{GD_System_REPORT_XP} XP
              </div>
              <div className="mt-2 text-sm text-[var(--gd-muted)]">
                Ranger profile upgraded
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {GD_System_deployToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none fixed left-1/2 top-6 z-[70] w-full -translate-x-1/2 px-4"
          >
            <div className="pointer-events-auto mx-auto w-full max-w-sm">
              <GD_System_GlassCard className="rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-3 text-center text-sm text-[var(--gd-ink)] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                {GD_System_deployToast}
              </GD_System_GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {GD_System_locationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <GD_System_GlassCard className="mx-6 max-w-md p-6 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                Location Access Required
              </div>
              <div className="gd-system-title mt-3 text-xl font-medium text-[var(--gd-ink)]">
                Enable GPS to report accurately
              </div>
              <div className="mt-3 text-sm text-[var(--gd-muted)]">
                To pinpoint pollution precisely, please allow location access.
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={GD_System_handleLocationModalConfirm}
                  className="w-full rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-3 text-sm font-semibold text-[var(--gd-ink)] transition hover:border-[var(--gd-accent)]/60 hover:bg-[var(--gd-accent)]/10"
                  disabled={GD_System_detectingLocation}
                >
                  {GD_System_detectingLocation ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border border-[var(--gd-border)] border-t-[var(--gd-ink)]" />
                      Detecting...
                    </span>
                  ) : (
                    "Enable Location"
                  )}
                </button>
                <button
                  onClick={() => setGD_System_locationModalOpen(false)}
                  className="w-full rounded-2xl border border-[var(--gd-border-soft)] bg-transparent px-4 py-3 text-sm text-[var(--gd-muted)] transition hover:text-[var(--gd-ink)]"
                >
                  Not Now
                </button>
              </div>
            </GD_System_GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {GD_System_isAuthorized === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
          >
            <GD_System_GlassCard className="mx-6 max-w-md p-8 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--gd-muted-2)]">
                Access Restricted
              </div>
              <div className="gd-system-title mt-3 text-2xl font-semibold">
                Ranger authentication required
              </div>
              <div className="mt-3 text-sm text-[var(--gd-muted)]">
                Redirecting to secure login...
              </div>
              <button
                onClick={() => GD_System_router.push("/login")}
                className="mt-5 w-full rounded-2xl border border-[var(--gd-border)] bg-[var(--gd-surface)] px-4 py-3 text-sm font-semibold text-[var(--gd-ink)]"
              >
                Go to Login
              </button>
            </GD_System_GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root,
        .green {
          --gd-ink: #e6f5f0;
          --gd-muted: rgba(230, 245, 240, 0.7);
          --gd-muted-2: rgba(230, 245, 240, 0.45);
          --gd-accent: #31f2b2;
          --gd-surface: rgba(6, 14, 22, 0.55);
          --gd-surface-strong: rgba(6, 14, 22, 0.7);
          --gd-border: rgba(255, 255, 255, 0.1);
          --gd-border-soft: rgba(255, 255, 255, 0.06);
          --gd-bg: #020b13;
          --gd-bg-gradient: radial-gradient(
              circle at top,
              rgba(49, 242, 178, 0.14),
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(255, 255, 255, 0.04),
              transparent 45%
            ),
            linear-gradient(140deg, #020b13, #06141f 55%, #020b13);
          --gd-glow-1: rgba(13, 62, 63, 0.45);
          --gd-glow-2: rgba(7, 28, 38, 0.7);
          --gd-overlay-top: rgba(2, 11, 19, 0.15);
          --gd-overlay-bottom: rgba(2, 11, 19, 0.7);
        }
        .light {
          --gd-ink: #0f172a;
          --gd-muted: rgba(15, 23, 42, 0.65);
          --gd-muted-2: rgba(15, 23, 42, 0.45);
          --gd-accent: #0f766e;
          --gd-surface: rgba(255, 255, 255, 0.7);
          --gd-surface-strong: rgba(255, 255, 255, 0.85);
          --gd-border: rgba(15, 23, 42, 0.16);
          --gd-border-soft: rgba(15, 23, 42, 0.1);
          --gd-bg: #f5f8f6;
          --gd-bg-gradient: radial-gradient(
              circle at top,
              rgba(16, 185, 129, 0.1),
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(15, 23, 42, 0.03),
              transparent 45%
            ),
            linear-gradient(140deg, #f5f8f6, #e8f0eb 55%, #f5f8f6);
          --gd-glow-1: rgba(16, 185, 129, 0.08);
          --gd-glow-2: rgba(14, 165, 233, 0.06);
          --gd-overlay-top: rgba(245, 248, 246, 0.1);
          --gd-overlay-bottom: rgba(245, 248, 246, 0.5);
        }
        .gd-light-scope {
          --gd-ink: #0f172a;
          --gd-muted: rgba(15, 23, 42, 0.65);
          --gd-muted-2: rgba(15, 23, 42, 0.45);
          --gd-surface: rgba(255, 255, 255, 0.7);
          --gd-surface-strong: rgba(255, 255, 255, 0.85);
          --gd-border: rgba(15, 23, 42, 0.16);
          --gd-border-soft: rgba(15, 23, 42, 0.1);
        }
        * {
          scrollbar-width: none;
        }
        *::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }
        .scrollbar-hide {
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }
        html,
        body {
          overscroll-behavior: none;
          background: var(--gd-bg);
        }
        body {
          font-family: "Inter", "Geist", system-ui, -apple-system, "Segoe UI",
            "Helvetica Neue", Arial, sans-serif;
          color: var(--gd-ink);
          font-weight: 400;
        }
        .gd-system-title {
          letter-spacing: 0.08em;
          font-weight: 600;
        }
        .gd-tilt-surface {
          transform-style: preserve-3d;
        }
        .gd-3d-layer {
          transform: translateZ(18px);
        }
        .gd-3d-layer-sm {
          transform: translateZ(10px);
        }
        .leaflet-container {
          background: var(--gd-bg);
          font-family: inherit;
        }
        .gd-leaflet-map .leaflet-tile-pane {
          filter: none;
        }
        .gd-leaflet-marker {
          background: transparent;
          border: none;
        }
        .gd-cluster-icon {
          background: transparent;
          border: none;
        }
        .gd-location-marker {
          position: relative;
          width: 40px;
          height: 40px;
        }
        .gd-location-pulse {
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          border: 1px solid rgba(49, 242, 178, 0.6);
          animation: gd-location-pulse 1.6s ease-out infinite;
          box-shadow: 0 0 14px rgba(49, 242, 178, 0.5);
        }
        @keyframes gd-location-pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.7);
            opacity: 0;
          }
        }
        .gd-system-popup .leaflet-popup-content-wrapper {
          padding: 0;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .gd-system-popup .leaflet-popup-content {
          margin: 0;
        }
        .gd-system-popup-dark .leaflet-popup-tip {
          background: rgba(8, 22, 20, 0.85);
          box-shadow: none;
        }
        .gd-system-popup .leaflet-popup-close-button {
          display: none;
        }
        .leaflet-popup {
          z-index: 40;
        }
        .leaflet-marker-icon,
        .leaflet-marker-shadow {
          z-index: 20;
        }
      `}</style>
    </div>
  );
}
