"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { MapPin, Sprout, Truck, ArrowRight, Clock, GraduationCap, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeSlide, StaggerContainer, StaggerItem } from "@/lib/ux/motion";
import { useI18n } from "@/lib/i18n/context";

const EDU_LOCK_DURATION_MS = 96 * 60 * 60 * 1000;
const EDU_UNLOCK_AT_STORAGE_KEY = "greenduty.services.edu.unlockAt";
const EDU_TARGET_HREF = "/education";

type ServiceConfig = {
  id: number;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  buttonTextKey: string;
  href: string;
  categoryKey: string;
};

const serviceConfigs: ServiceConfig[] = [
  {
    id: 1,
    titleKey: "landing.services.pollution.title",
    subtitleKey: "landing.services.pollution.subtitle",
    descriptionKey: "landing.services.pollution.description",
    icon: MapPin,
    active: true,
    buttonTextKey: "landing.services.pollution.button",
    href: "/reported-area",
    categoryKey: "landing.services.pollution.category",
  },
  {
    id: 2,
    titleKey: "landing.services.greenspot.title",
    subtitleKey: "landing.services.greenspot.subtitle",
    descriptionKey: "landing.services.greenspot.description",
    icon: TreePine,
    active: true,
    buttonTextKey: "landing.services.greenspot.button",
    href: "/greenspot",
    categoryKey: "landing.services.greenspot.category",
  },
  {
    id: 3,
    titleKey: "landing.services.market.title",
    subtitleKey: "landing.services.market.subtitle",
    descriptionKey: "landing.services.market.description",
    icon: Sprout,
    active: true,
    buttonTextKey: "landing.services.market.button",
    href: "/market-place",
    categoryKey: "landing.services.market.category",
  },
  {
    id: 4,
    titleKey: "landing.services.logistics.title",
    subtitleKey: "landing.services.logistics.subtitle",
    descriptionKey: "landing.services.logistics.description",
    icon: Truck,
    active: false,
    buttonTextKey: "landing.services.logistics.button",
    href: "#",
    categoryKey: "landing.services.logistics.category",
  },
  {
    id: 5,
    titleKey: "landing.services.edu.title",
    subtitleKey: "landing.services.edu.subtitle",
    descriptionKey: "landing.services.edu.description",
    icon: GraduationCap,
    active: false,
    buttonTextKey: "landing.services.edu.button",
    href: "#",
    categoryKey: "landing.services.edu.category",
  },
];

