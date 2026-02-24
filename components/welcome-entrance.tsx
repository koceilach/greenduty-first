"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type WelcomeEntranceProps = {
  onDone: () => void;
  durationMs?: number;
};

const PARTICLES = [
  { top: "12%", left: "14%", size: "h-2 w-2", delay: 0.1, duration: 3.3 },
  { top: "18%", left: "78%", size: "h-1.5 w-1.5", delay: 0.3, duration: 3.9 },
  { top: "28%", left: "62%", size: "h-2.5 w-2.5", delay: 0.6, duration: 3.6 },
  { top: "39%", left: "24%", size: "h-1.5 w-1.5", delay: 0.9, duration: 3.1 },
  { top: "54%", left: "72%", size: "h-2 w-2", delay: 1.2, duration: 3.7 },
  { top: "68%", left: "16%", size: "h-1.5 w-1.5", delay: 0.8, duration: 3.4 },
  { top: "76%", left: "54%", size: "h-2 w-2", delay: 1.1, duration: 3.8 },
  { top: "84%", left: "86%", size: "h-1.5 w-1.5", delay: 0.5, duration: 3.2 },
];

export function WelcomeEntrance({
  onDone,
  durationMs = 3400,
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
    }, reduceMotion ? 1200 : durationMs);

    return () => window.clearTimeout(timeout);
  }, [durationMs, reduceMotion]);

  useEffect(() => {
    if (!isExiting) return;
    const timeout = window.setTimeout(() => {
      onDone();
    }, reduceMotion ? 220 : 720);
    return () => window.clearTimeout(timeout);
  }, [isExiting, onDone, reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[120] overflow-hidden"
      aria-label="GreenDuty welcome entrance"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(52,211,153,0.34),transparent_40%),radial-gradient(circle_at_82%_8%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_50%_72%,rgba(16,185,129,0.18),transparent_42%),linear-gradient(155deg,#02110f_0%,#06231f_46%,#03100e_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.16]" />
      <motion.div
        className="absolute -left-24 top-[18%] h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 36, 0], y: [0, -24, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 5.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
      />
      <motion.div
        className="absolute -right-24 bottom-[14%] h-72 w-72 rounded-full bg-teal-300/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -32, 0], y: [0, 20, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 5.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
      />

      {!reduceMotion &&
        PARTICLES.map((particle) => (
          <motion.span
            key={`${particle.top}-${particle.left}`}
            className={`absolute rounded-full bg-emerald-300/75 shadow-[0_0_20px_rgba(16,185,129,0.55)] ${particle.size}`}
            style={{ top: particle.top, left: particle.left }}
            animate={{ y: [0, -20, 0], opacity: [0.25, 1, 0.25] }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}

      <button
        type="button"
        onClick={() => setIsExiting(true)}
        className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-white/85 backdrop-blur transition-all duration-200 hover:bg-white/20 active:scale-[0.97] sm:right-6 sm:top-6"
      >
        SKIP
      </button>

      <div className="relative z-10 flex h-full items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0.2 : 0.72,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto w-full max-w-2xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              duration: reduceMotion ? 0.2 : 0.7,
              delay: reduceMotion ? 0 : 0.1,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-300/35 bg-white/10 shadow-[0_20px_60px_-22px_rgba(16,185,129,0.65)] backdrop-blur-xl sm:h-24 sm:w-24"
          >
            <Image
              src="/logo.png"
              alt="GreenDuty logo"
              width={56}
              height={56}
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              priority
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: reduceMotion ? 0 : 0.32 }}
            className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/85 sm:text-xs"
          >
            WELCOME TO
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.44 }}
            className="mt-2 text-[clamp(2rem,9.2vw,4.7rem)] font-semibold tracking-[-0.03em] text-white"
          >
            GreenDuty
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: reduceMotion ? 0 : 0.58 }}
            className="mx-auto mt-4 max-w-xl text-balance text-base text-emerald-100/90 sm:text-xl"
          >
            Next generation of nature.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.86 }}
            className="mx-auto mt-3 max-w-lg text-xs uppercase tracking-[0.16em] text-white/60 sm:text-sm"
          >
            Track. Learn. Trade. Restore.
          </motion.p>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-8 h-1.5 overflow-hidden rounded-full border border-white/15 bg-white/10 sm:inset-x-10">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isExiting ? 1 : 1 }}
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
