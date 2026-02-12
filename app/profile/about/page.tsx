"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { useProfileData } from "@/lib/profile/useProfileData";
import { Award, Briefcase, Calendar, Globe, GraduationCap, MapPin, Phone, User } from "lucide-react";

export default function ProfileAboutPage() {
  const { profile, loading } = useProfileData();

  const detailItems = [
    { icon: MapPin, label: "Location", value: profile.location },
    { icon: Phone, label: "Phone", value: profile.phone },
    { icon: Globe, label: "Website", value: profile.website },
    { icon: GraduationCap, label: "Education", value: profile.education },
    { icon: Briefcase, label: "Work", value: profile.work },
    { icon: Calendar, label: "Birthday", value: profile.dateOfBirth },
    { icon: User, label: "Gender", value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null },
    { icon: Award, label: "Role", value: profile.role },
    { icon: Globe, label: "Handle", value: profile.handle },
  ];

  return (
    <ProfileShell profile={profile} loading={loading} activeTab="about">
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bio */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">About</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {profile.bio || "No bio added yet."}
            </p>
          </section>

          {/* Details */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Details</h3>
            <div className="space-y-3">
              {detailItems.map((item) => {
                const hasValue = item.value && item.value.trim?.();
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                      <item.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</span>
                      <p className={hasValue ? "" : "text-slate-400 italic"}>
                        {item.label === "Website" && hasValue ? (
                          <a
                            href={item.value!.startsWith("http") ? item.value! : `https://${item.value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1E7F43] hover:underline"
                          >
                            {item.value}
                          </a>
                        ) : (
                          hasValue ? item.value : `Not set`
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Stats summary */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Activity</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Posts", value: profile.stats.posts },
                { label: "Likes Received", value: profile.stats.likes },
                { label: "Saves", value: profile.stats.saves },
                { label: "Following", value: profile.stats.follows ?? 0 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </ProfileShell>
  );
}