function formatCountdown(timeLeftMs: number) {
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Services() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const [isEduLocked, setIsEduLocked] = useState(true);
  const [eduTimeLeftMs, setEduTimeLeftMs] = useState(EDU_LOCK_DURATION_MS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUnlockAt = Number(window.localStorage.getItem(EDU_UNLOCK_AT_STORAGE_KEY));
    const unlockAt =
      Number.isFinite(savedUnlockAt) && savedUnlockAt > 0
        ? savedUnlockAt
        : Date.now() + EDU_LOCK_DURATION_MS;

    if (!Number.isFinite(savedUnlockAt) || savedUnlockAt <= 0) {
      window.localStorage.setItem(EDU_UNLOCK_AT_STORAGE_KEY, String(unlockAt));
    }

    const updateCountdown = () => {
      const remaining = unlockAt - Date.now();

      if (remaining <= 0) {
        setIsEduLocked(false);
        setEduTimeLeftMs(0);
        return true;
      }

      setIsEduLocked(true);
      setEduTimeLeftMs(remaining);
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

  const eduCountdownLabel = useMemo(() => formatCountdown(eduTimeLeftMs), [eduTimeLeftMs]);

  const services = useMemo(
    () =>
      serviceConfigs.map((service) => ({
        ...service,
        active: service.id === 5 ? !isEduLocked : service.active,
        href: service.id === 5 ? (isEduLocked ? "#" : EDU_TARGET_HREF) : service.href,
        title: t(service.titleKey),
        subtitle: t(service.subtitleKey),
        description: t(service.descriptionKey),
        buttonText:
          service.id === 5 && isEduLocked
            ? `${t("landing.services.status.soon")} (${eduCountdownLabel})`
            : t(service.buttonTextKey),
        soonText:
          service.id === 5 && isEduLocked
            ? `${t("landing.services.status.soon")} (${eduCountdownLabel})`
            : t("landing.services.status.soon"),
        category: t(service.categoryKey),
      })),
    [eduCountdownLabel, isEduLocked, t]
  );

  const featuredService = services.find((service) => service.active) ?? services[0];
  const secondaryServices = services.filter((service) => service.id !== featuredService.id);

  return (
    <section id="about" className="scroll-mt-24 bg-transparent py-12 sm:py-16 lg:py-24">
      <span id="services" className="sr-only" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeSlide direction="up" spring="soft" className="mb-14 text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-700">
            {t("landing.services.badge")}
          </span>
          <h2 className="mb-4 mt-5 text-3xl font-bold text-white/95 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.services.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60 light:text-slate-600">
            {t("landing.services.subtitle")}
          </p>
        </FadeSlide>

        <div className={`relative border-y border-white/12 light:border-slate-300/70 ${isArabic ? "text-right" : ""}`}>
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div
              className={`absolute top-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl ${
                isArabic ? "-right-16" : "-left-16"
              }`}
            />
            <div
              className={`absolute bottom-0 h-56 w-56 rounded-full bg-cyan-300/8 blur-3xl ${
                isArabic ? "-left-10" : "-right-10"
              }`}
            />
          </div>

          <StaggerItem direction="up" distance={28}>
            <article className="relative z-10 grid gap-6 py-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div
                className={`border-emerald-300/45 ${
                  isArabic ? "border-r-2 pr-4 sm:pr-6" : "border-l-2 pl-4 sm:pl-6"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-700">
                  {featuredService.category} {t("landing.services.module")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-100 light:text-slate-900 sm:text-3xl">
                  {featuredService.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-emerald-300/90 light:text-emerald-700">
                  {featuredService.subtitle}
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 light:text-slate-600">
                  {featuredService.description}
                </p>
              </div>

              <div className={`flex flex-wrap items-center gap-3 ${isArabic ? "justify-end" : ""}`}>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700">
                  <featuredService.icon className="h-5 w-5" />
                </div>
                <Button
                  className="h-10 w-full rounded-full border border-emerald-300/40 bg-emerald-400/18 px-5 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-200/70 hover:bg-emerald-400/28 sm:w-auto light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20"
                  onClick={() => {
                    if (!featuredService.active) return;
                    window.location.href = featuredService.href;
                  }}
                  disabled={!featuredService.active}
                >
                  {featuredService.buttonText}
                  {featuredService.active ? (
                    <ArrowRight className={`h-4 w-4 ${isArabic ? "mr-2 -scale-x-100" : "ml-2"}`} />
                  ) : null}
                </Button>
              </div>
            </article>
          </StaggerItem>

          <StaggerContainer stagger={0.06} spring="gentle" className="relative z-10">
            {secondaryServices.map((service, index) => (
              <StaggerItem key={service.id} direction="up" distance={20}>
                <article
                  className={`grid grid-cols-[auto_1fr] gap-3 border-t border-white/10 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4 light:border-slate-300/70 ${
                    isArabic ? "pl-1" : "pr-1"
                  }`}
                >
                  <span className="mt-1 text-xs font-semibold tracking-[0.2em] text-slate-500 light:text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="col-span-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="text-[15px] font-semibold text-slate-100 light:text-slate-900">
                        {service.title}
                      </h4>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                        {service.category}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-emerald-300/85 light:text-emerald-700">
                      {service.subtitle}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-300 light:text-slate-600">
                      {service.description}
                    </p>
                  </div>

                  <div
                    className={`col-span-2 flex items-center justify-between gap-3 pt-1 sm:col-span-1 sm:mt-1 sm:flex-col sm:justify-start sm:gap-2 sm:pt-0 ${
                      isArabic ? "sm:items-start" : "sm:items-end"
                    }`}
                  >
                    {service.active ? (
                      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 light:text-emerald-700">
                        {t("landing.services.status.live")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-amber-200 light:text-amber-700">
                        <Clock className="h-3 w-3" />
                        {service.soonText}
                      </span>
                    )}

                    <Button
                      disabled={!service.active}
                      variant="ghost"
                      className={`h-9 px-3 text-xs font-semibold sm:h-8 sm:px-2 ${
                        service.active
                          ? "text-emerald-200 hover:text-emerald-100 light:text-emerald-700 light:hover:text-emerald-800"
                          : "cursor-not-allowed text-slate-500 light:text-slate-500"
                      }`}
                      onClick={() => {
                        if (!service.active || !service.href) return;
                        window.location.href = service.href;
                      }}
                    >
                      {service.buttonText}
                      {service.active ? (
                        <ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "mr-1.5 -scale-x-100" : "ml-1.5"}`} />
                      ) : null}
                    </Button>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
