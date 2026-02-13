"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Bell, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/education", icon: Home },
  { label: "Search", href: "/education/search", icon: Search },
  { label: "Create", href: "/education/create", icon: PlusSquare },
  { label: "Alerts", href: "/education/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/90 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/90 lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 safe-bottom">
        {navItems.map((item) => {
          const isActive =
            item.href === "/education"
              ? pathname === "/education"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-[#1E7F43]"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive ? "text-[#1E7F43]" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
