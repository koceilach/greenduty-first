"use client";

import React from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Leaf, Sun } from "lucide-react";

const themes = [
  { value: "green", label: "Green", Icon: Leaf },
  { value: "light", label: "Light", Icon: Sun },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLight = theme === "light";
  const shellClass = isLight
    ? "border border-slate-900/10 bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
    : "border border-white/12 bg-black/34 text-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.34)]";
  const inactiveButtonClass = isLight
    ? "text-slate-500 hover:bg-slate-900/8 hover:text-emerald-700"
    : "text-white/70 hover:bg-white/10 hover:text-emerald-200";
  const isReportedGreenPage = pathname?.startsWith("/greenspot/reported-green");
  const positionClass = isReportedGreenPage
    ? "right-3 top-[calc(env(safe-area-inset-top)+8.9rem)] md:right-4 md:top-24"
    : "right-4 top-24";

  return (
    <div className={`pointer-events-auto fixed z-50 flex items-center gap-1 rounded-full p-1 text-xs backdrop-blur-xl ${positionClass} ${shellClass}`}>
      {themes.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`Switch to ${label} mode`}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
              isActive
                ? "border-emerald-200/45 bg-emerald-400 text-emerald-950 shadow-[0_8px_18px_rgba(16,185,129,0.35)]"
                : `border-transparent ${inactiveButtonClass}`
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
