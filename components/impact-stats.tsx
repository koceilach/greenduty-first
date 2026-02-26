"use client";

import { useEffect, useState, useRef, useMemo, type ComponentType } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  Leaf,
  MapPin,
  Sparkles,
  Users,
  X,
} from "lucide-react";
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
  const reportHighlights = useMemo(
    () => [
      t("landing.impact.badges.verified"),
      t("landing.impact.badges.realtime"),
      t("landing.impact.badges.community"),
    ],
    [t]
  );
  const reportHealthScore = useMemo(
    () =>
      Math.round(
        reportCoverage.reduce((accumulator, item) => accumulator + item.progress, 0) /
          reportCoverage.length
      ),
    [reportCoverage]
  );
  const reportGaugeStyle = useMemo(
    () => ({
      background: `conic-gradient(from 190deg, rgba(52,211,153,0.95) 0 ${reportHealthScore}%, rgba(56,189,248,0.82) ${reportHealthScore}% ${Math.min(reportHealthScore + 8, 100)}%, rgba(148,163,184,0.26) ${Math.min(reportHealthScore + 8, 100)}% 100%)`,
    }),
    [reportHealthScore]
  );
  const [spotlightStat, ...trailStats] = stats;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isReportOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReportOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(focusFrame);
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
                isArabic ? "w-full items-end sm:flex-row-reverse sm:justify-end" : "items-start"
              }`}
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700 sm:h-24 sm:w-24">
                <spotlightStat.icon className="h-8 w-8" />
              </div>

              <div className={isArabic ? "w-full text-right sm:w-auto" : ""}>
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
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-[140] flex items-end bg-slate-950/72 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
            onClick={() => setIsReportOpen(false)}
            aria-hidden={!isReportOpen}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_88%_at_50%_-12%,rgba(52,211,153,0.3),transparent_58%),radial-gradient(95%_70%_at_100%_100%,rgba(56,189,248,0.22),transparent_66%)] light:bg-[radial-gradient(120%_88%_at_50%_-12%,rgba(16,185,129,0.2),transparent_58%),radial-gradient(95%_70%_at_100%_100%,rgba(14,165,233,0.18),transparent_66%)]" />
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 42, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.985 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="relative mx-auto flex h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[30px] border border-white/14 bg-slate-950/96 shadow-[0_40px_120px_rgba(2,6,23,0.58)] light:border-slate-300/80 light:bg-white sm:h-[min(90vh,920px)] sm:rounded-[30px]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("landing.impact.report.title")}
              aria-describedby="impact-report-description"
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_90%_at_50%_-10%,rgba(16,185,129,0.24),transparent_56%),radial-gradient(130%_95%_at_0%_100%,rgba(56,189,248,0.14),transparent_64%)] light:bg-[radial-gradient(140%_90%_at_50%_-10%,rgba(16,185,129,0.16),transparent_56%),radial-gradient(130%_95%_at_0%_100%,rgba(14,165,233,0.12),transparent_64%)]" />

              <header className="relative z-20 border-b border-white/10 px-4 pb-5 pt-4 light:border-slate-200 sm:px-7 sm:pb-6 sm:pt-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent light:from-emerald-100/60" />

                <div className={`relative flex items-start justify-between gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                  <div className={`min-w-0 space-y-2 ${isArabic ? "text-right" : "text-left"}`}>
                    <p
                      className={`text-xs font-semibold text-emerald-200 light:text-emerald-700 ${
                        isArabic ? "tracking-normal" : "uppercase tracking-[0.2em]"
                      }`}
                    >
                      {t("landing.impact.report.eyebrow")}
                    </p>
                    <h3 className="text-balance text-2xl font-bold text-slate-100 light:text-slate-900 sm:text-3xl">
                      {t("landing.impact.report.title")}
                    </h3>
                    <p id="impact-report-description" className="max-w-3xl text-sm text-slate-300 light:text-slate-600 sm:text-[15px]">
                      {t("landing.impact.report.subtitle")}
                    </p>

                    <div className={`mt-3 flex flex-wrap gap-2 ${isArabic ? "justify-end" : ""}`}>
                      {reportHighlights.map((item) => (
                        <span
                          key={`report-chip-${item}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-emerald-400/12 px-3 py-1 text-[11px] text-emerald-100 light:border-emerald-500/30 light:bg-emerald-100 light:text-emerald-700 ${
                            isArabic ? "flex-row-reverse tracking-normal" : "tracking-[0.04em]"
                          }`}
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition-colors hover:border-emerald-300/60 hover:bg-emerald-400/18 light:border-slate-300 light:bg-slate-100 light:text-slate-700 light:hover:border-emerald-500/60 light:hover:bg-emerald-100"
                    aria-label={t("landing.impact.report.close")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative mt-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 light:border-slate-200 light:bg-slate-50/85">
                    <p
                      className={`inline-flex items-center gap-2 text-xs text-emerald-200 light:text-emerald-700 ${
                        isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.18em]"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("landing.impact.report.methodLabel")}
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-slate-200 light:bg-white ${isArabic ? "text-right" : "text-left"}`}>
                        <p className={`inline-flex items-center gap-1.5 text-xs text-slate-300 light:text-slate-600 ${isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.16em]"}`}>
                          <CalendarRange className="h-3.5 w-3.5" />
                          {t("landing.impact.report.periodLabel")}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-slate-100 light:text-slate-900">
                          {t("landing.impact.report.periodValue")}
                        </p>
                      </div>

                      <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-slate-200 light:bg-white ${isArabic ? "text-right" : "text-left"}`}>
                        <p className={`inline-flex items-center gap-1.5 text-xs text-slate-300 light:text-slate-600 ${isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.16em]"}`}>
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          {t("landing.impact.report.methodLabel")}
                        </p>
                        <p className="mt-1.5 text-sm text-slate-200 light:text-slate-700">
                          {t("landing.impact.report.methodValue")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/16 via-emerald-400/7 to-transparent p-4 light:border-emerald-500/30 light:from-emerald-100 light:via-emerald-50 light:to-white sm:p-5">
                    <div className={`flex items-center gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                      <div className="relative h-20 w-20 shrink-0">
                        <div className="absolute inset-0 rounded-full p-[3px]" style={reportGaugeStyle}>
                          <div className="h-full w-full rounded-full bg-slate-950 light:bg-white" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-slate-100 light:text-slate-900">{reportHealthScore}%</span>
                        </div>
                      </div>

                      <div className={isArabic ? "text-right" : "text-left"}>
                        <p
                          className={`text-[11px] text-slate-300 light:text-slate-600 ${
                            isArabic ? "tracking-normal" : "uppercase tracking-[0.16em]"
                          }`}
                        >
                          {t("landing.impact.report.coverage.title")}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-100 light:text-slate-900">
                          {t("landing.impact.report.coverage.sla.label")}
                        </p>
                        <p className="mt-1 text-xs text-slate-300 light:text-slate-600">
                          {t("landing.impact.report.coverage.sla.value")} / {t("landing.impact.report.coverage.wilayas.value")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat, index) => (
                    <motion.article
                      key={`report-stat-${stat.id}`}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: index * 0.06, ease: "easeOut" }}
                      className="group rounded-2xl border border-emerald-300/20 bg-gradient-to-b from-emerald-400/12 to-transparent p-4 light:border-emerald-500/25 light:from-emerald-50 light:to-white"
                    >
                      <div className={`flex items-start justify-between gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                        <p
                          className={`text-[11px] font-semibold text-slate-300 light:text-slate-600 ${
                            isArabic ? "tracking-normal" : "uppercase tracking-[0.16em]"
                          }`}
                        >
                          {stat.label}
                        </p>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-emerald-200 light:border-emerald-500/25 light:bg-emerald-50 light:text-emerald-700">
                          <stat.icon className="h-4.5 w-4.5" />
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-100 light:text-slate-900">
                        {stat.value.toLocaleString()}
                        {stat.suffix}
                      </p>
                      <p className="mt-2 text-xs text-slate-300 light:text-slate-600">{stat.description}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.45, delay: 0.22 + index * 0.05, ease: "easeOut" }}
                          style={{ width: `${Math.min(58 + index * 12, 94)}%`, originX: isArabic ? 1 : 0 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 light:from-emerald-600 light:to-cyan-500"
                        />
                      </div>
                    </motion.article>
                  ))}
                </section>

                <section className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-4">
                    <article className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 light:border-slate-200 light:bg-white">
                      <h4
                        className={`text-sm font-semibold text-emerald-200 light:text-emerald-700 ${
                          isArabic ? "tracking-normal text-right" : "uppercase tracking-[0.16em] text-left"
                        }`}
                      >
                        {t("landing.impact.report.coverage.title")}
                      </h4>
                      <div className="mt-3 space-y-3">
                        {reportCoverage.map((item, index) => (
                          <article
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-slate-200 light:bg-slate-50"
                          >
                            <div className={`flex items-start justify-between gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                              <div className={isArabic ? "text-right" : "text-left"}>
                                <p className="text-sm font-semibold text-slate-100 light:text-slate-900">{item.label}</p>
                                <p className="mt-1 text-xs text-slate-300 light:text-slate-600">{item.copy}</p>
                              </div>
                              <p className="text-sm font-semibold text-emerald-200 light:text-emerald-700">{item.value}</p>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10 light:bg-slate-200">
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.25 + index * 0.08, ease: "easeOut" }}
                                style={{ width: `${item.progress}%`, originX: isArabic ? 1 : 0 }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 light:from-emerald-600 light:to-emerald-400"
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 light:border-slate-200 light:bg-white">
                      <h4
                        className={`text-sm font-semibold text-emerald-200 light:text-emerald-700 ${
                          isArabic ? "tracking-normal text-right" : "uppercase tracking-[0.16em] text-left"
                        }`}
                      >
                        {t("landing.impact.report.timeline.title")}
                      </h4>

                      <div className="mt-4 space-y-3">
                        {reportMilestones.map((milestone, index) => (
                          <div
                            key={milestone.id}
                            className={`relative ${isArabic ? "pr-8 text-right" : "pl-8 text-left"}`}
                          >
                            {index < reportMilestones.length - 1 ? (
                              <span
                                className={`absolute top-7 h-[calc(100%-12px)] w-px bg-gradient-to-b from-emerald-300/50 to-transparent ${
                                  isArabic ? "right-3" : "left-3"
                                }`}
                              />
                            ) : null}

                            <span
                              className={`absolute top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/20 text-[11px] font-semibold text-emerald-100 light:border-emerald-500/45 light:bg-emerald-100 light:text-emerald-700 ${
                                isArabic ? "right-0" : "left-0"
                              }`}
                            >
                              {index + 1}
                            </span>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-slate-200 light:bg-slate-50">
                              <p
                                className={`text-xs text-slate-400 light:text-slate-500 ${
                                  isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                                }`}
                              >
                                Q{index + 1}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-100 light:text-slate-900">
                                {milestone.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-300 light:text-slate-600">{milestone.copy}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <article className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 light:border-slate-200 light:bg-white sm:p-5">
                    <div className={`flex items-center justify-between gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                      <h4
                        className={`text-sm font-semibold text-emerald-200 light:text-emerald-700 ${
                          isArabic ? "tracking-normal text-right" : "uppercase tracking-[0.16em] text-left"
                        }`}
                      >
                        {t("landing.impact.report.focus.title")}
                      </h4>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-emerald-200 light:border-emerald-500/25 light:bg-emerald-50 light:text-emerald-700">
                        <BarChart3 className="h-4.5 w-4.5" />
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2.5">
                      {reportFocusItems.map((item, index) => (
                        <li
                          key={item}
                          className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-slate-200 light:border-slate-200 light:bg-slate-50 light:text-slate-700 ${
                            isArabic ? "flex-row-reverse text-right" : ""
                          }`}
                        >
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/20 text-[11px] font-semibold text-emerald-100 light:border-emerald-500/40 light:bg-emerald-100 light:text-emerald-700">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-xs text-slate-200 light:border-emerald-500/25 light:bg-emerald-50 light:text-slate-700 ${isArabic ? "text-right" : "text-left"}`}>
                      {t("landing.impact.report.note")}
                    </div>
                  </article>
                </section>
              </div>

              <footer className="relative z-20 flex flex-col gap-3 border-t border-white/10 px-4 py-3 light:border-slate-200 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
                <p className={`text-xs text-slate-300 light:text-slate-600 ${isArabic ? "text-right" : "text-left"}`}>
                  {t("landing.impact.report.periodLabel")}: {t("landing.impact.report.periodValue")}
                </p>
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/16 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-200/70 hover:bg-emerald-400/26 light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20 sm:text-sm"
                >
                  <X className="h-4 w-4" />
                  {t("landing.impact.report.close")}
                </button>
              </footer>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
