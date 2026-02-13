"use client";

import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { Button } from "@/components/ui/button";
import type { ProfileState } from "@/lib/profile/useProfileData";
import { useMemo } from "react";
import type { ReactNode } from "react";

type ProfileShellProps = {
  profile: ProfileState;
  loading: boolean;
  activeTab: "posts" | "about" | "photos" | "friends" | "saved";
  headerRight?: ReactNode;
  children: ReactNode;
};

const tabs = [
  { id: "posts", label: "Posts", href: "/profile" },
  { id: "about", label: "About", href: "/profile/about" },
  { id: "photos", label: "Photos", href: "/profile/photos" },
  { id: "friends", label: "Friends", href: "/profile/friends" },
  { id: "saved", label: "Saved", href: "/profile/saved", icon: Bookmark },
] as const;

const statsConfig = [
  { key: "posts", label: "Posts" },
  { key: "likes", label: "Likes" },
  { key: "saves", label: "Saves" },
  { key: "follows", label: "Following" },
  { key: "friends", label: "Friends" },
] as const;

export function ProfileShell({ profile, loading, activeTab, headerRight, children }: ProfileShellProps) {
  const avatarFallback = useMemo(() => profile.avatar.slice(0, 2).toUpperCase(), [profile.avatar]);

  const visibleStats = useMemo(
    () => statsConfig.filter((s) => typeof profile.stats[s.key as keyof typeof profile.stats] === "number"),
    [profile.stats],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0f14]">
      <EduNavbar />

      {/* ═══ COVER ═══ */}
      <div className="relative">
        <div className="h-52 sm:h-64 md:h-72 lg:h-80 w-full overflow-hidden">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 dark:from-emerald-900 dark:via-emerald-800 dark:to-teal-900" />
          )}
          {/* Bottom fade into page */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-[#0a0f14]" />
        </div>
      </div>

      {/* ═══ PROFILE CONTENT ═══ */}
      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">

        {/* ── Avatar + Identity ── */}
        <div className="-mt-20 sm:-mt-24 flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-36 w-36 overflow-hidden rounded-full border-[6px] border-white shadow-2xl shadow-black/10 dark:border-[#0a0f14] sm:h-40 sm:w-40">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 text-3xl font-bold text-emerald-700 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-300 sm:text-4xl">
                  {avatarFallback}
                </div>
              )}
            </div>
            {profile.role === "Expert" && (
              <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 ring-[3px] ring-white dark:ring-[#0a0f14]">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Name + Actions */}
          <div className="mt-4 flex flex-1 flex-col items-center gap-4 sm:mt-0 sm:flex-row sm:items-end sm:justify-between sm:pb-2">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {profile.name}
              </h1>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">{profile.handle}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                {profile.role}
              </span>
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Link href="/profile/edit">
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Bio bar ── */}
        {(profile.bio || loading) && (
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 sm:pl-2 text-center sm:text-left">
            {loading ? (
              <span className="inline-block h-4 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ) : (
              profile.bio
            )}
          </p>
        )}

        {/* ── Info chips ── */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500 dark:text-slate-400 sm:pl-2 justify-center sm:justify-start">
          {profile.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
          {profile.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {profile.phone}
            </span>
          )}
          {profile.education && (
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> {profile.education}
            </span>
          )}
          {profile.work && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {profile.work}
            </span>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="mt-8 flex justify-center gap-10 sm:justify-start sm:gap-12 sm:pl-2">
          {visibleStats.map((stat) => {
            const val = profile.stats[stat.key as keyof typeof profile.stats] ?? 0;
            return (
              <button key={stat.key} type="button" className="group text-center">
                <div className="text-2xl font-bold tabular-nums text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                  {val}
                </div>
                <div className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                  {stat.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="mt-8 border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 px-5 py-3.5 text-sm font-medium transition-colors ${
                    active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {"icon" in tab && tab.icon && <tab.icon className="h-4 w-4" />}
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-900 dark:bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="mt-8 pb-24">
          {headerRight && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">{headerRight}</div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
