"use client";

import { useMemo, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Truck,
  Trash2,
  ArrowRight,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

type RoleConfig = {
  id: number;
  titleKey: string;
  descriptionKey: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  ctaHref: string;
  benefitKeys: string[];
};

const roleConfigs: RoleConfig[] = [
  {
    id: 1,
    titleKey: "landing.work.roles.sellers.title",
    descriptionKey: "landing.work.roles.sellers.description",
    icon: ShoppingBag,
    active: true,
    ctaHref: "/market-place/login",
    benefitKeys: [
      "landing.work.roles.sellers.b1",
      "landing.work.roles.sellers.b2",
      "landing.work.roles.sellers.b3",
    ],
  },
  {
    id: 2,
    titleKey: "landing.work.roles.transporters.title",
    descriptionKey: "landing.work.roles.transporters.description",
    icon: Truck,
    active: false,
    ctaHref: "#",
    benefitKeys: [
      "landing.work.roles.transporters.b1",
      "landing.work.roles.transporters.b2",
      "landing.work.roles.transporters.b3",
    ],
  },
  {
    id: 3,
    titleKey: "landing.work.roles.cleaners.title",
    descriptionKey: "landing.work.roles.cleaners.description",
    icon: Trash2,
    active: true,
    ctaHref: "/greenspot",
    benefitKeys: [
      "landing.work.roles.cleaners.b1",
      "landing.work.roles.cleaners.b2",
      "landing.work.roles.cleaners.b3",
    ],
  },
  {
    id: 4,
    titleKey: "landing.work.roles.users.title",
    descriptionKey: "landing.work.roles.users.description",
    icon: User,
    active: true,
    ctaHref: "/reported-area",
    benefitKeys: [
      "landing.work.roles.users.b1",
      "landing.work.roles.users.b2",
      "landing.work.roles.users.b3",
    ],
  },
  {
    id: 5,
    titleKey: "landing.work.roles.students.title",
    descriptionKey: "landing.work.roles.students.description",
    icon: GraduationCap,
    active: false,
    ctaHref: "#",
    benefitKeys: [
      "landing.work.roles.students.b1",
      "landing.work.roles.students.b2",
      "landing.work.roles.students.b3",
    ],
  },
];

const rolePalettes = [
  {
    rail: "from-emerald-300 to-emerald-500",
    glow: "bg-emerald-400/25",
    icon: "border-emerald-300/40 bg-emerald-400/16 text-emerald-100 light:border-emerald-500/35 light:bg-emerald-500/14 light:text-emerald-700",
  },
  {
    rail: "from-cyan-300 to-sky-500",
    glow: "bg-cyan-400/22",
    icon: "border-cyan-300/40 bg-cyan-400/16 text-cyan-100 light:border-cyan-500/35 light:bg-cyan-500/14 light:text-cyan-700",
  },
  {
    rail: "from-amber-300 to-orange-500",
    glow: "bg-amber-400/22",
    icon: "border-amber-300/40 bg-amber-400/16 text-amber-100 light:border-amber-500/35 light:bg-amber-500/14 light:text-amber-700",
  },
  {
    rail: "from-violet-300 to-indigo-500",
    glow: "bg-violet-400/22",
    icon: "border-violet-300/40 bg-violet-400/16 text-violet-100 light:border-violet-500/35 light:bg-violet-500/14 light:text-violet-700",
  },
  {
    rail: "from-rose-300 to-fuchsia-500",
    glow: "bg-rose-400/22",
    icon: "border-rose-300/40 bg-rose-400/16 text-rose-100 light:border-rose-500/35 light:bg-rose-500/14 light:text-rose-700",
  },
] as const;

const revealVariants: Record<string, any> = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" },
  }),
};

