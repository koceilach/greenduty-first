"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Interactive3DSection } from "@/components/interactive-3d-section";
import { Services } from "@/components/services";
import { WorkWithUs } from "@/components/work-with-us";
import { ImpactStats } from "@/components/impact-stats";
import { DiscordCommunity } from "@/components/discord-community";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";

function SectionReveal({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 88%", "end 36%"],
  });

  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.4, 1], [0, 1, 1]), {
    stiffness: 140,
    damping: 28,
    mass: 0.55,
  });
  const scale = useSpring(useTransform(scrollYProgress, [0, 0.4, 1], [0.95, 1, 1]), {
    stiffness: 140,
    damping: 28,
    mass: 0.55,
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 0.4], [28, 0]), {
    stiffness: 140,
    damping: 28,
    mass: 0.55,
  });

  return (
    <motion.div ref={sectionRef} style={{ opacity, scale, y }} className="relative z-10">
      {children}
    </motion.div>
  );
}

function ParallaxParticles() {
  const { scrollY } = useScroll();
  const parallax = useSpring(useTransform(scrollY, (value) => -value * 0.3), {
    stiffness: 40,
    damping: 24,
    mass: 0.9,
  });

  const particles = useMemo(
    () =>
      Array.from({ length: 44 }).map((_, index) => ({
        id: index,
        left: ((index * 37 + 9) % 100) + 0.5,
        top: ((index * 53 + 7) % 100) + 0.5,
        size: (index % 3) + 1.8,
        duration: 10 + (index % 7) * 1.8,
        delay: (index % 9) * 0.6,
        drift: ((index % 5) - 2) * 7,
      })),
    []
  );

  return (
    <motion.div style={{ y: parallax }} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="gd-home-particle absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -220],
            x: [0, particle.drift, 0],
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      ))}
    </motion.div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-clip text-[var(--gd-text-100)]">
      <div className="gd-home-bg pointer-events-none fixed inset-0 -z-30" />
      <div className="gd-home-grid pointer-events-none fixed inset-0 -z-20" />
      <ParallaxParticles />

      <Navbar />
      <SectionReveal>
        <Hero />
      </SectionReveal>
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
        <Contact />
      </SectionReveal>
      <SectionReveal>
        <Footer />
      </SectionReveal>
    </main>
  );
}
