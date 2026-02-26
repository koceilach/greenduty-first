"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUp } from "lucide-react";
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
import { WelcomeEntrance } from "@/components/welcome-entrance";
import { useI18n } from "@/lib/i18n/context";

const GD_WELCOME_SEEN_KEY = "gd_welcome_seen_v1";

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

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroSection = document.getElementById("home");

    const updateVisibility = () => {
      if (!heroSection) {
        setVisible(window.scrollY > 360);
        return;
      }
      const heroBottom = heroSection.getBoundingClientRect().bottom;
      setVisible(heroBottom <= 0);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <motion.button
      type="button"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 12,
        scale: visible ? 1 : 0.94,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.9rem,env(safe-area-inset-right))] z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/70 text-white shadow-[0_16px_32px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-emerald-500/90 light:border-slate-300 light:bg-white/90 light:text-slate-700 light:hover:border-emerald-500 light:hover:bg-emerald-500 light:hover:text-white"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <ArrowUp className="h-4.5 w-4.5" />
    </motion.button>
  );
}

export default function Home() {
  const [showEntrance, setShowEntrance] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setShowEntrance(window.localStorage.getItem(GD_WELCOME_SEEN_KEY) !== "1");
    } catch {
      setShowEntrance(true);
    }
  }, []);

  const handleEntranceDone = useCallback(() => {
    try {
      window.localStorage.setItem(GD_WELCOME_SEEN_KEY, "1");
    } catch {
      // Ignore storage failures and just continue.
    }
    setShowEntrance(false);
  }, []);

  const entranceResolved = showEntrance !== null;
  const entranceActive = showEntrance === true;

  return (
    <>
      {entranceActive && <WelcomeEntrance onDone={handleEntranceDone} />}

      <main
        className={`relative min-h-screen snap-y snap-proximity overflow-x-clip bg-[var(--gd-home-bg-gradient)] text-[var(--gd-text-100)] transition-[filter,transform,opacity] duration-500 ${
          !entranceResolved || entranceActive ? "pointer-events-none select-none" : ""
        }`}
        style={{
          opacity: !entranceResolved ? 0 : entranceActive ? 0.95 : 1,
          transform: entranceActive ? "scale(1.005)" : "scale(1)",
          filter: entranceActive ? "blur(2px)" : "blur(0px)",
          willChange: "transform, filter, opacity",
        }}
      >
        <ScrollProgressRail />
        <BackToTopButton />

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
    </>
  );
}
