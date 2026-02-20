"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bolt,
  Clock3,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const DISCORD_LOCK_DURATION_MS = 48 * 60 * 60 * 1000;
const DISCORD_UNLOCK_AT_STORAGE_KEY = "greenduty.discord.unlockAt";
const DISCORD_JOIN_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? "https://discord.com";

const communityLeaders = [
  { name: "Stimanios Boukrif", reports: "5/8", score: 45, tone: "bg-emerald-400" },
  { name: "Massiwan Boukrif", reports: "5/8", score: 19, tone: "bg-rose-400" },
  { name: "Koceila ch", reports: "5/8", score: 60, tone: "bg-cyan-400" },
];

const featureTiles = [
  {
    id: "respond",
    titleKey: "landing.discord.features.respond.title",
    descriptionKey: "landing.discord.features.respond.description",
    icon: Bolt,
  },
  {
    id: "scale",
    titleKey: "landing.discord.features.scale.title",
    descriptionKey: "landing.discord.features.scale.description",
    icon: Users,
  },
  {
    id: "moderate",
    titleKey: "landing.discord.features.moderate.title",
    descriptionKey: "landing.discord.features.moderate.description",
    icon: ShieldCheck,
  },
  {
    id: "launch",
    titleKey: "landing.discord.features.launch.title",
    descriptionKey: "landing.discord.features.launch.description",
    icon: Rocket,
  },
] as const;

function formatCountdown(timeLeftMs: number) {
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DiscordCommunity() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const [isJoinLocked, setIsJoinLocked] = useState(true);
  const [timeLeftMs, setTimeLeftMs] = useState(DISCORD_LOCK_DURATION_MS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUnlockAt = Number(window.localStorage.getItem(DISCORD_UNLOCK_AT_STORAGE_KEY));
    const unlockAt =
      Number.isFinite(savedUnlockAt) && savedUnlockAt > 0
        ? savedUnlockAt
        : Date.now() + DISCORD_LOCK_DURATION_MS;

    if (!Number.isFinite(savedUnlockAt) || savedUnlockAt <= 0) {
      window.localStorage.setItem(DISCORD_UNLOCK_AT_STORAGE_KEY, String(unlockAt));
    }

    const updateCountdown = () => {
      const remaining = unlockAt - Date.now();

      if (remaining <= 0) {
        setIsJoinLocked(false);
        setTimeLeftMs(0);
        return true;
      }

      setIsJoinLocked(true);
      setTimeLeftMs(remaining);
      return false;
    };

    if (updateCountdown()) return;

    const intervalId = window.setInterval(() => {
      if (updateCountdown()) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const tags = useMemo(
    () => [
      t("landing.discord.tags.live"),
      t("landing.discord.tags.sync"),
      t("landing.discord.tags.mission"),
    ],
    [t]
  );

  const translatedTiles = useMemo(
    () =>
      featureTiles.map((tile) => ({
        ...tile,
        title: t(tile.titleKey),
        description: t(tile.descriptionKey),
      })),
    [t]
  );
  const joinCountdownLabel = useMemo(() => formatCountdown(timeLeftMs), [timeLeftMs]);

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
          className="relative border-y border-white/12 py-7 light:border-slate-300/70"
        >
          <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-slate-100 light:border-slate-400/60 light:text-slate-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight text-slate-100 light:text-slate-900 sm:text-5xl">
                {t("landing.discord.title.line1")}
                <span className="block text-slate-300 light:text-slate-600">
                  {t("landing.discord.title.line2")}
                </span>
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 light:text-slate-600">
                {t("landing.discord.copy")}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
                {tags.map((item) => (
                  <span
                    key={item}
                    className={`inline-flex items-center gap-2 text-xs text-slate-200 light:text-slate-700 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 light:bg-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
              className="space-y-5"
            >
              <div className="border-b border-white/12 pb-4 light:border-slate-300/70">
                <div
                  className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${
                    isArabic ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300 light:text-slate-600">
                    {t("landing.discord.performance.title")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-100 light:text-cyan-700">
                    <Clock3 className="h-3 w-3" />
                    {t("landing.discord.performance.due")}
                  </span>
                </div>
                <p className="text-3xl font-semibold text-white light:text-slate-900">
                  {t("landing.discord.performance.value")}
                </p>
                <p className="text-xs text-slate-300 light:text-slate-600">
                  {t("landing.discord.performance.copy")}
                </p>
              </div>

              <div className="space-y-3">
                {communityLeaders.map((member) => (
                  <div key={member.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="truncate text-xs text-slate-200 light:text-slate-700">{member.name}</p>
                    <p className="text-xs text-slate-400 light:text-slate-500">{member.reports}</p>
                    <div className="h-1.5 rounded-full bg-white/10 light:bg-slate-300/70">
                      <div
                        className={`h-full rounded-full ${member.tone}`}
                        style={{ width: `${member.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="mt-8 grid border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4 light:border-slate-300/70">
            {translatedTiles.map((tile, index) => (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className={`border-b border-white/10 p-4 last:border-b-0 sm:border-b-0 sm:border-white/10 light:border-slate-300/70 ${
                  isArabic ? "sm:border-l sm:last:border-l-0" : "sm:border-r sm:last:border-r-0"
                }`}
              >
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-slate-100 light:border-slate-400/60 light:text-slate-700">
                  <tile.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-medium text-slate-100 light:text-slate-900">{tile.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 light:text-slate-600">
                  {tile.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.a
            href={isJoinLocked ? undefined : DISCORD_JOIN_URL}
            aria-disabled={isJoinLocked}
            tabIndex={isJoinLocked ? -1 : 0}
            whileHover={isJoinLocked ? undefined : { x: 4 }}
            onClick={(event) => {
              if (isJoinLocked) event.preventDefault();
            }}
            className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold transition ${
              isJoinLocked
                ? "cursor-not-allowed text-amber-200/90 light:text-amber-700/90"
                : "text-emerald-200 hover:text-emerald-100 light:text-emerald-700 light:hover:text-emerald-800"
            } ${
              isArabic ? "flex-row-reverse" : ""
            }`}
          >
            {isJoinLocked
              ? `${t("landing.services.status.soon")} (${joinCountdownLabel})`
              : t("landing.discord.cta")}
            {isJoinLocked ? (
              <Clock3 className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className={`h-3.5 w-3.5 ${isArabic ? "-scale-x-100" : ""}`} />
            )}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
