"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { eduNavItems } from "@/lib/edu/feed";

export function EduNavbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const topIcons = eduNavItems.filter((item) => item.label !== "Home");
  const isDark = theme === "green";

  useEffect(() => { setMounted(true); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/education/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-3 sm:h-16 sm:px-6 lg:px-8">
        {/* Logo + brand */}
        <div className="flex flex-1 items-center gap-2 sm:gap-3">
          <Link href="/education" className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:h-9 sm:w-9">
            <Image src="/logo.png" alt="Green Duty" width={28} height={28} className="h-6 w-6 sm:h-7 sm:w-7" />
          </Link>
          <span className="hidden text-sm font-semibold text-slate-800 dark:text-slate-100 sm:block">
            Green Duty
          </span>
        </div>

        {/* Center badge */}
        <div className="flex flex-1 justify-center">
          <span className="text-xs font-semibold tracking-[0.2em] text-[#1E7F43] sm:text-sm">EDU</span>
        </div>

        {/* Desktop nav icons */}
        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "green")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:h-9 sm:w-9"
            aria-label="Toggle theme"
          >
            {mounted ? (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <span className="h-4 w-4" />}
          </button>
          {/* Desktop-only nav icons */}
          {topIcons.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:inline-flex"
              aria-label={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 dark:border-red-800/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/20 md:inline-flex"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:hidden sm:h-9 sm:w-9"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            {eduNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition active:bg-[#1E7F43]/10 active:text-[#1E7F43] hover:bg-[#1E7F43]/5 hover:text-[#1E7F43] dark:text-slate-300"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition active:bg-red-50 hover:bg-red-50/50 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
