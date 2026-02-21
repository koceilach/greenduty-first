"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Interactive3DSection } from "@/components/interactive-3d-section";
import { Services } from "@/components/services";
import { WorkWithUs } from "@/components/work-with-us";
import { ImpactStats } from "@/components/impact-stats";
import { DiscordCommunity } from "@/components/discord-community";
import { HelpUs } from "@/components/help-us";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n/context";

function SectionReveal({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 96%", "start 42%"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.55, 1], [0, 0.68, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [104, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.965, 1]);

  return (
    <motion.div
      ref={sectionRef}
      style={{ opacity, y, scale, willChange: "opacity, transform" }}
      className="relative z-10 snap-start pb-8 sm:pb-12"
    >
      {children}
    </motion.div>
  );
}

function ScrollProgressRail() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.35,
  });

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-40 h-0.5 bg-black/10 light:bg-slate-900/10">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400"
          style={{ scaleX: smoothProgress, willChange: "transform" }}
        />
      </div>
      <div className="pointer-events-none fixed bottom-8 right-4 z-40 hidden h-28 w-1 overflow-hidden rounded-full bg-white/15 sm:block light:bg-slate-900/15">
        <motion.div
          className="h-full w-full origin-bottom rounded-full bg-gradient-to-t from-emerald-500 to-sky-400"
          style={{ scaleY: smoothProgress, willChange: "transform" }}
        />
      </div>
    </>
  );
}

function HeroEarthScrollCue() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  return (
    <div className="relative z-20 -mt-2 mb-2 flex justify-center sm:-mt-5 sm:mb-3">
      <a
        href="#earth-section"
        aria-label={t("landing.page.scroll.aria")}
        className="group inline-flex flex-col items-center gap-1.5 text-[var(--gd-text-70)] transition hover:text-emerald-200 light:hover:text-emerald-700"
      >
        <span className={`text-[10px] font-semibold ${isArabic ? "" : "uppercase tracking-[0.2em]"}`}>
          {t("landing.page.scroll")}
        </span>
        <span className="relative flex h-11 w-7 items-start justify-center rounded-full border-2 border-white/45 light:border-slate-700/35">
          <motion.span
            animate={{ y: [0, 10, 0], opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current"
          />
        </span>
      </a>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen snap-y snap-proximity overflow-x-clip bg-[var(--gd-home-bg-gradient)] text-[var(--gd-text-100)]">
      <ScrollProgressRail />

      <Navbar />
      <SectionReveal>
        <Hero />
      </SectionReveal>
      <HeroEarthScrollCue />
      <SectionReveal>
        <Interactive3DSection />
      </SectionReveal>
      <SectionReveal>
        <Services />
      </SectionReveal>
      <SectionReveal>
        <WorkWithUs />
      </SectionReveal>
      <SectionReveal>
        <ImpactStats />
      </SectionReveal>
      <SectionReveal>
        <DiscordCommunity />
      </SectionReveal>
      <SectionReveal>
        <HelpUs />
      </SectionReveal>
      <SectionReveal>
        <Contact />
      </SectionReveal>
      <SectionReveal>
        <Footer />
      </SectionReveal>
    </main>
  );
}
