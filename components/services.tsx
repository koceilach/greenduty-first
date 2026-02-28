"use client";

import { useMemo, type ComponentType } from "react";
import {
  MapPin,
  Sprout,
  Truck,
  ArrowRight,
  Clock,
  GraduationCap,
  TreePine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeSlide, StaggerContainer, StaggerItem } from "@/lib/ux/motion";
import { useI18n } from "@/lib/i18n/context";

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
    active: true,
    buttonTextKey: "landing.services.edu.button",
    href: EDU_TARGET_HREF,
    categoryKey: "landing.services.edu.category",
  },
];

export function Services() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  const services = useMemo(
    () =>
      serviceConfigs.map((service) => ({
        ...service,
        title: t(service.titleKey),
        subtitle: t(service.subtitleKey),
        description: t(service.descriptionKey),
        buttonText: t(service.buttonTextKey),
        soonText: t("landing.services.status.soon"),
        category: t(service.categoryKey),
      })),
    [t]
  );

  const featuredService = services.find((service) => service.active) ?? services[0];
  const secondaryServices = services.filter((service) => service.id !== featuredService.id);
  const orbitServices = secondaryServices.slice(0, 3);

  return (
    <section id="about" className="scroll-mt-24 bg-transparent py-12 sm:py-16 lg:py-24">
      <span id="services" className="sr-only" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeSlide direction="up" spring="soft" className="mb-14 text-center">
          <span
            className={`inline-flex items-center gap-2.5 text-[11px] font-semibold text-emerald-200 light:text-emerald-700 ${
              isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.18em]"
            }`}
          >
            <span className="h-px w-7 bg-emerald-300/45 light:bg-emerald-500/35" />
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/40 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700">
              <Sparkles className="h-3 w-3" />
            </span>
            {t("landing.services.badge")}
            <span className="h-px w-7 bg-emerald-300/45 light:bg-emerald-500/35" />
          </span>
          <h2 className="mb-4 mt-5 text-3xl font-bold text-white/95 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.services.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60 light:text-slate-600">
            {t("landing.services.subtitle")}
          </p>
        </FadeSlide>

        <div className={`relative overflow-hidden rounded-[34px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 ${isArabic ? "text-right" : ""}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.22),transparent_52%),radial-gradient(90%_90%_at_100%_100%,rgba(56,189,248,0.16),transparent_55%)] light:bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.14),transparent_52%),radial-gradient(90%_90%_at_100%_100%,rgba(14,165,233,0.1),transparent_55%)]" />

          <StaggerItem direction="up" distance={28}>
            <article className="relative z-10 grid gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
              <div className={isArabic ? "lg:order-2" : ""}>
                <p
                  className={`text-[11px] font-semibold text-emerald-200 light:text-emerald-700 ${
                    isArabic ? "tracking-normal" : "uppercase tracking-[0.22em]"
                  }`}
                >
                  {featuredService.category} {t("landing.services.module")}
                </p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-100 light:text-slate-900 sm:text-4xl">
                  {featuredService.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-emerald-300/90 light:text-emerald-700 sm:text-base">
                  {featuredService.subtitle}
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 light:text-slate-600 sm:text-[15px]">
                  {featuredService.description}
                </p>

                <div className={`mt-6 flex flex-wrap items-center gap-3 ${isArabic ? "justify-end" : ""}`}>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] ${
                      featuredService.active
                        ? "bg-emerald-500/18 font-semibold text-emerald-100 light:bg-emerald-100 light:text-emerald-700"
                        : "bg-amber-500/16 text-amber-100 light:bg-amber-100 light:text-amber-700"
                    } ${isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"}`}
                  >
                    {featuredService.active ? t("landing.services.status.live") : featuredService.soonText}
                  </span>

                  <Button
                    className="h-11 rounded-full bg-emerald-400/20 px-6 text-sm font-semibold text-emerald-100 transition-all hover:bg-emerald-400/30 light:bg-emerald-500/14 light:text-emerald-700 light:hover:bg-emerald-500/24"
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
              </div>

              <div className={`relative mx-auto h-[18rem] w-full max-w-[20rem] sm:h-[20rem] sm:max-w-[22rem] ${isArabic ? "lg:order-1" : ""}`}>
                <div className="absolute inset-8 rounded-full bg-emerald-400/30 blur-2xl light:bg-emerald-200/70" />
                <div className="absolute inset-0 rounded-full border border-emerald-300/30" />
                <div className="absolute inset-6 rounded-full border border-white/12 light:border-slate-300/70" />
                <div className="absolute inset-[26%] flex items-center justify-center rounded-full bg-slate-950/75 text-emerald-100 shadow-[0_26px_60px_rgba(2,6,23,0.5)] light:bg-white/95 light:text-emerald-700">
                  <featuredService.icon className="h-12 w-12" />
                </div>

                {orbitServices.map((service, index) => {
                  const positionClass =
                    index === 0
                      ? isArabic
                        ? "left-0 top-8"
                        : "right-0 top-8"
                      : index === 1
                        ? "left-1/2 -translate-x-1/2 -bottom-1"
                        : isArabic
                          ? "right-0 top-24"
                          : "left-0 top-24";

                  return (
                    <span
                      key={`orbit-${service.id}`}
                      className={`absolute ${positionClass} inline-flex max-w-[11rem] items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 shadow-[0_12px_28px_rgba(2,6,23,0.45)] light:bg-white light:text-slate-700`}
                    >
                      <service.icon className="h-3.5 w-3.5 text-emerald-200 light:text-emerald-700" />
                      {service.title}
                    </span>
                  );
                })}
              </div>
            </article>
          </StaggerItem>

          <StaggerContainer stagger={0.06} spring="gentle" className="relative z-10 mt-12 space-y-4">
            {secondaryServices.map((service, index) => (
              <StaggerItem key={service.id} direction="up" distance={20}>
                <article
                  className={`group relative overflow-hidden rounded-[26px] bg-white/[0.04] px-4 py-4 shadow-[0_18px_45px_rgba(2,6,23,0.28)] backdrop-blur-md light:bg-white/80 sm:rounded-full sm:px-6 sm:py-4 ${
                    index % 2 === 1 ? (isArabic ? "sm:-translate-x-5" : "sm:translate-x-5") : ""
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_50%,rgba(16,185,129,0.2),transparent_55%)] light:bg-[radial-gradient(80%_120%_at_0%_50%,rgba(16,185,129,0.11),transparent_55%)]" />
                  <div className={`relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${isArabic ? "sm:flex-row-reverse" : ""}`}>
                    <div className={`flex items-start gap-3 ${isArabic ? "flex-row-reverse text-right" : "text-left"}`}>
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/18 text-emerald-100 light:bg-emerald-100 light:text-emerald-700">
                        <service.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className={`flex flex-wrap items-center gap-2 ${isArabic ? "justify-end" : ""}`}>
                          <h4 className="text-base font-semibold text-slate-100 light:text-slate-900">{service.title}</h4>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/85 light:text-emerald-700">
                            {service.category}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-emerald-300/90 light:text-emerald-700">{service.subtitle}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-300 light:text-slate-600 sm:max-w-2xl">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                      {service.active ? (
                        <span
                          className={`inline-flex items-center rounded-full bg-emerald-500/16 px-3 py-1 text-[10px] font-semibold text-emerald-100 light:bg-emerald-100 light:text-emerald-700 ${
                            isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                          }`}
                        >
                          {t("landing.services.status.live")}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/16 px-3 py-1 text-[10px] text-amber-100 light:bg-amber-100 light:text-amber-700 ${
                            isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.14em]"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {service.soonText}
                        </span>
                      )}

                      <Button
                        disabled={!service.active}
                        variant="ghost"
                        className={`h-10 rounded-full px-4 text-xs font-semibold ${
                          service.active
                            ? "text-emerald-200 hover:bg-emerald-500/12 hover:text-emerald-100 light:text-emerald-700 light:hover:bg-emerald-100 light:hover:text-emerald-800"
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
