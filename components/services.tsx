"use client";

import { MapPin, Sprout, Truck, ArrowRight, Clock, GraduationCap, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaggerContainer, StaggerItem, FadeSlide } from "@/lib/ux/motion";

const services = [
  {
    id: 1,
    title: "Pollution Tracker",
    subtitle: "Report Polluted Areas",
    description:
      "Snap, report, and clean. Contribute to a cleaner Algeria by reporting pollution hotspots and tracking cleanup efforts in real-time.",
    icon: MapPin,
    active: true,
    buttonText: "Explore Map",
    href: "#map",
    category: "reporting",
  },
  {
    id: 2,
    title: "GreenSpot Reporter",
    subtitle: "Report Areas to Plant",
    description:
      "Spot a place that needs greenery? Report locations perfect for planting trees and flowers. Help us identify and transform barren spots into green havens.",
    icon: TreePine,
    active: true,
    buttonText: "Start Reporting",
    href: "/greenspot",
    category: "reporting",
  },
  {
    id: 3,
    title: "AgroMarket",
    subtitle: "Agricultural Marketplace",
    description:
      "Trade seeds, tools, and agricultural products. Connect with local farmers and build a sustainable food network.",
    icon: Sprout,
    active: true,
    buttonText: "Browse Market",
    href: "/market-place",
    category: "commerce",
  },
  {
    id: 4,
    title: "Eco Logistics",
    subtitle: "Green Transport Network",
    description:
      "Eco-friendly delivery network. Ship your products sustainably with our green logistics partners.",
    icon: Truck,
    active: false,
    buttonText: "Coming Soon",
    href: "#",
    category: "commerce",
  },
  {
    id: 5,
    title: "GreenDuty Edu",
    subtitle: "Education Platform",
    description:
      "Learn, grow, and lead the green revolution. Access courses, workshops, and resources on environmental sustainability.",
    icon: GraduationCap,
    active: true,
    buttonText: "Start Learning",
    href: "/education",
    category: "learning",
  },
];


