"use client";

import { motion } from "framer-motion";
import { MapPin, Sprout, Truck, ArrowRight, Clock, GraduationCap, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    active: false,
    buttonText: "Coming Soon",
    href: "#",
    category: "reporting",
  },
  {
    id: 3,
    title: "AgroMarket",
    subtitle: "Agricultural Marketplace",
    description:
      "Trade seeds, tools, and agricultural products. Connect with local farmers and build a sustainable food network.",
    icon: Sprout,
    active: false,
    buttonText: "Coming Soon",
    href: "#",
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
    active: false,
    buttonText: "Coming Soon",
    href: "#",
    category: "learning",
  },
];

const panelVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.48,
      ease: "easeOut",
    },
  }),
};

export function Services() {
  const featuredService = services.find((service) => service.active) ?? services[0];
  const secondaryServices = services.filter((service) => service.id !== featuredService.id);

  return (
    <section id="about" className="bg-transparent py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Platform Modules
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our GreenSystem Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Five connected products orchestrated for cleaner cities, greener zones,
            and smarter environmental action.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <motion.article
            custom={0}
            variants={panelVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-[28px] border border-emerald-300/35 bg-white/5 p-7 backdrop-blur-md shadow-[0_24px_55px_rgba(16,185,129,0.18)] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/18 blur-3xl transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-cyan-300/12 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  {featuredService.category}
                </span>
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                  Live Now
                </span>
              </div>

              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-bold text-foreground">{featuredService.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-emerald-200">
                    {featuredService.subtitle}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/16 text-emerald-100 shadow-[0_12px_24px_rgba(16,185,129,0.24)]">
                  <featuredService.icon className="h-8 w-8" />
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {featuredService.description}
              </p>

              <div className="mt-7 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Capture</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Photo Evidence</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Verify</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Community Signal</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Act</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Response Workflow</p>
                </div>
              </div>

              <div className="mt-7">
                <Button
                  className="h-11 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-6 text-sm font-semibold text-emerald-950 hover:from-emerald-300 hover:to-green-500"
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
          </motion.article>

          <div className="grid gap-4 sm:grid-cols-2">
            {secondaryServices.map((service, i) => (
            <motion.div
              key={service.id}
              custom={i + 1}
              variants={panelVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-300/40 hover:bg-white/[0.07]"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {service.category}
                </span>
                {!service.active ? (
                  <Badge
                    variant="secondary"
                    className="border border-white/15 bg-white/10 text-slate-200"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Coming Soon
                  </Badge>
                ) : null}
              </div>

              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-emerald-200">
                  <service.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{service.title}</h3>
                  <p className="mt-0.5 text-xs font-medium text-emerald-200">{service.subtitle}</p>
                </div>
              </div>

              <p className="mb-5 text-sm leading-relaxed text-slate-300">
                {service.description}
              </p>

              <Button
                disabled={!service.active}
                className={`h-10 w-full rounded-xl text-sm ${
                  service.active
                    ? "bg-gradient-to-r from-emerald-400 to-green-600 text-emerald-950 hover:from-emerald-300 hover:to-green-500"
                    : "cursor-not-allowed border border-white/15 bg-white/10 text-slate-300"
                }`}
                onClick={() => {
                  if (!service.active) return;
                  window.location.href = "/login?redirect=/reported-area";
                }}
              >
                {service.buttonText}
                {service.active ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
