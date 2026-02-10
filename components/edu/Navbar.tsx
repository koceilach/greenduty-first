"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { eduNavItems } from "@/lib/edu/feed";

export function EduNavbar() {
  const { theme, setTheme } = useTheme();
  const topIcons = eduNavItems.filter((item) => item.label !== "Home");
  const isDark = theme === "dark";
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <Image src="/logo.png" alt="Green Duty" width={28} height={28} />
          </div>
          <span className="hidden text-sm font-semibold text-slate-800 dark:text-slate-100 sm:block">
            Green Duty
          </span>
        </div>
        <div className="flex flex-1 justify-center">
          <span className="text-sm font-semibold tracking-[0.2em] text-[#1E7F43]">EDU</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {topIcons.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