export function Services() {
  const featuredService = services.find((service) => service.active) ?? services[0];
  const secondaryServices = services.filter((service) => service.id !== featuredService.id);

  return (
    <section id="about" className="bg-transparent py-12 sm:py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSlide direction="up" spring="soft" className="mb-14 text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-600">
            Platform Modules
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-white/95 light:text-foreground mb-4">
            Our GreenSystem Services
          </h2>
          <p className="text-lg text-white/60 light:text-muted-foreground max-w-2xl mx-auto">
            Five connected products orchestrated for cleaner cities, greener zones,
            and smarter environmental action.
          </p>
        </FadeSlide>

        <StaggerContainer stagger={0.08} spring="gentle" className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          {/* ── Featured Card ── */}
          <StaggerItem direction="up" distance={30}>
          <article
            className="group relative h-full overflow-hidden rounded-3xl border border-emerald-400/20 light:border-emerald-500/20 bg-white/[0.06] light:bg-white/60 p-6 sm:p-8 backdrop-blur-lg shadow-lg shadow-emerald-950/30 light:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Glow accents */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/15 light:bg-emerald-400/10 blur-3xl" />
              <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-cyan-300/10 light:bg-cyan-300/8 blur-3xl" />
            </div>

            <div className="relative z-10">
              {/* Badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-emerald-300/30 light:border-emerald-500/25 bg-emerald-400/12 light:bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-200 light:text-emerald-700">
                  {featuredService.category}
                </span>
                <span className="inline-flex rounded-full border border-white/15 light:border-emerald-500/15 bg-white/8 light:bg-emerald-50/60 px-3 py-1 text-[11px] font-medium text-slate-200 light:text-emerald-700">
                  Live Now
                </span>
              </div>

              {/* Title & Icon */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white/95 light:text-foreground">{featuredService.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold text-emerald-300 light:text-emerald-600">
                    {featuredService.subtitle}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 light:border-emerald-500/20 bg-emerald-400/15 light:bg-emerald-500/10 text-emerald-200 light:text-emerald-600 shadow-md">
                  <featuredService.icon className="h-7 w-7" />
                </div>
              </div>

              {/* Description */}
              <p className="max-w-2xl text-sm leading-relaxed text-slate-300 light:text-muted-foreground sm:text-[15px]">
                {featuredService.description}
              </p>

              {/* Feature chips */}
              <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                {[
                  { label: "Capture", value: "Photo Evidence" },
                  { label: "Verify", value: "Community Signal" },
                  { label: "Act", value: "Response Workflow" },
                ].map((chip) => (
                  <div key={chip.label} className="rounded-xl border border-white/10 light:border-emerald-500/10 bg-white/[0.05] light:bg-emerald-50/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 light:text-muted-foreground/70">{chip.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100 light:text-foreground">{chip.value}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-7">
                <Button
                  className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 text-sm font-semibold text-white shadow-md hover:from-emerald-400 hover:to-green-500 hover:shadow-lg transition-all active:scale-[0.97]"
                  onClick={() => {
                    if (!featuredService.active) return;
                    window.location.href = "/login?redirect=/reported-area";
                  }}
                  disabled={!featuredService.active}
                >
                  {featuredService.buttonText}
                  {featuredService.active ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </article>
          </StaggerItem>

          {/* ── Secondary Cards Grid ── */}
          <StaggerContainer stagger={0.06} spring="gentle" className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2">
            {secondaryServices.map((service) => (
            <StaggerItem key={service.id} direction="up" distance={24}>
            <div
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 light:border-emerald-500/12 bg-white/[0.04] light:bg-white/50 p-5 backdrop-blur-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 light:hover:border-emerald-500/30 hover:bg-white/[0.07] light:hover:bg-white/70 hover:shadow-lg"
            >
              {/* Category & Status */}
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <span className="inline-flex rounded-full border border-white/12 light:border-emerald-500/15 bg-white/8 light:bg-emerald-50/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-300 light:text-emerald-700">
                  {service.category}
                </span>
                {service.active ? (
                  <Badge
                    variant="secondary"
                    className="border-emerald-300/25 light:border-emerald-500/20 bg-emerald-400/12 light:bg-emerald-500/10 text-emerald-200 light:text-emerald-700 text-[10px]"
                  >
                    Live
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="border-white/12 light:border-amber-500/15 bg-white/8 light:bg-amber-50/50 text-slate-300 light:text-amber-700 text-[10px]"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Soon
                  </Badge>
                )}
              </div>

              {/* Icon & Title */}
              <div className="mb-3.5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 light:border-emerald-500/15 bg-white/8 light:bg-emerald-50/60 text-emerald-300 light:text-emerald-600">
                  <service.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-white/95 light:text-foreground leading-tight">{service.title}</h3>
                  <p className="mt-0.5 text-xs font-medium text-emerald-300/80 light:text-emerald-600">{service.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="mb-5 flex-1 text-[13px] leading-relaxed text-slate-300 light:text-muted-foreground">
                {service.description}
              </p>

              {/* CTA */}
              <Button
                disabled={!service.active}
                className={`h-10 w-full rounded-xl text-sm font-medium transition-all active:scale-[0.97] ${
                  service.active
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-400 hover:to-green-500 hover:shadow-md"
                    : "cursor-not-allowed border border-white/12 light:border-black/8 bg-white/8 light:bg-black/[0.03] text-slate-400 light:text-muted-foreground"
                }`}
                onClick={() => {
                  if (!service.active || !service.href) return;
                  window.location.href = service.href;
                }}
              >
                {service.buttonText}
                {service.active ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </div>
            </StaggerItem>
            ))}
          </StaggerContainer>
        </StaggerContainer>
      </div>
    </section>
  );
}
