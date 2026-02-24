"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  User,
  Plus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { ActionModal } from "@/components/ActionModal";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

type ActionItem = {
  key: string;
  label: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  content: ReactNode;
};

type MainLayoutProps = {
  children: ReactNode;
  navItems?: NavItem[];
  actionItems?: ActionItem[];
  brand?: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  contentClassName?: string;
};

const defaultNavItems: NavItem[] = [
  { key: "home", label: "Home", href: "/education", icon: Home },
  { key: "search", label: "Search", href: "/education/search", icon: Search },
  { key: "profile", label: "Profile", href: "/profile", icon: User },
];

const defaultActionItems: ActionItem[] = [
  {
    key: "create-post",
    label: "Create",
    title: "Create Content",
    description: "Publish a post, reel, or event from one place.",
    icon: Plus,
    content: (
      <div className="space-y-3">
        <Link
          href="/education/create"
          className="flex h-14 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-semibold text-white active:scale-[0.97] transition-all duration-200"
        >
          Go to Create Dashboard
        </Link>
        <p className="text-sm text-slate-500">
          Replace this content with your quick-create form if needed.
        </p>
      </div>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    title: "App Settings",
    description: "Theme, notifications, and account preferences.",
    icon: Settings2,
    content: (
      <div className="space-y-3">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 active:scale-[0.97] transition-all duration-200"
        >
          Open Theme Settings
        </button>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 active:scale-[0.97] transition-all duration-200"
        >
          Manage Notifications
        </button>
      </div>
    ),
  },
];

const springTap = { type: "spring", stiffness: 420, damping: 22 } as const;

export function MainLayout({
  children,
  navItems = defaultNavItems,
  actionItems = defaultActionItems,
  brand,
  rightRail,
  className,
  contentClassName,
}: MainLayoutProps) {
  const pathname = usePathname();
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);

  const activeAction = useMemo(
    () => actionItems.find((item) => item.key === activeActionKey) ?? null,
    [actionItems, activeActionKey]
  );

  return (
    <div className={cn("app-shell bg-slate-50 text-slate-900", className)}>
      <div className="mx-auto grid w-full max-w-[1520px] grid-cols-1 gap-4 px-3 pb-[calc(5.8rem+env(safe-area-inset-bottom,0px))] pt-3 md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 md:px-6 md:pb-6 md:pt-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="hidden md:block">
          <div className="sticky top-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
            <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
              {brand ?? "Greenduty"}
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <motion.div key={item.key} whileTap={{ scale: 0.95 }} transition={springTap}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="mt-4 space-y-2">
              {actionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={springTap}
                    onClick={() => setActiveActionKey(item.key)}
                    className="flex h-12 w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className={cn("min-w-0", contentClassName)}>{children}</main>

        <aside className="hidden xl:block">{rightRail}</aside>
      </div>

      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.7rem)] z-40 md:hidden">
        <div className="rounded-3xl border border-slate-100 bg-white p-1.5 shadow-[0_24px_40px_-25px_rgba(15,23,42,0.32)]">
          <div className="grid grid-cols-5 gap-1">
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <motion.div key={item.key} whileTap={{ scale: 0.95 }} transition={springTap}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center rounded-2xl text-[11px] font-semibold",
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-500"
                    )}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}

            {actionItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.key}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  transition={springTap}
                  onClick={() => setActiveActionKey(item.key)}
                  className="flex h-12 flex-col items-center justify-center rounded-2xl text-[11px] font-semibold text-slate-600 active:scale-[0.97]"
                >
                  <Icon className="mb-1 h-4 w-4" />
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      <ActionModal
        open={Boolean(activeAction)}
        onOpenChange={(open) => {
          if (!open) setActiveActionKey(null);
        }}
        title={activeAction?.title ?? ""}
        description={activeAction?.description}
      >
        {activeAction?.content ?? null}
      </ActionModal>
    </div>
  );
}
