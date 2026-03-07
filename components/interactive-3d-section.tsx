"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/context";
import {
  Eye,
  Radio,
  TrendingUp,
  TreePine,
  BarChart3,
  Users,
  ArrowRight,
  Globe,
  Sparkles,
  Heart,
} from "lucide-react";

/* ─── Framer-motion variants (one-shot entrance — zero runtime cost) ──── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};



const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ─── Animated counter hook ──────────────────────────────────────────────── */
function useCounter(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return value;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Digital Earth Illustration — Premium Tech Globe
 *
 *  A stylized luminous Earth globe with orbital data rings,
 *  atmospheric glow, geometric continental forms, and floating
 *  holographic UI elements. Clean, modern, futuristic.
 *  100 % static SVG — zero runtime animation cost.
 * ═══════════════════════════════════════════════════════════════════════════ */
function NatureIllustration({ className, isLight = false }: { className?: string; isLight?: boolean }) {
  /* opacity multiplier: light backgrounds need bolder fills */
  const o = (dark: number, light: number) => isLight ? light : dark;

  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Globe body gradient */}
        <radialGradient id="ge-globe" cx="230" cy="220" r="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? "#047857" : "#059669"} stopOpacity={o(0.45, 0.35)} />
          <stop offset="45%" stopColor="#047857" stopOpacity={o(0.3, 0.25)} />
          <stop offset="80%" stopColor="#064e3b" stopOpacity={o(0.2, 0.18)} />
          <stop offset="100%" stopColor={isLight ? "#064e3b" : "#022c22"} stopOpacity={o(0.15, 0.12)} />
        </radialGradient>
        {/* Atmosphere rim */}
        <radialGradient id="ge-atmo" cx="260" cy="260" r="155" gradientUnits="userSpaceOnUse">
          <stop offset="75%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="92%" stopColor="#10b981" stopOpacity={o(0.12, 0.2)} />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity={o(0.06, 0.12)} />
        </radialGradient>
        {/* Outer glow */}
        <radialGradient id="ge-outerGlow" cx="260" cy="260" r="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity={o(0.08, 0.1)} />
          <stop offset="50%" stopColor="#14b8a6" stopOpacity={o(0.03, 0.06)} />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        {/* Specular highlight */}
        <radialGradient id="ge-spec" cx="210" cy="200" r="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity={o(0.12, 0.25)} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        {/* Continent gradient */}
        <linearGradient id="ge-land" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "#059669" : "#34d399"} stopOpacity={o(0.55, 0.7)} />
          <stop offset="100%" stopColor={isLight ? "#047857" : "#10b981"} stopOpacity={o(0.35, 0.5)} />
        </linearGradient>
        {/* Ocean shimmer */}
        <linearGradient id="ge-ocean" x1="180" y1="160" x2="340" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity={o(0.08, 0.1)} />
          <stop offset="100%" stopColor="#0891b2" stopOpacity={o(0.03, 0.06)} />
        </linearGradient>
        {/* Orbit gradient */}
        <linearGradient id="ge-orbit1" x1="60" y1="260" x2="460" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="30%" stopColor={isLight ? "#059669" : "#10b981"} stopOpacity={o(0.25, 0.45)} />
          <stop offset="70%" stopColor={isLight ? "#0d9488" : "#14b8a6"} stopOpacity={o(0.25, 0.45)} />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ge-orbit2" x1="100" y1="260" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="30%" stopColor={isLight ? "#0891b2" : "#06b6d4"} stopOpacity={o(0.18, 0.35)} />
          <stop offset="70%" stopColor={isLight ? "#0d9488" : "#14b8a6"} stopOpacity={o(0.18, 0.35)} />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        {/* Holo card gradient */}
        <linearGradient id="ge-holo" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "#059669" : "#10b981"} stopOpacity={o(0.12, 0.1)} />
          <stop offset="100%" stopColor={isLight ? "#059669" : "#10b981"} stopOpacity={o(0.04, 0.04)} />
        </linearGradient>
        {/* Node glow */}
        <filter id="ge-nodeGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ge-softGlow">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        {/* Reflection gradient */}
        <radialGradient id="ge-reflect" cx="260" cy="430" r="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity={o(0.06, 0.1)} />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        {/* Clip for globe content */}
        <clipPath id="ge-globeClip">
          <circle cx="260" cy="260" r="142" />
        </clipPath>
      </defs>

      {/* ── Star field (dark mode only) ─── */}
      {!isLight && ([
        [42, 68, 1.2], [478, 52, 1.0], [88, 420, 0.9], [450, 440, 1.1],
        [35, 180, 0.8], [485, 180, 0.7], [120, 35, 0.9], [400, 30, 1.0],
        [60, 320, 0.7], [470, 330, 0.8], [170, 475, 0.8], [350, 480, 0.9],
        [25, 260, 0.6], [495, 260, 0.7], [260, 20, 0.8], [260, 500, 0.7],
        [145, 60, 0.6], [375, 65, 0.7], [50, 400, 0.5], [460, 400, 0.6],
      ] as const).map(([cx, cy, r], i) => (
        <circle key={`s-${i}`} cx={cx} cy={cy} r={r} fill="white" opacity={0.08 + (i % 4) * 0.04} />
      ))}

      {/* ── Outer ambient glow ─── */}
      <circle cx="260" cy="260" r="220" fill="url(#ge-outerGlow)" />
      <circle cx="260" cy="260" r="180" fill="#10b981" opacity={o(0.03, 0.05)} filter="url(#ge-softGlow)" />

      {/* ── Reflection below globe ─── */}
      <ellipse cx="260" cy="435" rx="100" ry="20" fill="url(#ge-reflect)" />

      {/* ── Globe shadow (light mode) ─── */}
      {isLight && (
        <ellipse cx="260" cy="420" rx="110" ry="14" fill="#064e3b" opacity="0.06" filter="url(#ge-softGlow)" />
      )}

      {/* ── Orbital ring 1 — wide tilt ─── */}
      <g>
        <ellipse cx="260" cy="260" rx="200" ry="60" stroke="url(#ge-orbit1)" strokeWidth={o(0.8, 1.2)} fill="none" transform="rotate(-20 260 260)" />
        {/* Nodes on orbit 1 */}
        <g filter="url(#ge-nodeGlow)">
          <circle cx="80" cy="228" r="4" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.5, 0.7)} />
          <circle cx="80" cy="228" r="2" fill={isLight ? "#10b981" : "#34d399"} opacity={o(0.9, 1)} />
        </g>
        <g filter="url(#ge-nodeGlow)">
          <circle cx="438" cy="286" r="3.5" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.45, 0.65)} />
          <circle cx="438" cy="286" r="1.8" fill={isLight ? "#10b981" : "#34d399"} opacity={o(0.85, 1)} />
        </g>
        {/* Dashed trail */}
        <ellipse cx="260" cy="260" rx="200" ry="60" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.3" fill="none" strokeDasharray="2 8" opacity={o(0.1, 0.2)} transform="rotate(-20 260 260)" />
      </g>

      {/* ── Orbital ring 2 — steep tilt ─── */}
      <g>
        <ellipse cx="260" cy="260" rx="180" ry="170" stroke="url(#ge-orbit2)" strokeWidth={o(0.6, 1)} fill="none" transform="rotate(70 260 260)" />
        {/* Nodes on orbit 2 */}
        <g filter="url(#ge-nodeGlow)">
          <circle cx="260" cy="82" r="3.5" fill={isLight ? "#0891b2" : "#06b6d4"} opacity={o(0.5, 0.7)} />
          <circle cx="260" cy="82" r="1.8" fill={isLight ? "#22d3ee" : "#67e8f9"} opacity={o(0.85, 1)} />
        </g>
        <g filter="url(#ge-nodeGlow)">
          <circle cx="260" cy="438" r="3" fill={isLight ? "#0891b2" : "#06b6d4"} opacity={o(0.35, 0.55)} />
          <circle cx="260" cy="438" r="1.5" fill={isLight ? "#22d3ee" : "#67e8f9"} opacity={o(0.75, 1)} />
        </g>
      </g>

      {/* ── Orbital ring 3 — medium tilt ─── */}
      <g>
        <ellipse cx="260" cy="260" rx="190" ry="90" stroke={isLight ? "#0d9488" : "#14b8a6"} strokeWidth={o(0.5, 0.8)} fill="none" strokeDasharray="4 12" opacity={o(0.12, 0.25)} transform="rotate(35 260 260)" />
        <g filter="url(#ge-nodeGlow)">
          <circle cx="106" cy="340" r="3" fill={isLight ? "#0d9488" : "#14b8a6"} opacity={o(0.4, 0.6)} />
          <circle cx="106" cy="340" r="1.5" fill={isLight ? "#2dd4bf" : "#5eead4"} opacity={o(0.8, 1)} />
        </g>
        <g filter="url(#ge-nodeGlow)">
          <circle cx="420" cy="180" r="3.5" fill={isLight ? "#0d9488" : "#14b8a6"} opacity={o(0.4, 0.6)} />
          <circle cx="420" cy="180" r="1.8" fill={isLight ? "#2dd4bf" : "#5eead4"} opacity={o(0.8, 1)} />
        </g>
      </g>

      {/* ── Connection lines between orbital nodes ─── */}
      <g stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.3" opacity={o(0.08, 0.15)} strokeDasharray="3 6">
        <line x1="80" y1="228" x2="260" y2="82" />
        <line x1="438" y1="286" x2="420" y2="180" />
        <line x1="106" y1="340" x2="260" y2="438" />
        <line x1="260" y1="82" x2="420" y2="180" />
        <line x1="80" y1="228" x2="106" y2="340" />
      </g>

      {/* ── Globe — main sphere ─── */}
      <circle cx="260" cy="260" r="142" fill="url(#ge-globe)" />
      <circle cx="260" cy="260" r="142" fill="url(#ge-ocean)" />
      <circle cx="260" cy="260" r="142" fill="url(#ge-atmo)" />
      {/* Light mode: subtle border for definition */}
      {isLight && <circle cx="260" cy="260" r="142" stroke="#059669" strokeWidth="0.6" fill="none" opacity="0.15" />}

      {/* ── Globe content (clipped) ─── */}
      <g clipPath="url(#ge-globeClip)">
        {/* Latitude lines */}
        <g stroke={isLight ? "#047857" : "#10b981"} strokeWidth="0.4" opacity={o(0.08, 0.18)} fill="none">
          <ellipse cx="260" cy="180" rx="138" ry="20" />
          <ellipse cx="260" cy="220" rx="142" ry="35" />
          <ellipse cx="260" cy="260" rx="142" ry="42" />
          <ellipse cx="260" cy="300" rx="142" ry="35" />
          <ellipse cx="260" cy="340" rx="138" ry="20" />
        </g>
        {/* Longitude curves */}
        <g stroke={isLight ? "#047857" : "#10b981"} strokeWidth="0.4" opacity={o(0.06, 0.14)} fill="none">
          <path d="M260 118 Q310 260 260 402" />
          <path d="M260 118 Q210 260 260 402" />
          <path d="M260 118 Q360 260 260 402" />
          <path d="M260 118 Q160 260 260 402" />
        </g>

        {/* ── Geometric continents ─── */}
        <path d="M185 175 L200 165 L225 170 L235 185 L245 180 L248 195 L230 210 L215 225 L200 220 L192 205 L180 195Z" fill="url(#ge-land)" />
        <path d="M215 270 L225 260 L235 265 L238 280 L240 300 L235 320 L225 335 L218 325 L212 305 L210 285Z" fill="url(#ge-land)" />
        <path d="M280 180 L295 175 L305 185 L300 200 L292 195 L285 198 L278 192Z" fill="url(#ge-land)" />
        <path d="M278 215 L290 210 L302 220 L308 240 L305 265 L298 285 L288 295 L280 285 L275 260 L272 235Z" fill="url(#ge-land)" />
        <path d="M310 170 L330 165 L350 172 L365 180 L370 195 L362 210 L345 218 L330 215 L320 208 L312 195 L308 182Z" fill="url(#ge-land)" />
        <path d="M345 300 L358 295 L370 302 L372 315 L365 325 L352 322 L345 312Z" fill="url(#ge-land)" />

        {/* Continent glow */}
        <path d="M185 175 L200 165 L225 170 L235 185 L245 180 L248 195 L230 210 L215 225 L200 220 L192 205 L180 195Z" fill="#34d399" opacity={o(0.08, 0.12)} filter="url(#ge-softGlow)" />
        <path d="M278 215 L290 210 L302 220 L308 240 L305 265 L298 285 L288 295 L280 285 L275 260 L272 235Z" fill="#34d399" opacity={o(0.06, 0.1)} filter="url(#ge-softGlow)" />
        <path d="M310 170 L330 165 L350 172 L365 180 L370 195 L362 210 L345 218 L330 215 L320 208 L312 195 L308 182Z" fill="#34d399" opacity={o(0.06, 0.1)} filter="url(#ge-softGlow)" />

        {/* Data hotspots on continents */}
        {([
          [210, 190], [230, 200], [220, 280], [290, 240], [295, 265],
          [340, 185], [355, 195], [335, 205], [360, 310], [225, 310],
        ] as const).map(([cx, cy], i) => (
          <g key={`hp-${i}`}>
            <circle cx={cx} cy={cy} r="2.5" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.3, 0.5)} filter="url(#ge-nodeGlow)" />
            <circle cx={cx} cy={cy} r="1" fill={isLight ? "#34d399" : "#6ee7b7"} opacity={o(0.8, 1)} />
          </g>
        ))}

        {/* Data connection arcs */}
        <g stroke={isLight ? "#047857" : "#10b981"} strokeWidth="0.4" opacity={o(0.1, 0.2)} fill="none" strokeDasharray="2 5">
          <path d="M210 190 Q250 160 290 240" />
          <path d="M230 200 Q280 180 340 185" />
          <path d="M295 265 Q320 280 360 310" />
          <path d="M220 280 Q250 260 290 240" />
          <path d="M340 185 Q350 230 360 310" />
        </g>
      </g>

      {/* ── Globe rim highlight ─── */}
      <circle cx="260" cy="260" r="142" stroke={isLight ? "#059669" : "#10b981"} strokeWidth={o(0.8, 1)} fill="none" opacity={o(0.15, 0.25)} />
      <circle cx="260" cy="260" r="143" stroke="#6ee7b7" strokeWidth="0.3" fill="none" opacity={o(0.08, 0.12)} />

      {/* ── Specular highlight ─── */}
      <circle cx="210" cy="200" r="80" fill="url(#ge-spec)" />

      {/* ── Atmosphere haze ─── */}
      <circle cx="260" cy="260" r="150" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="3" fill="none" opacity={o(0.04, 0.08)} />
      <circle cx="260" cy="260" r="155" stroke="#6ee7b7" strokeWidth="1" fill="none" opacity={o(0.03, 0.06)} />

      {/* ── Floating holo card — top right ─── */}
      <g transform="translate(390, 95)" opacity={o(0.5, 0.7)}>
        <rect x="0" y="0" width="70" height="42" rx="4" fill="url(#ge-holo)" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.5" strokeOpacity={o(0.2, 0.35)} />
        <rect x="8" y="24" width="6" height="12" rx="1" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.35, 0.5)} />
        <rect x="18" y="18" width="6" height="18" rx="1" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.45, 0.6)} />
        <rect x="28" y="14" width="6" height="22" rx="1" fill={isLight ? "#0d9488" : "#14b8a6"} opacity={o(0.55, 0.7)} />
        <rect x="38" y="20" width="6" height="16" rx="1" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.4, 0.55)} />
        <rect x="48" y="10" width="6" height="26" rx="1" fill={isLight ? "#0d9488" : "#14b8a6"} opacity={o(0.5, 0.65)} />
        <rect x="8" y="6" width="30" height="2" rx="1" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.2, 0.35)} />
        <line x1="0" y1="30" x2="-30" y2="60" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.4" strokeDasharray="2 4" opacity={o(0.2, 0.35)} />
      </g>

      {/* ── Floating holo card — bottom left ─── */}
      <g transform="translate(40, 360)" opacity={o(0.4, 0.6)}>
        <rect x="0" y="0" width="65" height="38" rx="4" fill="url(#ge-holo)" stroke={isLight ? "#0d9488" : "#14b8a6"} strokeWidth="0.5" strokeOpacity={o(0.2, 0.35)} />
        <path d="M10 19 Q18 12 26 19 Q34 26 42 19 Q50 12 58 19" stroke={isLight ? "#0d9488" : "#14b8a6"} strokeWidth="1" fill="none" opacity={o(0.4, 0.6)} />
        <path d="M10 24 Q18 18 26 24 Q34 30 42 24 Q50 18 58 24" stroke={isLight ? "#0d9488" : "#14b8a6"} strokeWidth="0.6" fill="none" opacity={o(0.25, 0.4)} />
        <rect x="10" y="6" width="25" height="2" rx="1" fill={isLight ? "#0d9488" : "#14b8a6"} opacity={o(0.2, 0.35)} />
        <line x1="65" y1="15" x2="95" y2="-30" stroke={isLight ? "#0d9488" : "#14b8a6"} strokeWidth="0.4" strokeDasharray="2 4" opacity={o(0.2, 0.35)} />
      </g>

      {/* ── Floating data badge — left ─── */}
      <g transform="translate(55, 155)" opacity={o(0.35, 0.55)}>
        <rect x="0" y="0" width="52" height="28" rx="4" fill="url(#ge-holo)" stroke={isLight ? "#0891b2" : "#06b6d4"} strokeWidth="0.5" strokeOpacity={o(0.2, 0.35)} />
        <circle cx="16" cy="14" r="8" stroke={isLight ? "#0891b2" : "#06b6d4"} strokeWidth="2" fill="none" opacity={o(0.3, 0.5)} strokeDasharray="35 15" strokeLinecap="round" />
        <circle cx="16" cy="14" r="8" stroke={isLight ? "#10b981" : "#6ee7b7"} strokeWidth="2" fill="none" opacity={o(0.4, 0.6)} strokeDasharray="12 38" strokeDashoffset="-35" strokeLinecap="round" />
        <rect x="30" y="8" width="16" height="2" rx="1" fill={isLight ? "#0891b2" : "#06b6d4"} opacity={o(0.25, 0.4)} />
        <rect x="30" y="14" width="12" height="2" rx="1" fill={isLight ? "#0891b2" : "#06b6d4"} opacity={o(0.15, 0.3)} />
        <rect x="30" y="20" width="14" height="2" rx="1" fill={isLight ? "#0891b2" : "#06b6d4"} opacity={o(0.2, 0.35)} />
      </g>

      {/* ── Signal pulse rings ─── */}
      <g opacity={o(0.12, 0.22)}>
        <circle cx="340" cy="185" r="10" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.6" fill="none" />
        <circle cx="340" cy="185" r="20" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.4" fill="none" />
        <circle cx="340" cy="185" r="32" stroke={isLight ? "#059669" : "#10b981"} strokeWidth="0.25" fill="none" />
      </g>

      {/* ── Satellite icon on orbit 1 ─── */}
      <g transform="translate(80, 228) rotate(-20)" opacity={o(0.6, 0.8)}>
        <rect x="-10" y="-2" width="7" height="4" rx="0.5" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.4, 0.6)} />
        <rect x="3" y="-2" width="7" height="4" rx="0.5" fill={isLight ? "#059669" : "#10b981"} opacity={o(0.4, 0.6)} />
        <rect x="-2" y="-3" width="4" height="6" rx="1" fill={isLight ? "#10b981" : "#34d399"} opacity={o(0.6, 0.8)} />
      </g>

      {/* ── Small floating particles ─── */}
      {([
        [150, 100, 1.5], [380, 420, 1.2], [90, 290, 1.0], [440, 130, 1.3],
        [180, 440, 0.9], [330, 55, 1.1], [75, 380, 0.8], [455, 370, 1.0],
      ] as const).map(([cx, cy, r], i) => (
        <circle key={`p-${i}`} cx={cx} cy={cy} r={r} fill={isLight ? "#059669" : "#10b981"} opacity={o(0.06 + (i % 3) * 0.03, 0.1 + (i % 3) * 0.05)} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Interactive3DSection  —  Light, Illustration-Driven Design
 *
 *  Redesigned for performance:
 *  • Zero canvas or continuous CSS animations
 *  • Beautiful static SVG nature illustration
 *  • One-shot framer-motion entrance animations only
 *  • Glass-morphism stat/feature cards
 *  • Split hero layout (text + illustration)
 *  • Full light-mode and RTL (Arabic) support
 * ═══════════════════════════════════════════════════════════════════════════ */
export function Interactive3DSection() {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    setThemeReady(true);
  }, []);
  const isLight = themeReady && resolvedTheme === "light";
  const isArabic = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  /* ── Animated counters (runs once on scroll-in, then stops) ──── */
  const forestCount = useCounter(1200, 2400, isInView);
  const reportCount = useCounter(847, 2200, isInView);
  const communityCount = useCounter(120, 2000, isInView);

  /* ── Feature cards ─────────────────────────── */
  const features = [
    {
      Icon: Eye,
      title: t("landing.earth.feature.monitor.title") ?? "Monitor",
      desc:
        t("landing.earth.feature.monitor.desc") ??
        "AI-powered satellite monitoring of forests, oceans, and urban ecosystems — all in real time.",
      accent: "emerald" as const,
    },
    {
      Icon: Radio,
      title: t("landing.earth.feature.report.title") ?? "Report",
      desc:
        t("landing.earth.feature.report.desc") ??
        "Citizen-powered incident reporting with GPS verification, photo evidence, and community validation.",
      accent: "teal" as const,
    },
    {
      Icon: TrendingUp,
      title: t("landing.earth.feature.impact.title") ?? "Impact",
      desc:
        t("landing.earth.feature.impact.desc") ??
        "Transparent dashboards turning local signals into measurable, verified environmental progress.",
      accent: "cyan" as const,
    },
  ];

  /* ── Stat cards data ────────────────────────── */
  const stats = [
    {
      Icon: TreePine,
      value: `${(forestCount / 1000).toFixed(1)}M`,
      suffix: " km²",
      label: t("landing.earth.badge.forests") ?? "Forests Monitored",
      accent: "emerald" as const,
    },
    {
      Icon: BarChart3,
      value: `${reportCount}K`,
      suffix: "+",
      label: t("landing.earth.badge.reports") ?? "Reports Filed",
      accent: "teal" as const,
    },
    {
      Icon: Users,
      value: `${communityCount}K`,
      suffix: "+",
      label: t("landing.earth.badge.community") ?? "Community Members",
      accent: "cyan" as const,
    },
  ];

  /* ── per-card accent tokens ── */
  const accentMap = {
    emerald: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-400 light:text-emerald-600",
      border: "border-emerald-500/20 light:border-emerald-200",
      ring: "ring-emerald-500/10 light:ring-emerald-200/40",
      iconBg: "light:bg-emerald-100",
      gradient: "from-emerald-500/20 to-emerald-500/0",
      bar: "bg-emerald-500",
      barTrack: "bg-emerald-500/10 light:bg-emerald-100",
      barPercent: 82,
      glow: "#10b981",
      stepBorder: "border-emerald-500/30",
      stepBorderLight: "light:border-emerald-300",
    },
    teal: {
      bg: "bg-teal-500/15",
      text: "text-teal-400 light:text-teal-600",
      border: "border-teal-500/20 light:border-teal-200",
      ring: "ring-teal-500/10 light:ring-teal-200/40",
      iconBg: "light:bg-teal-100",
      gradient: "from-teal-500/20 to-teal-500/0",
      bar: "bg-teal-500",
      barTrack: "bg-teal-500/10 light:bg-teal-100",
      barPercent: 68,
      glow: "#14b8a6",
      stepBorder: "border-teal-500/30",
      stepBorderLight: "light:border-teal-300",
    },
    cyan: {
      bg: "bg-cyan-500/15",
      text: "text-cyan-400 light:text-cyan-600",
      border: "border-cyan-500/20 light:border-cyan-200",
      ring: "ring-cyan-500/10 light:ring-cyan-200/40",
      iconBg: "light:bg-cyan-100",
      gradient: "from-cyan-500/20 to-cyan-500/0",
      bar: "bg-cyan-500",
      barTrack: "bg-cyan-500/10 light:bg-cyan-100",
      barPercent: 55,
      glow: "#06b6d4",
      stepBorder: "border-cyan-500/30",
      stepBorderLight: "light:border-cyan-300",
    },
  } as const;

  return (
    <section
      ref={sectionRef}
      id="earth-section"
      className="relative w-full scroll-mt-24 overflow-hidden bg-[var(--gd-home-bg-gradient)]"
    >
      {/* ── Static background (no animations) ─── */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {/* Subtle radial glow — fully static */}
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 opacity-[0.25] light:opacity-[0.12]"
          style={{
            width: "min(900px, 90vw)",
            height: "min(900px, 90vw)",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.12), rgba(20,184,166,0.04) 45%, transparent 70%)",
          }}
        />
        {/* Fine dot pattern — static */}
        <div
          className="absolute inset-0 opacity-[0.025] light:opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(16,185,129,0.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Gradient blend edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-[var(--gd-home-bg-gradient)] to-transparent sm:h-32" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[var(--gd-home-bg-gradient)] to-transparent sm:h-32" />

      {/* Decorative leaf accents in corners */}
      <div className="pointer-events-none absolute left-0 top-0 z-[1] opacity-[0.04] light:opacity-[0.06]" aria-hidden="true">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <path d="M0 0 Q60 40 80 120 Q50 80 0 80Z" fill="#10b981" />
          <path d="M0 0 Q40 60 30 140 Q20 70 0 50Z" fill="#059669" opacity="0.6" />
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 z-[1] rotate-180 opacity-[0.04] light:opacity-[0.06]" aria-hidden="true">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <path d="M0 0 Q60 40 80 120 Q50 80 0 80Z" fill="#10b981" />
          <path d="M0 0 Q40 60 30 140 Q20 70 0 50Z" fill="#059669" opacity="0.6" />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════
       *  MAIN CONTENT — Centered showcase layout
       * ═══════════════════════════════════════════════════════ */}
      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-10"
        variants={stagger}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {/* ── Section header — centered, compact ──────── */}
        <motion.div variants={fadeUp} className="pt-20 text-center sm:pt-24">
          <div className="mx-auto flex items-center justify-center gap-3">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-emerald-500/30" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400/50 light:text-emerald-600/60">
              {t("landing.earth.eyebrow") ?? "Our Planet"}
            </span>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-emerald-500/30" />
          </div>
          <h2 className="mx-auto mt-3 max-w-md text-lg font-medium leading-snug tracking-tight text-white/70 light:text-slate-700 sm:text-xl">
            {t("landing.earth.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-white/30 light:text-slate-400">
            {t("landing.earth.copy")}
          </p>
        </motion.div>

        {/* ── Globe showcase with overlaid stats ─────── */}
        <motion.div variants={scaleUp} className="relative mx-auto mt-10 sm:mt-14">
          {/* Globe — centered, contained */}
          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
            {/* Glow backdrop */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 m-auto h-3/4 w-3/4 rounded-full opacity-25 blur-[60px] light:opacity-10"
              style={{ background: "radial-gradient(circle, #10b98140, #14b8a620, transparent 70%)" }}
              aria-hidden="true"
            />
            <NatureIllustration className="w-full drop-shadow-[0_0_40px_rgba(16,185,129,0.06)] light:drop-shadow-[0_0_50px_rgba(5,150,105,0.12)]" isLight={isLight} />
          </div>

          {/* Stat cards — floating around the globe on desktop, stacked on mobile */}
          <div className={`mt-8 grid grid-cols-1 gap-2.5 sm:absolute sm:inset-0 sm:mt-0 sm:grid-cols-1 sm:gap-0 ${isArabic ? "direction-rtl" : ""}`}>
            {stats.map((s, i) => {
              const a = accentMap[s.accent];
              /* Position each card around the globe on desktop */
              const positions = [
                "sm:absolute sm:left-0 sm:top-1/4 sm:-translate-x-[15%]",
                "sm:absolute sm:right-0 sm:top-[15%] sm:translate-x-[15%]",
                "sm:absolute sm:right-0 sm:bottom-[20%] sm:translate-x-[10%]",
              ];
              return (
                <motion.div
                  key={i}
                  variants={scaleUp}
                  className={`group relative w-full rounded-xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.1] hover:bg-white/[0.05] light:border-slate-200/80 light:bg-white/80 light:hover:bg-white/95 sm:w-[180px] ${positions[i]}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bg} ${a.iconBg}`}>
                      <s.Icon className={`h-3.5 w-3.5 ${a.text}`} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-lg font-bold tabular-nums tracking-tight ${a.text}`}>
                        {s.value}
                        <span className="text-[10px] font-medium text-white/25 light:text-slate-400">{s.suffix}</span>
                      </span>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/25 light:text-slate-400">
                        {s.label}
                      </p>
                    </div>
                  </div>
                  {/* Thin bottom progress */}
                  <div className={`mx-3 mb-2.5 h-[2px] overflow-hidden rounded-full ${a.barTrack}`}>
                    <div className={`h-full rounded-full ${a.bar} transition-all duration-1000`} style={{ width: isInView ? `${a.barPercent}%` : "0%" }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Thin separator ─────────────────────────── */}
        <div className="mx-auto mt-14 flex max-w-md items-center gap-3 sm:mt-18">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/12 to-transparent" />
          <Globe className="h-3 w-3 text-emerald-400/20 light:text-emerald-500/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/12 to-transparent" />
        </div>

        {/* ── Feature cards — horizontal row ──────────── */}
        <motion.div variants={fadeUp} className="mt-10 sm:mt-14">
          <div className="mb-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400/35 light:text-emerald-600/45">
              {t("landing.earth.howItWorks") ?? "How It Works"}
            </span>
          </div>

          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${isArabic ? "direction-rtl" : ""}`}>
            {features.map((f, i) => {
              const a = accentMap[f.accent];
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.015] transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.035] light:border-slate-200/80 light:bg-white/60 light:hover:bg-white/85"
                >
                  {/* Top accent gradient */}
                  <div
                    className="h-[1.5px] w-full opacity-40 transition-opacity duration-300 group-hover:opacity-80"
                    style={{ background: `linear-gradient(90deg, transparent, ${a.glow}, transparent)` }}
                  />

                  <div className="p-5">
                    <div className="flex items-start gap-3.5">
                      {/* Step number */}
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${a.bg} ${a.text}`}>
                        {i + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Icon + Title row */}
                        <div className="flex items-center gap-2">
                          <f.Icon className={`h-3.5 w-3.5 ${a.text} opacity-60`} strokeWidth={1.8} />
                          <h3 className="text-[13px] font-semibold text-white/80 light:text-slate-800">
                            {f.title}
                          </h3>
                        </div>
                        {/* Description */}
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/30 light:text-slate-500">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Inline CTA links ───────────────────────── */}
        <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-5 sm:mt-10">
          <a
            href="#services"
            className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-white/40 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:underline light:text-slate-500 light:hover:text-slate-700"
          >
            {t("landing.earth.cta") ?? "Explore Services"}
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <span className="h-3 w-px bg-white/8 light:bg-slate-200" />
          <a
            href="#impact-stats"
            className="text-[12px] font-medium text-white/25 transition-colors duration-200 hover:text-white/50 focus-visible:outline-none focus-visible:underline light:text-slate-400 light:hover:text-slate-600"
          >
            {t("landing.earth.cta2") ?? "See Impact"}
          </a>
        </motion.div>

        {/* ── Bottom tagline ─────────────────────────── */}
        <div className="mx-auto mt-10 flex items-center justify-center gap-2 pb-20 sm:mt-14 sm:pb-28">
          <Sparkles className="h-3 w-3 text-emerald-400/20 light:text-emerald-500/30" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/15 light:text-slate-300">
            {t("landing.earth.madeWith") ?? "Made with love for our planet"}
          </span>
          <Heart className="h-2.5 w-2.5 text-emerald-400/20 light:text-emerald-500/30" />
        </div>
      </motion.div>
    </section>
  );
}