export function WorkWithUs() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  const roles = useMemo(
    () =>
      roleConfigs.map((role) => ({
        ...role,
        title: t(role.titleKey),
        description: t(role.descriptionKey),
        benefits: role.benefitKeys.map((key) => t(key)),
      })),
    [t]
  );
  const activeRolesCount = roles.filter((role) => role.active).length;

  return (
    <section
      id="team"
      className={`relative scroll-mt-24 overflow-hidden bg-transparent py-12 sm:py-16 lg:py-24 ${
        isArabic ? "text-right" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div
          className={`absolute top-1/3 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl ${
            isArabic ? "-right-24" : "-left-24"
          }`}
        />
        <div
          className={`absolute top-1/4 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl ${
            isArabic ? "left-0" : "right-0"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("landing.work.badge")}
          </span>
          <h2 className="mb-4 mt-5 text-3xl font-bold text-slate-100 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.work.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 light:text-slate-600">
            {t("landing.work.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-[30px] border border-white/12 bg-gradient-to-br from-white/10 via-white/[0.05] to-transparent p-6 backdrop-blur-md light:border-slate-300/70 light:from-white/80 light:via-white/65 light:to-white/40 sm:p-7"
          >
            <div className="pointer-events-none absolute inset-0">
              <div
                className={`absolute top-0 h-48 w-48 rounded-full bg-emerald-400/18 blur-3xl light:bg-emerald-400/12 ${
                  isArabic ? "-right-10" : "-left-10"
                }`}
              />
              <div
                className={`absolute top-12 h-40 w-40 rounded-full bg-cyan-300/16 blur-3xl light:bg-cyan-300/10 ${
                  isArabic ? "left-0" : "right-0"
                }`}
              />
            </div>

            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300 light:text-slate-600">
                {t("landing.work.panel.eyebrow")}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-100 light:text-slate-900 sm:text-3xl">
                {t("landing.work.panel.title")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 light:text-slate-600">
                {t("landing.work.panel.copy")}
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3 light:border-slate-300/70 light:bg-white/75">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                    {t("landing.work.panel.openLanes")}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-slate-100 light:text-slate-900">
                    {activeRolesCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3 light:border-slate-300/70 light:bg-white/75">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                    {t("landing.work.panel.livePrinciple")}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 light:text-emerald-700">
                    <Leaf className="h-4 w-4" />
                    {t("landing.work.panel.natureFirst")}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {[
                  t("landing.work.panel.point1"),
                  t("landing.work.panel.point2"),
                  t("landing.work.panel.point3"),
                ].map((line) => (
                  <p
                    key={line}
                    className={`inline-flex items-center gap-2 text-sm text-slate-200 light:text-slate-700 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 light:bg-emerald-600" />
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  type="button"
                  onClick={() => {
                    const contactSection = document.getElementById("contact");
                    if (contactSection) {
                      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    window.location.hash = "contact";
                  }}
                  className="h-10 w-full rounded-full border border-emerald-300/40 bg-emerald-400/18 px-5 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-200/70 hover:bg-emerald-400/28 sm:w-auto light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20"
                >
                  {t("landing.work.panel.cta")}
                  <ArrowRight className={`h-4 w-4 ${isArabic ? "mr-2 -scale-x-100" : "ml-2"}`} />
                </Button>
              </div>
            </div>
          </motion.aside>

          <div className="space-y-4">
            {roles.map((role, i) => {
              const palette = rolePalettes[i % rolePalettes.length];
              const isComingSoon = !role.active;
              const singularRole = role.title.endsWith("s")
                ? role.title.slice(0, -1)
                : role.title;

              return (
                <motion.article
                  key={role.id}
                  custom={i + 1}
                  variants={revealVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className={`group relative overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-sm light:border-slate-300/70 light:bg-white/70 ${
                    isComingSoon ? "opacity-85" : ""
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-y-0 w-1.5 bg-gradient-to-b ${palette.rail} ${
                      isArabic ? "right-0" : "left-0"
                    }`}
                  />
                  <div
                    className={`pointer-events-none absolute top-1/2 h-24 w-24 -translate-y-1/2 rounded-full blur-2xl ${palette.glow} ${
                      isArabic ? "-left-8" : "-right-8"
                    }`}
                  />

                  <div className="grid grid-cols-[auto_1fr] gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border ${
                        isComingSoon
                          ? "border-slate-500/35 bg-slate-500/10 text-slate-300 light:border-slate-300/80 light:bg-slate-200/70 light:text-slate-600"
                          : palette.icon
                      }`}
                    >
                      <role.icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`mb-1 flex flex-wrap items-center gap-2 ${
                          isArabic ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                          {t("landing.work.lane")} {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 bg-white/20 light:bg-slate-300/70" />
                        {isComingSoon ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200 light:text-amber-700">
                            <Clock className="h-3 w-3" />
                            {t("landing.services.status.soon")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 light:text-emerald-700">
                            {t("landing.services.status.live")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[16px] font-semibold text-slate-100 light:text-slate-900">
                        {role.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300 light:text-slate-600">
                        {role.description}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400 light:text-slate-600">
                        {role.benefits.join(" | ")}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isComingSoon}
                      onClick={() => {
                        if (isComingSoon || !role.ctaHref) return;
                        window.location.href = role.ctaHref;
                      }}
                      className={`col-span-2 mt-1 h-9 justify-between px-3 text-xs font-semibold sm:col-span-1 sm:h-8 sm:px-2 ${
                        isComingSoon
                          ? "cursor-not-allowed text-slate-500 light:text-slate-500"
                          : "text-emerald-200 hover:text-emerald-100 light:text-emerald-700 light:hover:text-emerald-800"
                      } ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      {isComingSoon ? t("landing.services.status.soon") : `${t("landing.work.joinAs")} ${singularRole}`}
                      {!isComingSoon ? (
                        <ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "mr-1.5 -scale-x-100" : "ml-1.5"}`} />
                      ) : null}
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
