"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Users, Leaf, Award } from "lucide-react";

const stats = [
  {
    id: 1,
    value: 127,
    suffix: "+",
    label: "Cleaned Areas",
    icon: MapPin,
    description: "Pollution hotspots cleaned",
  },
  {
    id: 2,
    value: 5420,
    suffix: "+",
    label: "Active Users",
    icon: Users,
    description: "Eco-warriors nationwide",
  },
  {
    id: 3,
    value: 48,
    suffix: "",
    label: "Wilayas",
    icon: Leaf,
    description: "Provinces connected",
  },
  {
    id: 4,
    value: 15,
    suffix: "K+",
    label: "Trees Planted",
    icon: Award,
    description: "Through community efforts",
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

      // Easing function for smooth animation
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
  const [spotlightStat, ...trailStats] = stats;

  return (
    <section id="events" className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-24 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Live Environmental Score
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Our Impact
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Real numbers, real change. See how our community is transforming Algeria.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[30px] border border-white/12 bg-white/5 p-6 backdrop-blur-md shadow-[0_24px_58px_rgba(0,0,0,0.34)] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-emerald-400/14 blur-3xl" />
            <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.04fr_0.96fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                Spotlight Metric
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-100 sm:text-3xl">
                {spotlightStat.label}
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                {spotlightStat.description}. This signal summarizes direct field outcomes.
              </p>

              <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] sm:h-44 sm:w-44">
                  <span className="absolute inset-4 rounded-full border border-emerald-300/30" />
                  <span className="absolute inset-9 rounded-full border border-emerald-300/20" />
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/35 bg-emerald-400/14 text-emerald-100"
                  >
                    <spotlightStat.icon className="h-7 w-7" />
                  </motion.div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Current Value
                  </p>
                  <p className="mt-1 text-3xl font-bold sm:text-5xl md:text-6xl">
                    <CountUp target={spotlightStat.value} suffix={spotlightStat.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-slate-300">Continuously updated by community reports</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Verified feed
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Real-time aggregation
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Community-backed
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute bottom-2 left-5 top-2 w-px bg-gradient-to-b from-emerald-300/45 via-white/18 to-transparent" />
              <div className="space-y-4">
                {trailStats.map((stat, i) => (
                  <motion.article
                    key={stat.id}
                    initial={{ opacity: 0, x: 22 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                    whileHover={{ x: 4 }}
                    className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4 pl-14 backdrop-blur-sm"
                  >
                    <span className="absolute left-4 top-4 h-3 w-3 rounded-full border border-emerald-300/40 bg-emerald-300/70 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />

                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">{stat.label}</p>
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                      >
                        <stat.icon className="h-5 w-5 text-slate-100" />
                      </motion.div>
                    </div>

                    <p className="text-3xl font-bold text-slate-100 sm:text-4xl">
                      <CountUp target={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-1 text-xs text-slate-300">{stat.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-8 py-4 font-semibold text-emerald-950 transition-colors hover:from-emerald-300 hover:to-green-500"
          >
            Join the Movement
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
