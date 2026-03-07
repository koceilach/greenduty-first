"use client";

import { motion } from "framer-motion";
import {
  Clock3,
  Lock,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const comingSoonFeatures = [
  {
    icon: Sparkles,
    title: "Live mission rooms",
    copy: "Real-time coordination channels for local actions.",
  },
  {
    icon: Users,
    title: "Expert-led discussions",
    copy: "Farmers and mentors sharing practical guidance.",
  },
  {
    icon: Lock,
    title: "Moderated community",
    copy: "Verified, safe, and mission-focused participation.",
  },
] as const;

export function DiscordCommunity() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  return (
    <section
      id="discord-community"
      className={`relative scroll-mt-24 overflow-hidden bg-transparent py-12 text-slate-100 sm:py-16 lg:py-24 ${
        isArabic ? "text-right" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-slate-950/75 via-emerald-950/45 to-cyan-950/35 px-6 py-10 light:border-emerald-200/70 light:from-emerald-50/90 light:via-white light:to-cyan-50/70 sm:px-8 sm:py-12"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl light:bg-emerald-300/40" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl light:bg-cyan-300/30" />

          <div className="relative z-10 max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 ${isArabic ? "flex-row-reverse tracking-normal" : ""}`}>
              <MessageCircle className="h-3.5 w-3.5" />
              Discord
            </div>

            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white light:text-slate-900 sm:text-5xl">
              {t("landing.discord.title.line1")}
              <span className="block text-emerald-200 light:text-emerald-700">
                {t("landing.services.status.soon")}
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/90 light:text-slate-600 sm:text-base">
              We are preparing the GreenDuty Discord space. The section is currently closed while we finalize channels, moderation, and mission workflows.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100 light:border-amber-500/35 light:bg-amber-500/10 light:text-amber-700">
              <Clock3 className="h-3.5 w-3.5" />
              Coming Soon
            </div>
          </div>

          <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-3">
            {comingSoonFeatures.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm light:border-slate-200/80 light:bg-white/85">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white light:border-emerald-300/80 light:bg-emerald-50 light:text-emerald-700">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white light:text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300 light:text-slate-600">{item.copy}</p>
              </div>
            ))}
          </div>

          <div className={`relative z-10 mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-900/30 px-4 py-2 text-xs font-medium text-slate-100 light:border-slate-300/70 light:bg-white light:text-slate-700 ${isArabic ? "flex-row-reverse" : ""}`}>
            <Lock className="h-3.5 w-3.5" />
            Community access will open in a future update.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
