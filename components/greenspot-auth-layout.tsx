"use client";

import type { ReactNode } from "react";
import { Leaf, Sparkles } from "lucide-react";

const defaultSideTitle = "Plant change where it matters.";
const defaultSideSubtitle = "Report, verify, and care for community green zones with GreenSpot.";

export function GreenspotAuthLayout({
  title,
  subtitle,
  eyebrow = "Welcome",
  children,
  footer,
  sideTitle = defaultSideTitle,
  sideSubtitle = defaultSideSubtitle,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
  footer: ReactNode;
  sideTitle?: string;
  sideSubtitle?: string;
}) {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900 dark:from-[#0b1512] dark:via-[#0b1512] dark:to-[#0f221b] dark:text-white green:from-[#0b1512] green:via-[#0b1512] green:to-[#0f221b] green:text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden lg:flex">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300 px-12 py-16">
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-700/40 blur-3xl" style={{ animation: "greenspotFloat 16s ease-in-out infinite" }} />
            <div className="absolute -right-16 top-14 h-48 w-48 rounded-full border border-white/40" style={{ animation: "greenspotFloat 12s ease-in-out infinite" }} />
            <div className="absolute left-16 top-16 h-28 w-28 rounded-full bg-white/25 blur-2xl" style={{ animation: "greenspotDrift 18s ease-in-out infinite" }} />
            <div className="absolute bottom-10 right-24 h-16 w-16 rounded-full bg-white/20 blur-xl" style={{ animation: "greenspotDrift 14s ease-in-out infinite" }} />

            <div className="relative z-10 max-w-md">
              <GreenspotAuthIllustration />
              <div className="mt-10 rounded-[28px] bg-white/20 p-6 text-white shadow-2xl backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
                  <Sparkles className="h-4 w-4" />
                  GreenSpot
                </div>
                <h2 className="mt-3 text-3xl font-semibold">{sideTitle}</h2>
                <p className="mt-2 text-sm text-white/80">{sideSubtitle}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300 p-5 text-white shadow-xl lg:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">GreenSpot</p>
                  <h2 className="mt-2 text-2xl font-semibold">Grow the city green.</h2>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Leaf className="h-7 w-7" />
                </div>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Track reports, missions, and care reminders from one place.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/60 bg-white/90 p-5 sm:p-8 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur dark:border-emerald-200/20 dark:bg-[#0f1d18]/90 green:border-emerald-200/20 green:bg-[#0f1d18]/90">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                  <Leaf className="h-7 w-7" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-500 dark:text-emerald-200 green:text-emerald-200">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white green:text-white">{title}</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/60 green:text-white/60">{subtitle}</p>
              </div>

              <div className="mt-6">{children}</div>
            </div>

            <div className="mt-6 text-center text-xs text-emerald-700/70 dark:text-emerald-200/70 green:text-emerald-200/70">{footer}</div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes greenspotFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-16px);
          }
        }
        @keyframes greenspotDrift {
          0%,
          100% {
            transform: translate(0px, 0px);
          }
          50% {
            transform: translate(12px, -10px);
          }
        }
      `}</style>
    </main>
  );
}

function GreenspotAuthIllustration() {
  return (
    <div className="relative">
      <div className="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-white/35 blur-xl" />
      <div className="absolute -right-6 top-6 h-20 w-20 rounded-full bg-white/25 blur-xl" />
      <svg
        viewBox="0 0 360 320"
        className="w-full max-w-sm"
        role="img"
        aria-label="GreenSpot mobile reporting illustration"
      >
        <defs>
          <linearGradient id="phoneBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
        <rect x="90" y="20" width="180" height="280" rx="28" fill="url(#phoneBody)" />
        <rect x="106" y="36" width="148" height="248" rx="22" fill="url(#screen)" />
        <rect x="150" y="30" width="60" height="10" rx="5" fill="#0f172a" opacity="0.2" />
        <circle cx="180" cy="118" r="16" fill="#fde68a" />
        <rect x="156" y="136" width="48" height="46" rx="14" fill="#fef3c7" />
        <rect x="146" y="178" width="68" height="42" rx="18" fill="#0f766e" />
        <rect x="132" y="214" width="96" height="24" rx="12" fill="#047857" />
        <circle cx="120" cy="92" r="12" fill="#ecfeff" opacity="0.7" />
        <circle cx="244" cy="88" r="9" fill="#ecfeff" opacity="0.6" />
        <path
          d="M54 248c20-18 36-20 52-10-8 18-22 32-44 32-6 0-10-6-8-22z"
          fill="#bbf7d0"
          opacity="0.9"
        />
        <path
          d="M300 238c-18-10-32-10-44 2 10 18 24 26 40 22 6-2 8-10 4-24z"
          fill="#bbf7d0"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
