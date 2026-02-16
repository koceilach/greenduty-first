"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

const heroImage = "/images/hero-hills-user.jpg";
const previewImage =
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=700&q=80";
const heroStats = [
  { value: "6 mil", label: "Annual net income" },
  { value: "315", label: "Projects completed" },
  { value: "120K", label: "Team members globally" },
];

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pb-8 pt-20 sm:pb-14 sm:pt-28">
      <div className="mx-auto max-w-[1220px] px-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[24px] border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.48)] sm:rounded-[28px]">
          <Image
            src={heroImage}
            alt="Rolling green hills with trees in soft natural light"
            fill
            priority
            sizes="(min-width: 1280px) 1220px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 24px)"
            className="object-cover object-[34%_42%] sm:object-[46%_45%] lg:object-[50%_48%]"
          />
          <div className="gd-home-hero-overlay absolute inset-0" />
          <div className="gd-home-hero-sheen absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/75 via-black/40 to-transparent sm:hidden" />

          <div className="relative z-10 flex min-h-[500px] flex-col justify-between p-5 pb-6 sm:min-h-[520px] sm:p-10 lg:min-h-[600px] lg:p-12">
            <div className="max-w-[44rem] pt-3 sm:pt-5">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="gd-home-hero-eyebrow inline-flex w-fit items-center rounded-full border border-white/25 bg-black/25 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.11em] backdrop-blur-sm sm:text-[0.78rem]"
              >
                #1 Energy provider in the world
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="gd-home-hero-title mt-4 text-[clamp(2.25rem,12.4vw,8.6rem)] font-light leading-[0.92] tracking-[-0.04em]"
              >
                <span className="block">New Energy</span>
                <span className="block">for the Future</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28 }}
                className="gd-home-hero-copy mt-4 max-w-[34rem] text-sm leading-relaxed sm:text-base"
              >
                Reliable clean-energy infrastructure, practical digital tools, and measurable impact for every community.
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="mt-7 grid w-full gap-2.5 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-8"
            >
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login?redirect=/GreenSport";
                }}
                className="gd-home-hero-cta group inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 text-[0.9rem] font-medium transition sm:h-auto sm:w-auto sm:justify-start sm:px-0 sm:py-2 sm:pb-1.5"
              >
                Get in touch
                <ArrowUpRight className="gd-home-hero-cta-icon h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login?redirect=/reported-area";
                }}
                className="gd-home-hero-cta group inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 text-[0.9rem] font-medium transition sm:h-auto sm:w-auto sm:justify-start sm:px-0 sm:py-2 sm:pb-1.5"
              >
                Our services
                <ArrowUpRight className="gd-home-hero-cta-icon h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="gd-home-preview-card absolute right-4 top-4 hidden w-[220px] rounded-[20px] p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl md:block lg:right-8 lg:top-8"
          >
            <div className="gd-home-preview-dots flex justify-end text-xl leading-none">...</div>
            <div className="mt-1 overflow-hidden rounded-xl">
              <img src={previewImage} alt="Recent GreenDuty project" className="h-28 w-full object-cover" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="gd-home-preview-chip inline-flex h-8 w-8 items-center justify-center rounded-full">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              <p className="gd-home-preview-text text-right text-[1.02rem] leading-[1.35]">Discover Our<br />Recent Project</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 1.8 }}
            className="relative z-20 mx-3 mb-3 mt-4 sm:absolute sm:-bottom-4 sm:right-0 sm:mx-0 sm:mb-0 sm:mt-0 sm:w-[530px]"
          >
            <div className="gd-home-stats-card rounded-[20px] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.36)] sm:rounded-[24px] sm:p-6">
              <div className="gd-home-stats-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x">
                {heroStats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 ${
                      index === heroStats.length - 1 ? "col-span-2 sm:col-span-1" : ""
                    } sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:py-0`}
                  >
                    <p className="gd-home-stats-value text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[3rem] sm:font-medium">
                      {stat.value}
                    </p>
                    <p className="gd-home-stats-label mt-1.5 max-w-[12.5rem] text-[0.67rem] leading-[1.3] sm:mt-2 sm:max-w-[10.5rem] sm:text-[0.72rem]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-8 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.05 }}
            className="text-[1.55rem] leading-[1.12] tracking-tight text-white sm:-mt-2 sm:text-4xl lg:-mt-3 lg:text-5xl"
          >
            Focusing on quality, we maintain customer trust
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.2 }}
            className="max-w-xl text-[0.95rem] text-slate-300 sm:text-lg"
          >
            We ensure every initiative we build has measurable outcomes and long-term
            community value through transparent tools and verified data.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 2.35 }}
          className="mb-10 mt-8 grid grid-cols-2 gap-3 sm:mb-14 sm:mt-10 sm:grid-cols-5 sm:gap-4"
        >
          {["Trend Micro", "Telia Cygate", "Business", "Headspace", "Medtronic"].map((brand) => (
            <div
              key={brand}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-2 text-center text-[0.76rem] font-medium text-slate-300 backdrop-blur-sm sm:h-20 sm:rounded-full sm:text-sm"
            >
              {brand}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.5 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex h-10 w-6 justify-center rounded-full border-2 border-muted-foreground/30 pt-2"
        >
          <motion.div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
}
