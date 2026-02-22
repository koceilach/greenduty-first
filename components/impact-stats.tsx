"use client";

import { useEffect, useState, useRef, useMemo, type ComponentType } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { MapPin, Users, Leaf, Award, X } from "lucide-react";
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
  start = false,
}: {
  target: number;
  duration?: number;
  suffix?: string;
  start?: boolean;
}) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!start || startedRef.current) return;
    startedRef.current = true;

    let startTime: number | null = null;
    let animationFrame = 0;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [start, target, duration]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function ImpactStats() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const [isReportOpen, setIsReportOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const sectionInView = useInView(sectionRef, {
    once: true,
    margin: "-10% 0px -10% 0px",
    amount: 0.15,
  });
  const stats = useMemo(
    () =>
      statConfigs.map((stat) => ({
        ...stat,
        label: t(stat.labelKey),
        description: t(stat.descriptionKey),
      })),
    [t]
  );
  const reportCoverage = useMemo(
    () => [
      {
        id: "wilayas",
        label: t("landing.impact.report.coverage.wilayas.label"),
        value: t("landing.impact.report.coverage.wilayas.value"),
        copy: t("landing.impact.report.coverage.wilayas.copy"),
        progress: 82,
      },
      {
        id: "hubs",
        label: t("landing.impact.report.coverage.hubs.label"),
        value: t("landing.impact.report.coverage.hubs.value"),
        copy: t("landing.impact.report.coverage.hubs.copy"),
        progress: 74,
      },
      {
        id: "sla",
        label: t("landing.impact.report.coverage.sla.label"),
        value: t("landing.impact.report.coverage.sla.value"),
        copy: t("landing.impact.report.coverage.sla.copy"),
        progress: 93,
      },
    ],
    [t]
  );
  const reportMilestones = useMemo(
    () => [
      {
        id: "q1",
        title: t("landing.impact.report.timeline.q1.title"),
        copy: t("landing.impact.report.timeline.q1.copy"),
      },
      {
        id: "q2",
        title: t("landing.impact.report.timeline.q2.title"),
        copy: t("landing.impact.report.timeline.q2.copy"),
      },
      {
        id: "q3",
        title: t("landing.impact.report.timeline.q3.title"),
        copy: t("landing.impact.report.timeline.q3.copy"),
      },
    ],
    [t]
  );
  const reportFocusItems = useMemo(
    () => [
      t("landing.impact.report.focus.item1"),
      t("landing.impact.report.focus.item2"),
      t("landing.impact.report.focus.item3"),
    ],
    [t]
  );
  const [spotlightStat, ...trailStats] = stats;

  useEffect(() => {
    if (!isReportOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReportOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isReportOpen]);

  return (
    <section
      ref={sectionRef}
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
                  <CountUp
                    target={spotlightStat.value}
                    suffix={spotlightStat.suffix}
                    start={sectionInView}
                  />
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
                      <CountUp
                        target={stat.value}
                        suffix={stat.suffix}
                        start={sectionInView}
                      />
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
            onClick={() => setIsReportOpen(true)}
            className="rounded-full border border-emerald-300/40 bg-emerald-400/18 px-6 py-2.5 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-200/70 hover:bg-emerald-400/28 light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20"
          >
            {t("landing.impact.cta")}
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {isReportOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[140] flex items-end bg-slate-950/68 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            onClick={() => setIsReportOpen(false)}
            aria-hidden={!isReportOpen}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative mx-auto flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-emerald-300/25 bg-slate-950/98 shadow-[0_24px_80px_rgba(10,14,28,0.55)] light:border-emerald-600/25 light:bg-white sm:h-[min(88vh,900px)] sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("landing.impact.report.title")}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_46%)] light:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_52%)]" />

              <header className="relative z-10 border-b border-white/10 px-4 pb-4 pt-4 light:border-slate-200 sm:px-6 sm:pb-6 sm:pt-5">
                <div className={`flex items-start justify-between gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                  <div className={`space-y-2 ${isArabic ? "text-right" : "text-left"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 light:text-emerald-700">
                      {t("landing.impact.report.eyebrow")}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-100 light:text-slate-900 sm:text-3xl">
                      {t("landing.impact.report.title")}
                    </h3>
                    <p className="max-w-2xl text-sm text-slate-300 light:text-slate-600 sm:text-[15px]">
                      {t("landing.impact.report.subtitle")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition-colors hover:border-emerald-300/55 hover:bg-emerald-400/15 light:border-slate-300 light:bg-slate-100 light:text-slate-700 light:hover:border-emerald-500/50 light:hover:bg-emerald-100"
                    aria-label={t("landing.impact.report.close")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-300 light:text-slate-600 sm:grid-cols-2 sm:gap-4 sm:text-sm">
                  <div className="rounded-xl border border-white/12 bg-white/[0.02] p-3 light:border-slate-200 light:bg-slate-50/80">
                    <p className="font-semibold text-slate-100 light:text-slate-800">
                      {t("landing.impact.report.periodLabel")}
                    </p>
                    <p className="mt-1">{t("landing.impact.report.periodValue")}</p>
                  </div>
                  <div className="rounded-xl border border-white/12 bg-white/[0.02] p-3 light:border-slate-200 light:bg-slate-50/80">
                    <p className="font-semibold text-slate-100 light:text-slate-800">
                      {t("landing.impact.report.methodLabel")}
                    </p>
                    <p className="mt-1">{t("landing.impact.report.methodValue")}</p>
                  </div>
                </div>
              </header>

              <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <article
                      key={`report-stat-${stat.id}`}
                      className="rounded-2xl border border-emerald-300/18 bg-emerald-400/8 p-4 light:border-emerald-500/20 light:bg-emerald-50"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-300 light:text-slate-600">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-100 light:text-slate-900">
                        {stat.value.toLocaleString()}
                        {stat.suffix}
                      </p>
                      <p className="mt-2 text-xs text-slate-300 light:text-slate-600">{stat.description}</p>
                    </article>
                  ))}
                </section>

                <section className="mt-5">
                  <h4 className={`text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200 light:text-emerald-700 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("landing.impact.report.coverage.title")}
                  </h4>
                  <div className="mt-3 grid gap-3 xl:grid-cols-3">
                    {reportCoverage.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-white/12 bg-white/[0.025] p-4 light:border-slate-200 light:bg-white"
                      >
                        <div className={`flex items-center justify-between gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                          <p className="text-sm font-medium text-slate-100 light:text-slate-900">{item.label}</p>
                          <p className="text-sm font-semibold text-emerald-200 light:text-emerald-700">{item.value}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 light:from-emerald-600 light:to-emerald-400"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-300 light:text-slate-600">{item.copy}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <article className="rounded-2xl border border-white/12 bg-white/[0.025] p-4 light:border-slate-200 light:bg-white">
                    <h4 className={`text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200 light:text-emerald-700 ${isArabic ? "text-right" : "text-left"}`}>
                      {t("landing.impact.report.timeline.title")}
                    </h4>
                    <div className="mt-3 space-y-3">
                      {reportMilestones.map((milestone, index) => (
                        <div
                          key={milestone.id}
                          className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-slate-200 light:bg-slate-50 ${isArabic ? "text-right" : ""}`}
                        >
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400 light:text-slate-500">
                            Q{index + 1}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-100 light:text-slate-900">
                            {milestone.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-300 light:text-slate-600">{milestone.copy}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/12 bg-white/[0.025] p-4 light:border-slate-200 light:bg-white">
                    <h4 className={`text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200 light:text-emerald-700 ${isArabic ? "text-right" : "text-left"}`}>
                      {t("landing.impact.report.focus.title")}
                    </h4>
                    <ul className="mt-3 space-y-2.5">
                      {reportFocusItems.map((item) => (
                        <li
                          key={item}
                          className={`flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 light:border-slate-200 light:bg-slate-50 light:text-slate-700 ${isArabic ? "flex-row-reverse text-right" : ""}`}
                        >
                          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-300 light:bg-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </section>
              </div>

              <footer className="relative z-10 border-t border-white/10 px-4 py-3 light:border-slate-200 sm:px-6 sm:py-4">
                <p className={`text-xs text-slate-300 light:text-slate-600 ${isArabic ? "text-right" : "text-left"}`}>
                  {t("landing.impact.report.note")}
                </p>
              </footer>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
