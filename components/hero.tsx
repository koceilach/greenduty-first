"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

const heroImage =
  "/images/hero-hills-user.jpg";
const previewImage =
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=700&q=80";

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pb-10 pt-24 sm:pb-14 sm:pt-28"
    >
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
          <Image
            src={heroImage}
            alt="Rolling green hills with trees in soft natural light"
            fill
            priority
            sizes="(min-width: 1280px) 1220px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
            className="object-cover object-[38%_45%] sm:object-[46%_45%] lg:object-[50%_48%]"
          />
          <div className="gd-home-hero-overlay absolute inset-0" />
          <div className="gd-home-hero-sheen absolute inset-0" />

          <div className="relative z-10 flex min-h-[400px] flex-col justify-between p-6 sm:min-h-[520px] sm:p-10 lg:min-h-[600px] lg:p-12">
            <div className="max-w-[42rem] pt-2 sm:pt-5">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="gd-home-hero-eyebrow text-[0.88rem] font-normal tracking-[0.01em] sm:text-[1.05rem]"
              >
                #1 Energy provider in the world
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="gd-home-hero-title mt-4 text-[clamp(3.9rem,11.2vw,8.6rem)] font-light leading-[0.9] tracking-[-0.04em]"
              >
                <span className="block">New Energy</span>
                <span className="block">for the Future</span>
              </motion.h1>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="mt-8 flex flex-wrap items-center gap-7 sm:gap-8"
            >
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login?redirect=/GreenSport";
                }}
                className="gd-home-hero-cta group inline-flex items-center gap-1.5 pb-1.5 text-[0.9rem] font-medium transition"
              >
                Get in touch
                <ArrowUpRight className="gd-home-hero-cta-icon h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login?redirect=/reported-area";
                }}
                className="gd-home-hero-cta group inline-flex items-center gap-1.5 pb-1.5 text-[0.9rem] font-medium transition"
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
            className="relative z-20 mx-4 mb-4 mt-5 sm:absolute sm:-bottom-4 sm:left-auto sm:mb-0 sm:mr-0 sm:mt-0 sm:w-[530px] sm:right-0"
          >
            <div className="gd-home-stats-card rounded-[24px] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.36)] sm:p-6">
              <div className="gd-home-stats-grid grid grid-cols-3 divide-x">
                {[
                  { value: "6 mil", label: "The company's annual net income" },
                  { value: "315", label: "Projects completed worldwide" },
                  { value: "120K", label: "Employees work in all parts of the world" },
                ].map((stat) => (
                  <div key={stat.label} className="px-2 first:pl-0 last:pr-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="gd-home-stats-value text-3xl font-semibold leading-none tracking-tight sm:text-[3rem] sm:font-medium">
                      {stat.value}
                    </p>
                    <p className="gd-home-stats-label mt-2 max-w-[10.5rem] text-[0.68rem] leading-[1.25] sm:text-[0.72rem]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.05 }}
            className="-mt-1 text-4xl leading-tight tracking-tight text-white sm:-mt-2 sm:text-5xl lg:-mt-3"
          >
            Focusing on quality, we maintain customer trust
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 2.2 }}
            className="max-w-xl text-base text-slate-300 sm:text-lg"
          >
            We ensure every initiative we build has measurable outcomes and long-term
            community value through transparent tools and verified data.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 2.35 }}
          className="mb-12 mt-10 grid grid-cols-2 gap-4 sm:mb-14 sm:grid-cols-5"
        >
          {["Trend Micro", "Telia Cygate", "Business", "Headspace", "Medtronic"].map((brand) => (
            <div
              key={brand}
              className="flex h-20 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-sm font-medium text-slate-300 backdrop-blur-sm"
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
