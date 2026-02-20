"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/context";

const heroImage = "/images/hero-hills-user.jpg";
const previewImage =
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=700&q=80";

export function Hero() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const isFrench = locale === "fr";
  const heroStats = useMemo(
    () => [
      { value: "6M", label: t("landing.hero.stats.lives") },
      { value: "315", label: t("landing.hero.stats.projects") },
      { value: "120K", label: t("landing.hero.stats.community") },
    ],
    [t]
  );
  const platformStripItems = useMemo(
    () => [
      t("landing.services.pollution.title"),
      t("landing.services.greenspot.title"),
      t("landing.services.market.title"),
      t("landing.services.logistics.title"),
      t("landing.services.edu.title"),
    ],
    [t]
  );

  return (
    <section id="home" className="relative scroll-mt-24 overflow-hidden pb-10 pt-20 sm:pb-14 sm:pt-28">
      <div className="mx-auto max-w-[1220px] px-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[24px] border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.48)] sm:rounded-[28px]">
          <Image
            src={heroImage}
            alt={t("landing.hero.image.alt")}
            fill
            priority
            sizes="(min-width: 1280px) 1220px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 24px)"
            className="object-cover object-[34%_42%] sm:object-[46%_45%] lg:object-[50%_48%]"
          />
          <div className="gd-home-hero-overlay absolute inset-0" />
          <div className="gd-home-hero-sheen absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/75 via-black/40 to-transparent sm:hidden" />

          <div className="relative z-10 flex min-h-[470px] flex-col justify-between p-4 pb-5 sm:min-h-[520px] sm:p-10 lg:min-h-[600px] lg:p-12">
            <div
              className={`max-w-[47rem] pt-3 sm:pt-5 ${
                isArabic
                  ? "text-right sm:max-w-[43rem] lg:pl-[22rem]"
                  : "lg:pr-[20rem]"
              }`}
            >
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className={`gd-home-hero-kicker inline-flex w-fit items-center gap-2 text-[0.7rem] font-semibold sm:text-[0.78rem] ${
                  isArabic ? "flex-row-reverse normal-case tracking-normal" : "uppercase tracking-[0.14em]"
                }`}
              >
                <span className="gd-home-hero-kicker-line h-px w-8" />
                {t("landing.hero.kicker")}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className={`gd-home-hero-title mt-4 font-light ${
                  isArabic
                    ? "text-[clamp(1.9rem,8.5vw,4.8rem)] leading-[1.08] tracking-normal"
                    : isFrench
                      ? "text-[clamp(2rem,9vw,5.3rem)] leading-[0.95] tracking-[-0.02em]"
                      : "text-[clamp(2.1rem,11vw,6.35rem)] leading-[0.9] tracking-[-0.03em]"
                }`}
              >
                <span className="block">{t("landing.hero.title.line1")}</span>
                <span className="block">
                  {t("landing.hero.title.line2prefix")}{" "}
                  <span className={`gd-home-hero-title-accent ${isArabic ? "not-italic" : ""}`}>
                    {t("landing.hero.title.accent")}
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28 }}
                className={`gd-home-hero-copy mt-4 max-w-[34rem] text-[0.96rem] leading-relaxed sm:text-base ${
                  isArabic ? "sm:max-w-[38rem]" : isFrench ? "sm:max-w-[36rem]" : ""
                }`}
              >
                {t("landing.hero.copy")}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4 }}
                className={`gd-home-hero-note mt-3 text-[11px] sm:text-sm ${
                  isArabic ? "tracking-normal" : "tracking-[0.06em]"
                }`}
              >
                {t("landing.hero.note")}
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className={`mt-7 grid w-full gap-2.5 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:items-center ${
                isArabic ? "sm:justify-end sm:gap-6" : "sm:gap-8"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const servicesSection = document.getElementById("services");
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  window.location.hash = "services";
                }}
                className={`gd-home-hero-cta group inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 text-[0.9rem] font-medium transition sm:h-auto sm:w-auto sm:px-0 sm:py-2 sm:pb-1.5 ${
                  isArabic ? "sm:justify-end" : "sm:justify-start"
                }`}
              >
                {t("landing.hero.cta.primary")}
                <ArrowUpRight
                  className={`gd-home-hero-cta-icon h-3 w-3 transition-transform ${
                    isArabic
                      ? "-scale-x-100 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
                      : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login?redirect=/reported-area";
                }}
                className={`gd-home-hero-cta group inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 text-[0.9rem] font-medium transition sm:h-auto sm:w-auto sm:px-0 sm:py-2 sm:pb-1.5 ${
                  isArabic ? "sm:justify-end" : "sm:justify-start"
                }`}
              >
                {t("landing.hero.cta.secondary")}
                <ArrowUpRight
                  className={`gd-home-hero-cta-icon h-3 w-3 transition-transform ${
                    isArabic
                      ? "-scale-x-100 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
                      : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  }`}
                />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className={`gd-home-hero-quote absolute top-16 hidden md:block ${
              isArabic
                ? "left-4 w-[320px] text-right lg:left-10 lg:top-24"
                : isFrench
                  ? "right-4 w-[320px] lg:right-10 lg:top-24"
                  : "right-4 w-[290px] lg:right-10 lg:top-24"
            }`}
          >
            <div
              className={`gd-home-hero-quote-head mb-2 flex items-start justify-between gap-3 ${
                isArabic ? "flex-row-reverse" : ""
              }`}
            >
              <span
                className={`gd-home-hero-quote-badge inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                }`}
              >
                {t("landing.hero.quote.badge")}
              </span>
              <span className="gd-home-hero-quote-mark text-3xl leading-none">"</span>
            </div>
            <p className="gd-home-hero-quote-text text-sm leading-relaxed">
              {t("landing.hero.quote.text")}
            </p>
            <div className={`gd-home-hero-quote-foot mt-3 flex items-center gap-2.5 pt-3 ${isArabic ? "flex-row-reverse" : ""}`}>
              <div className="gd-home-hero-quote-avatar h-8 w-8 overflow-hidden rounded-full">
                <img src={previewImage} alt={t("landing.hero.quote.avatarAlt")} className="h-full w-full object-cover" />
              </div>
              <div className={isArabic ? "text-right" : ""}>
                <p
                  className={`gd-home-hero-quote-name text-[11px] font-semibold ${
                    isArabic ? "tracking-normal" : "uppercase tracking-[0.11em]"
                  }`}
                >
                  {t("landing.hero.quote.partner")}
                </p>
                <p className="gd-home-hero-quote-role text-[11px]">{t("landing.hero.quote.location")}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 1.8 }}
            className="relative z-20 mx-1 mb-2 mt-4 sm:absolute sm:bottom-6 sm:left-10 sm:right-10 sm:mx-0 sm:mb-0 sm:mt-0"
          >
            <div className="gd-home-stats-card rounded-[18px] px-4 py-4 shadow-[0_22px_56px_rgba(0,0,0,0.26)] sm:rounded-full sm:px-7 sm:py-4">
              <div className="gd-home-stats-grid grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
                {heroStats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`sm:px-5 ${
                      index < heroStats.length - 1
                        ? isArabic
                          ? "sm:border-l gd-home-stats-divider"
                          : "sm:border-r gd-home-stats-divider"
                        : ""
                    }`}
                  >
                    <p className="gd-home-stats-value text-2xl font-semibold leading-none tracking-tight sm:text-4xl sm:font-medium">
                      {stat.value}
                    </p>
                    <p className="gd-home-stats-label mt-1.5 text-[0.74rem] leading-[1.3] sm:mt-2 sm:text-xs">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className={`mt-10 grid gap-6 sm:mt-12 sm:gap-8 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr] ${isArabic ? "text-right" : ""}`}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.05 }}
            className="text-2xl leading-[1.12] tracking-tight text-slate-100 light:text-slate-900 sm:-mt-2 sm:text-4xl lg:-mt-3 lg:text-5xl"
          >
            {t("landing.hero.trust.title")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.2 }}
            className="max-w-xl text-base text-slate-300 light:text-slate-600 sm:text-lg"
          >
            {t("landing.hero.trust.copy")}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 2.35 }}
          className="mb-10 mt-9 sm:mb-14 sm:mt-12"
        >
          <div className="gd-home-brand-strip flex flex-wrap items-center justify-center gap-2 text-center sm:gap-3">
            {platformStripItems.map((brand, index) => (
              <span key={brand} className="inline-flex items-center gap-2 sm:gap-3">
                <span
                  className={`gd-home-brand-name text-[0.7rem] font-medium sm:text-[0.78rem] ${
                    isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                  }`}
                >
                  {brand}
                </span>
                {index < platformStripItems.length - 1 && <span className="gd-home-brand-divider">/</span>}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

    </section>
  );
}
