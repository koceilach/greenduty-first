"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, Search, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/education", icon: Home },
  { label: "Search", href: "/education/search", icon: Search },
  { label: "Reels", href: "/education/reels", icon: Clapperboard },
  { label: "Profile", href: "/profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom,0px),0.65rem)] pt-2 md:hidden">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
        <div className="grid grid-cols-4 gap-1.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/education"
                ? pathname === "/education"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-[3.15rem] flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition-all duration-200 ease-in-out hover:bg-gray-50 active:scale-[0.98] ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                <span className="mt-0.5 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
