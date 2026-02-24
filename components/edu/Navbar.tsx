"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { eduNavItems } from "@/lib/edu/feed";

const touch =
  "transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]";

export function EduNavbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const quickItems = eduNavItems.filter(
    (item) =>
      item.href === "/education/reels" ||
      item.href === "/education/search" ||
      item.href === "/education/create" ||
      item.href === "/education/notifications"
  );
  const activeTheme = resolvedTheme ?? theme ?? "green";
  const isDark = activeTheme === "green";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/education/login");
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex min-h-[4.25rem] items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:min-h-[5rem] sm:gap-3 sm:px-5">
          <Link
            href="/education"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white sm:h-12 sm:w-12 ${touch}`}
          >
            <Image src="/logo.png" alt="Green Duty" width={26} height={26} className="h-6 w-6" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">GreenDuty Learning</p>
            <p className="truncate text-xs text-slate-500">Social Learning Feed</p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {quickItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${touch} ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => setTheme(isDark ? "light" : "green")}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-500 ring-1 ring-gray-100 hover:bg-gray-50 hover:text-gray-900 sm:h-12 sm:w-12 ${touch}`}
            aria-label="Toggle theme"
            type="button"
          >
            {mounted ? (isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />) : <Search className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLogout}
            className={`hidden h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-gray-700 ring-1 ring-gray-100 hover:bg-gray-50 md:inline-flex ${touch}`}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-gray-50 sm:h-12 sm:w-12 md:hidden ${touch}`}
            aria-label="Menu"
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mt-3 max-h-[calc(100dvh-8.75rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:hidden">
            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
              {eduNavItems.map((item) => {
                const active = item.href === "/education" ? pathname === "/education" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold ${touch} ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className={`mt-1 flex h-11 w-full items-center gap-3 rounded-xl bg-white px-4 text-sm font-semibold text-gray-700 ring-1 ring-gray-100 hover:bg-gray-50 min-[430px]:col-span-2 ${touch}`}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
