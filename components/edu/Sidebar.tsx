import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Leaf, TrendingUp } from "lucide-react";
import { eduNavItems, eduProfile, eduSuggestedTopics, eduTrendingPosts } from "@/lib/edu/feed";

type EduSidebarProps = {
  side: "left" | "right";
};

export function EduSidebar({ side }: EduSidebarProps) {
  if (side === "left") {
    return (
      <aside className="sticky top-24 hidden h-fit space-y-6 lg:block">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <Image src="/logo.png" alt="Green Duty" width={30} height={30} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Green Duty</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">EDU Feed</div>
            </div>
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Navigation
          </div>
          <div className="mt-4 space-y-2">
            {eduNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#1E7F43]/10 hover:text-[#1E7F43] dark:text-slate-300"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            AI Verified Only
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Every post is checked for scientific accuracy, sources, and environmental impact.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-24 hidden h-fit space-y-6 xl:block">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1E7F43]/10 text-sm font-semibold text-[#1E7F43]">
            {eduProfile.avatar}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{eduProfile.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{eduProfile.role}</div>
          </div>
        </div>
        <Link
          href="/profile"
          className="mt-4 block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-600 transition hover:border-[#1E7F43] hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          View Profile
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <TrendingUp className="h-4 w-4 text-[#1E7F43]" />
          Suggested Topics
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {eduSuggestedTopics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Leaf className="h-4 w-4 text-[#1E7F43]" />
          Trending EDU
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {eduTrendingPosts.map((trend) => (
            <div key={trend} className="flex items-center justify-between">
              <span>{trend}</span>
              <span className="text-xs text-[#1E7F43]">View</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          AI Verification Flow
        </div>
        <ol className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <li>1. Upload content</li>
          <li>2. AI scans text, images, and captions</li>
          <li>3. Status: Verified, Needs Review, or Rejected</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Green Duty Mission
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Empower every farmer with verified knowledge for a healthier planet.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          Admin Tools
        </div>
        <Link
          href="/education/review"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        >
          Review Queue
        </Link>
      </div>
    </aside>
  );
}
