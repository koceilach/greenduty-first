"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type WelcomeEntranceProps = {
  onDone: () => void;
  durationMs?: number;
};

export function WelcomeEntrance({
  onDone,
  durationMs = 1400,
}: WelcomeEntranceProps) {
  const reduceMotion = useReducedMotion();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsExiting(true);
    }, reduceMotion ? 700 : durationMs);

    return () => window.clearTimeout(timeout);
  }, [durationMs, reduceMotion]);

  useEffect(() => {
    if (!isExiting) return;
    const timeout = window.setTimeout(() => {
      onDone();
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [isExiting, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-[120] overflow-hidden"
      aria-label="GreenDuty welcome entrance"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#05231f_0%,#0b3b33_55%,#04211b_100%)]" />
      <div className="absolute inset-0 bg-black/20" />

      <button
        type="button"
        onClick={() => setIsExiting(true)}
        className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-white/85 backdrop-blur transition-all duration-200 hover:bg-white/20 active:scale-[0.97] sm:right-6 sm:top-6"
      >
        SKIP
      </button>

      <div className="relative z-10 flex h-full items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="mx-auto w-full max-w-lg text-center"
        >
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-300/35 bg-white/10 shadow-[0_16px_48px_-24px_rgba(16,185,129,0.6)] backdrop-blur-xl sm:h-24 sm:w-24">
            {!reduceMotion && <span className="absolute inset-0 rounded-3xl border border-emerald-300/25 animate-pulse" />}
            <Image
              src="/logo.png"
              alt="GreenDuty logo"
              width={56}
              height={56}
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              priority
            />
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/85 sm:text-xs">
            WELCOME TO
          </p>

          <h1 className="mt-2 text-[clamp(2rem,9.2vw,4.2rem)] font-semibold tracking-[-0.03em] text-white">
            GreenDuty
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-balance text-base text-emerald-100/90 sm:text-lg">
            Next generation of nature.
          </p>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-8 h-1.5 overflow-hidden rounded-full border border-white/15 bg-white/10 sm:inset-x-10">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: reduceMotion ? 1 : durationMs / 1000,
            ease: "linear",
          }}
          className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-teal-300"
        />
      </div>
    </motion.div>
  );
}
