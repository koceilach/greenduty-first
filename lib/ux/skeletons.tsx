"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   3. Ghost Loading Architecture — Content Placeholders
   ──────────────────────────────────────────────────────────────
   Zero-CLS skeletons that match final content dimensions exactly.
   Every skeleton uses the same size constraints as its real content
   so there's no layout shift when data arrives.

   Pulse animation is handled via Tailwind's `animate-pulse`.
   ────────────────────────────────────────────────────────────── */

/* ── Base shimmer block ─────────────────────────────────────── */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render a circle instead of a rectangle */
  circle?: boolean;
}

export function Skeleton({ className, circle, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--gd-surface-10,rgba(255,255,255,0.06))]",
        circle ? "rounded-full" : "rounded-xl",
        className,
      )}
      {...props}
    />
  );
}

/* ── Skeleton Line (text placeholder) ───────────────────────── */

interface SkeletonLineProps {
  /** Tailwind width class, e.g. "w-3/4" or "w-40" */
  width?: string;
  /** Tailwind height class — defaults to "h-4" (one line of body text) */
  height?: string;
  className?: string;
}

export function SkeletonLine({
  width = "w-3/4",
  height = "h-4",
  className,
}: SkeletonLineProps) {
  return <Skeleton className={cn(height, width, "rounded-md", className)} />;
}

/* ── Skeleton Card ──────────────────────────────────────────── */

interface SkeletonCardProps {
  /** Show an image placeholder at the top */
  image?: boolean;
  /** Number of text lines to show (default 3) */
  lines?: number;
  className?: string;
}

export function SkeletonCard({
  image = true,
  lines = 3,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--gd-border-10,rgba(255,255,255,0.06))] bg-[var(--gd-surface-5,rgba(255,255,255,0.03))] p-4",
        className,
      )}
    >
      {image && <Skeleton className="mb-4 h-40 w-full rounded-xl" />}
      <div className="space-y-3">
        <SkeletonLine width="w-2/3" height="h-5" />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === lines - 1 ? "w-1/2" : "w-full"}
            height="h-3.5"
          />
        ))}
      </div>
    </div>
  );
}

/* ── Skeleton Row (list item / table row) ───────────────────── */

interface SkeletonRowProps {
  /** Show a leading avatar circle */
  avatar?: boolean;
  /** Number of text lines (default 2) */
  lines?: number;
  /** Show a trailing action button placeholder */
  action?: boolean;
  className?: string;
}

export function SkeletonRow({
  avatar = true,
  lines = 2,
  action = false,
  className,
}: SkeletonRowProps) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      {avatar && <Skeleton circle className="h-10 w-10 flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === 0 ? "w-1/3" : "w-2/3"}
            height={i === 0 ? "h-4" : "h-3"}
          />
        ))}
      </div>
      {action && <Skeleton className="h-8 w-20 rounded-lg" />}
    </div>
  );
}

/* ── Skeleton Grid (product / card grid) ────────────────────── */

interface SkeletonGridProps {
  /** Number of skeleton cards */
  count?: number;
  /** Grid column classes (default responsive) */
  columns?: string;
  /** Pass-through to each SkeletonCard */
  cardProps?: Omit<SkeletonCardProps, "className">;
  className?: string;
}

export function SkeletonGrid({
  count = 6,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  cardProps,
  className,
}: SkeletonGridProps) {
  return (
    <div className={cn("grid gap-4", columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...cardProps} />
      ))}
    </div>
  );
}

/* ── Skeleton Stat Card ─────────────────────────────────────── */

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--gd-border-10,rgba(255,255,255,0.06))] bg-[var(--gd-surface-5,rgba(255,255,255,0.03))] p-5",
        className,
      )}
    >
      <SkeletonLine width="w-16" height="h-3" />
      <Skeleton className="mt-3 h-8 w-24 rounded-lg" />
      <SkeletonLine width="w-20" height="h-3" className="mt-2" />
    </div>
  );
}

/* ── Skeleton Page Shell ────────────────────────────────────── */

interface SkeletonPageProps {
  /** Show a page-level header skeleton */
  header?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SkeletonPage({
  header = true,
  children,
  className,
}: SkeletonPageProps) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {header && (
        <div className="py-8">
          <SkeletonLine width="w-48" height="h-7" />
          <SkeletonLine width="w-72" height="h-4" className="mt-3" />
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Ghost Wrapper — auto-swap skeleton ↔ content ───────────── */

interface GhostProps {
  /** True while data is loading */
  loading: boolean;
  /** The skeleton to show while loading */
  fallback: React.ReactNode;
  /** The real content */
  children: React.ReactNode;
}

/**
 * Renders the skeleton while `loading` is true, then seamlessly
 * swaps to real content with zero layout shift.
 *
 * ```tsx
 * <Ghost loading={!data} fallback={<SkeletonGrid count={4} />}>
 *   <RealGrid items={data} />
 * </Ghost>
 * ```
 */
export function Ghost({ loading, fallback, children }: GhostProps) {
  return <>{loading ? fallback : children}</>;
}
