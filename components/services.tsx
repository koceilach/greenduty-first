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
  ShieldCheck,
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
    href: "/greenspot/login",
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

        <div
          className={`relative overflow-hidden rounded-[44px] border border-white/12 bg-[#041812]/90 px-5 py-7 shadow-[0_36px_110px_rgba(2,6,23,0.45)] backdrop-blur-xl light:border-emerald-500/16 light:bg-white/84 sm:px-8 sm:py-10 lg:px-11 lg:py-12 ${
            isArabic ? "text-right" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.2),transparent_52%),radial-gradient(95%_95%_at_100%_100%,rgba(56,189,248,0.14),transparent_58%)] light:bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.12),transparent_52%),radial-gradient(95%_95%_at_100%_100%,rgba(14,165,233,0.1),transparent_58%)]" />
            <div className="absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />
          </div>

          <StaggerItem direction="up" distance={28}>
            <article className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className={`${isArabic ? "lg:order-2" : ""}`}>
                <span
                  className={`inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-200 light:text-emerald-700 ${
                    isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.2em]"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("landing.services.badge")}
                </span>

                <p
                  className={`mt-5 text-[11px] font-semibold text-emerald-200/95 light:text-emerald-700 ${
                    isArabic ? "tracking-normal" : "uppercase tracking-[0.22em]"
                  }`}
                >
                  {featuredService.category} {t("landing.services.module")}
                </p>

                <h3 className="mt-2 max-w-2xl text-4xl font-black leading-[0.94] tracking-[-0.03em] text-white light:text-slate-900 sm:text-6xl">
                  {featuredService.title}
                </h3>
                <p className="mt-3 text-sm font-medium text-emerald-300/90 light:text-emerald-700 sm:text-base">
                  {featuredService.subtitle}
                </p>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 light:text-slate-600 sm:text-[15px]">
                  {featuredService.description}
                </p>

                <div className={`mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 ${isArabic ? "justify-end" : ""}`}>
                  <span
                    className={`inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-100 light:text-emerald-700 ${
                      isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Cleanup Modules
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 text-[11px] font-semibold text-teal-100 light:text-teal-700 ${
                      isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Full Security
                  </span>
                </div>

                <div className={`mt-8 grid max-w-xl grid-cols-3 gap-5 ${isArabic ? "text-right" : "text-left"}`}>
                  {[
                    { label: "LIVE", value: `${services.filter((service) => service.active).length}` },
                    { label: "TOTAL", value: `${services.length}` },
                    { label: "READY", value: featuredService.active ? "100%" : "80%" },
                  ].map((metric) => (
                    <div
                      key={`metric-${metric.label}`}
                      className={`border-l border-white/20 pl-3 light:border-slate-300 ${isArabic ? "border-l-0 border-r pr-3 pl-0" : ""}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/80 light:text-emerald-700">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-2xl font-black text-white light:text-slate-900">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className={`mt-8 flex ${isArabic ? "justify-end" : "justify-start"}`}>
                  <Button
                    className="h-11 rounded-full bg-emerald-400/18 px-6 text-sm font-semibold text-emerald-100 transition-all hover:bg-emerald-400/30 light:bg-emerald-500/14 light:text-emerald-700 light:hover:bg-emerald-500/24"
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

              <aside className={`${isArabic ? "lg:order-1" : ""}`}>
                <div
                  className={`rounded-[28px] border border-white/12 bg-white/[0.03] p-4 light:border-slate-300 light:bg-white/86 sm:p-5 ${
                    isArabic ? "text-right" : ""
                  }`}
                >
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/18 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90 light:border-slate-300 light:text-emerald-700">
                    <span>No.</span>
                    <span>Cleanup Modules</span>
                    <span>Status</span>
                  </div>

                  <div className="mt-1 divide-y divide-white/10 light:divide-slate-200">
                    {services.map((service, index) => (
                      <div
                        key={`ops-row-${service.id}`}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
                      >
                        <span className="font-mono text-sm font-semibold text-slate-300 light:text-slate-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className={`flex items-center gap-2.5 ${isArabic ? "flex-row-reverse" : ""}`}>
                          <service.icon className="h-4 w-4 text-emerald-200 light:text-emerald-700" />
                          <div>
                            <p className="text-sm font-semibold text-slate-100 light:text-slate-900">{service.title}</p>
                            <p className="text-[11px] text-emerald-200/80 light:text-emerald-700">{service.category}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] ${
                            service.active
                              ? "border-emerald-300/30 bg-emerald-500/18 text-emerald-100 light:border-emerald-500/35 light:bg-emerald-100 light:text-emerald-700"
                              : "border-amber-300/30 bg-amber-500/16 text-amber-100 light:border-amber-500/35 light:bg-amber-100 light:text-amber-700"
                          }`}
                        >
                          {!service.active && <Clock className="h-3 w-3" />}
                          {service.active ? t("landing.services.status.live") : service.soonText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </article>
          </StaggerItem>

          <StaggerContainer
            stagger={0.06}
            spring="gentle"
            className="relative z-10 mt-14 rounded-[28px] border border-white/12 bg-white/[0.02] p-4 light:border-slate-300 light:bg-white/86 sm:p-5"
          >
            <div
              className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 light:border-slate-300 light:text-slate-600 ${
                isArabic ? "text-right" : ""
              }`}
            >
              <span>Module Directory</span>
              <span>{t("landing.services.status.live")}</span>
              <span>Action</span>
            </div>

            {secondaryServices.map((service, index) => (
              <StaggerItem key={service.id} direction="up" distance={20}>
                <article
                  className={`relative py-6 ${index < secondaryServices.length - 1 ? "border-b border-white/10 light:border-slate-200" : ""}`}
                >
                  <div className={`grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center ${isArabic ? "sm:text-right" : ""}`}>
                    <div className={`relative ${isArabic ? "pr-5" : "pl-5"}`}>
                      <span
                        className={`absolute top-1 h-2 w-2 rounded-full bg-emerald-300 ${
                          isArabic ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
                        }`}
                      />
                      <div
                        className={`absolute inset-y-0 ${
                          isArabic ? "right-0 border-r border-emerald-300/30 light:border-emerald-500/35" : "left-0 border-l border-emerald-300/30 light:border-emerald-500/35"
                        }`}
                      />

                      <div className={`flex items-start gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                        <span className="text-2xl font-black tracking-tight text-white/30 light:text-slate-300">
                          {String(index + 1).padStart(2, "0")}
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
                    </div>

                    <div className={`flex items-center ${isArabic ? "justify-start sm:justify-end" : "justify-start"}`}>
                      {service.active ? (
                        <span
                          className={`inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/16 px-3 py-1 text-[10px] font-semibold text-emerald-100 light:border-emerald-500/35 light:bg-emerald-100 light:text-emerald-700 ${
                            isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                          }`}
                        >
                          {t("landing.services.status.live")}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-500/16 px-3 py-1 text-[10px] text-amber-100 light:border-amber-500/35 light:bg-amber-100 light:text-amber-700 ${
                            isArabic ? "flex-row-reverse tracking-normal" : "uppercase tracking-[0.14em]"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {service.soonText}
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center ${isArabic ? "justify-start sm:justify-end" : "justify-start sm:justify-end"}`}>
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
