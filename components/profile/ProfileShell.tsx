"use client";

import Link from "next/link";
import { Bookmark, Briefcase, CheckCircle2, GraduationCap, MapPin, Pencil, Phone } from "lucide-react";
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

export function ProfileShell({ profile, loading, activeTab, headerRight, children }: ProfileShellProps) {
  const avatarFallback = useMemo(() => profile.avatar.slice(0, 2).toUpperCase(), [profile.avatar]);

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <div className="h-56 bg-gradient-to-br from-emerald-200 via-emerald-50 to-white dark:from-emerald-900/30 dark:via-slate-900 dark:to-slate-950">
              {profile.coverUrl ? (
                <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400">
                  Cover
                </div>
              )}
            </div>
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 sm:left-8 sm:translate-x-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[#1E7F43]/10 text-2xl font-semibold text-[#1E7F43] shadow-lg dark:border-slate-900">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{avatarFallback}</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-16">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-center text-center sm:items-start sm:text-left sm:pl-32">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {profile.name}
                  {profile.role === "Expert" && <CheckCircle2 className="h-4 w-4 text-[#1E7F43]" />}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{profile.handle}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {profile.role}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-300 lg:justify-end">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Posts</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.stats.posts}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Likes</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.stats.likes}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Saves</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.stats.saves}</div>
                </div>
                {typeof profile.stats.follows === "number" && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Follows</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {profile.stats.follows}
                    </div>
                  </div>
                )}
                <Button asChild size="sm" className="rounded-full bg-[#1E7F43] text-white hover:bg-[#166536]">
                  <Link href="/profile/edit">
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:justify-start">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {"icon" in tab && tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Intro</div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {loading ? "Loading profile..." : profile.bio}
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>{profile.location || "Add location"}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    <span>{profile.education}</span>
                  </div>
                )}
                {profile.work && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span>{profile.work}</span>
                  </div>
                )}
              </div>
              <Button
                asChild
                size="sm"
                className="mt-4 w-full rounded-full border border-slate-200 bg-white text-slate-600 hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <Link href="/profile/edit">Edit Details</Link>
              </Button>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">{headerRight}</div>
            <div className="mt-5">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
