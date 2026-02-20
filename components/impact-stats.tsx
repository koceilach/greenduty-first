"use client";

import { useEffect, useState, useRef, useMemo, type ComponentType } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Users, Leaf, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

type StatConfig = {
  id: number;
  value: number;
  suffix: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  descriptionKey: string;
};

const statConfigs: StatConfig[] = [
  {
    id: 1,
    value: 127,
    suffix: "+",
    labelKey: "landing.impact.stats.cleaned.label",
    icon: MapPin,
    descriptionKey: "landing.impact.stats.cleaned.description",
  },
  {
    id: 2,
    value: 5420,
    suffix: "+",
    labelKey: "landing.impact.stats.users.label",
    icon: Users,
    descriptionKey: "landing.impact.stats.users.description",
  },
  {
    id: 3,
    value: 48,
    suffix: "",
    labelKey: "landing.impact.stats.wilayas.label",
    icon: Leaf,
    descriptionKey: "landing.impact.stats.wilayas.description",
  },
  {
    id: 4,
    value: 15,
    suffix: "K+",
    labelKey: "landing.impact.stats.trees.label",
    icon: Award,
    descriptionKey: "landing.impact.stats.trees.description",
  },
];

function CountUp({
  target,
  duration = 2,
  suffix = "",
}: {
  target: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function ImpactStats() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const stats = useMemo(
    () =>
      statConfigs.map((stat) => ({
        ...stat,
        label: t(stat.labelKey),
        description: t(stat.descriptionKey),
      })),
    [t]
  );
  const [spotlightStat, ...trailStats] = stats;

  return (
    <section
      id="events"
      className={`relative scroll-mt-24 overflow-hidden bg-transparent py-12 text-slate-100 sm:py-16 lg:py-24 ${
        isArabic ? "text-right" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-700">
            {t("landing.impact.badge")}
          </span>
          <h2 className="mb-4 mt-5 text-3xl font-bold text-slate-100 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.impact.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 light:text-slate-600">
            {t("landing.impact.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`border-emerald-300/45 ${
              isArabic ? "border-r-2 pr-4 sm:pr-6" : "border-l-2 pl-4 sm:pl-6"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300 light:text-slate-600">
              {t("landing.impact.spotlight")}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-100 light:text-slate-900 sm:text-3xl">
              {spotlightStat.label}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-300 light:text-slate-600">
              {spotlightStat.description}. {t("landing.impact.spotlight.copy")}
            </p>

            <div
              className={`mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 ${
                isArabic ? "items-end sm:flex-row-reverse" : "items-start"
              }`}
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700 sm:h-24 sm:w-24">
                <spotlightStat.icon className="h-8 w-8" />
              </div>

              <div className={isArabic ? "text-right" : ""}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                  {t("landing.impact.currentValue")}
                </p>
                <p className="mt-1 text-4xl font-bold text-slate-100 light:text-slate-900 sm:text-6xl">
                  <CountUp target={spotlightStat.value} suffix={spotlightStat.suffix} />
                </p>
                <p className="mt-2 text-sm text-slate-300 light:text-slate-600">
                  {t("landing.impact.currentValue.copy")}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {[
                t("landing.impact.badges.verified"),
                t("landing.impact.badges.realtime"),
                t("landing.impact.badges.community"),
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-xs text-slate-200 light:text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 light:bg-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="relative border-y border-white/10 light:border-slate-300/70">
            <div
              className={`pointer-events-none absolute bottom-2 top-2 w-px bg-gradient-to-b from-emerald-300/45 via-white/18 to-transparent light:via-slate-300/30 ${
                isArabic ? "right-[6px]" : "left-[6px]"
              }`}
            />
            <div className="space-y-0">
              {trailStats.map((stat, i) => (
                <motion.article
                  key={stat.id}
                  initial={{ opacity: 0, x: 22 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                  className={`relative grid grid-cols-[auto_1fr] gap-3 border-b border-white/10 py-4 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4 light:border-slate-300/70 ${
                    isArabic ? "pl-1" : "pr-1"
                  }`}
                >
                  <span className="mt-2 h-3 w-3 rounded-full border border-emerald-300/40 bg-emerald-300/70 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />

                  <div>
                    <p className="text-sm font-medium text-slate-100 light:text-slate-900">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-100 light:text-slate-900 sm:text-4xl">
                      <CountUp target={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-1 text-xs text-slate-300 light:text-slate-600">{stat.description}</p>
                  </div>

                  <div className="col-span-2 mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-slate-100 sm:col-span-1 light:border-slate-400/60 light:text-slate-700">
                    <stat.icon className="h-4.5 w-4.5" />
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-emerald-300/40 bg-emerald-400/18 px-6 py-2.5 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-200/70 hover:bg-emerald-400/28 light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20"
          >
            {t("landing.impact.cta")}
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
