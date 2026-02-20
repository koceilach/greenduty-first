"use client";

import React, { useMemo } from "react";
import { motion, type Variants, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   5. Fluid Motion Orchestration
   ──────────────────────────────────────────────────────────────
   Physics-based spring stagger for lists and grids.
   Elements feel like they *flow* into place rather than appear.
   Uses spring physics (no fixed duration/easing) for organic feel.
   ────────────────────────────────────────────────────────────── */

/* ── Spring presets ─────────────────────────────────────────── */

export const springPresets = {
  /** Snappy, responsive — buttons, small elements */
  snappy: { type: "spring", stiffness: 500, damping: 30, mass: 0.8 } as const,
  /** Default — cards, list items */
  gentle: { type: "spring", stiffness: 260, damping: 24, mass: 0.9 } as const,
  /** Soft, gliding — hero elements, large panels */
  soft: { type: "spring", stiffness: 170, damping: 22, mass: 1.0 } as const,
  /** Bouncy — badges, notifications, celebratory elements */
  bouncy: { type: "spring", stiffness: 400, damping: 15, mass: 0.6 } as const,
} satisfies Record<string, Transition>;

/* ── Stagger Container ──────────────────────────────────────── */

interface StaggerContainerProps {
  children: React.ReactNode;
  /** Delay between each child animation in seconds (default 0.06) */
  stagger?: number;
  /** Spring preset for children (default "gentle") */
  spring?: keyof typeof springPresets;
  /** Only animate once when entering viewport */
  once?: boolean;
  /** Viewport trigger margin (default "0px 0px -60px 0px") */
  viewportMargin?: string;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
}

/**
 * Orchestrates staggered entrance for its children.
 * Wrap a grid or list, and each `<StaggerItem>` inside will
 * flow in sequentially with spring physics.
 *
 * ```tsx
 * <StaggerContainer stagger={0.07} spring="gentle">
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <Card>{item.name}</Card>
 *     </StaggerItem>
 *   ))}
 * </StaggerContainer>
 * ```
 */
export function StaggerContainer({
  children,
  stagger = 0.06,
  spring = "gentle",
  once = true,
  viewportMargin = "0px 0px -60px 0px",
  className,
  as = "div",
}: StaggerContainerProps) {
  const containerVariants: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: stagger,
          ...springPresets[spring],
        },
      },
    }),
    [stagger, spring],
  );

  const MotionTag = useMemo(() => motion.create(as), [as]);

  return (
    <MotionTag
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: viewportMargin }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/* ── Stagger Item ───────────────────────────────────────────── */

type EntranceDirection = "up" | "down" | "left" | "right" | "none";

interface StaggerItemProps {
  children: React.ReactNode;
  /** Direction elements enter from (default "up") */
  direction?: EntranceDirection;
  /** Travel distance in px (default 24) */
  distance?: number;
  /** Additional spring override for this specific item */
  spring?: keyof typeof springPresets;
  className?: string;
}

const directionMap: Record<EntranceDirection, (d: number) => { x: number; y: number }> = {
  up: (d) => ({ x: 0, y: d }),
  down: (d) => ({ x: 0, y: -d }),
  left: (d) => ({ x: d, y: 0 }),
  right: (d) => ({ x: -d, y: 0 }),
  none: () => ({ x: 0, y: 0 }),
};

/**
 * Individual item inside a `<StaggerContainer>`.
 * Fades + slides in from the given direction with spring physics.
 */
export function StaggerItem({
  children,
  direction = "up",
  distance = 24,
  spring,
  className,
}: StaggerItemProps) {
  const offset = directionMap[direction](distance);

  const itemVariants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        x: offset.x,
        y: offset.y,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: spring ? springPresets[spring] : undefined,
      },
    }),
    [offset.x, offset.y, spring],
  );

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/* ── FadeSlide — standalone animated element ────────────────── */

interface FadeSlideProps {
  children: React.ReactNode;
  direction?: EntranceDirection;
  distance?: number;
  spring?: keyof typeof springPresets;
  delay?: number;
  once?: boolean;
  className?: string;
}

/**
 * Standalone fade+slide entrance for individual elements
 * that aren't part of a staggered list.
 *
 * ```tsx
 * <FadeSlide direction="up" spring="soft" delay={0.2}>
 *   <h1>Hello</h1>
 * </FadeSlide>
 * ```
 */
export function FadeSlide({
  children,
  direction = "up",
  distance = 24,
  spring = "gentle",
  delay = 0,
  once = true,
  className,
}: FadeSlideProps) {
  const offset = directionMap[direction](distance);

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "0px 0px -60px 0px" }}
      transition={{ ...springPresets[spring], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Presence transition wrapper ────────────────────────────── */

interface FluidPresenceProps {
  children: React.ReactNode;
  spring?: keyof typeof springPresets;
  className?: string;
}

/**
 * Wraps an element with enter/exit animations for use
 * inside `<AnimatePresence>`. Uses `layout` for fluid resizing.
 */
export function FluidPresence({
  children,
  spring = "snappy",
  className,
}: FluidPresenceProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={springPresets[spring]}
      className={className}
    >
      {children}
    </motion.div>
  );
}
