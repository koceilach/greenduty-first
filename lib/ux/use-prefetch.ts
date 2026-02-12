"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   1. Predictive Navigation & Pre-fetching
   ──────────────────────────────────────────────────────────────
   Anticipates user intent via hover / pointer-down / focus and
   tells Next.js to prefetch the route *before* the click fires.

   Usage:
     const prefetch = usePrefetch();
     <Link href="/market-place" {...prefetch("/market-place")}>

   Hover (150 ms dwell)  →  prefetch full route
   PointerDown           →  immediate prefetch (user is about to tap)
   Focus (keyboard nav)  →  prefetch on tab-focus
   ────────────────────────────────────────────────────────────── */

const HOVER_DWELL_MS = 150;

/**
 * Returns event-handler props you spread onto any interactive element.
 * Prefetches the target route on hover-dwell, pointer-down, or focus
 * so navigation feels instant.
 */
export function usePrefetch() {
  const router = useRouter();
  const prefetchedRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doPrefetch = useCallback(
    (href: string) => {
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Call with a route path — returns props to spread on the element.
   *
   * ```tsx
   * <Link href="/market-place" {...bind("/market-place")}>
   * ```
   */
  const bind = useCallback(
    (href: string) => {
      /* Skip hash-only links and external URLs */
      if (href.startsWith("#") || href.startsWith("http")) return {};

      return {
        onPointerEnter: () => {
          clearTimer();
          timerRef.current = setTimeout(() => doPrefetch(href), HOVER_DWELL_MS);
        },
        onPointerLeave: clearTimer,
        onPointerDown: () => {
          clearTimer();
          doPrefetch(href);
        },
        onFocus: () => doPrefetch(href),
      };
    },
    [doPrefetch, clearTimer],
  );

  return bind;
}

/* ──────────────────────────────────────────────────────────────
   Viewport-based prefetch — prefetch routes that are currently
   visible on screen (e.g. a list of card-links).

   Usage:
     const ref = useViewportPrefetch("/market-place/product/123");
     <div ref={ref}>…</div>
   ────────────────────────────────────────────────────────────── */

export function useViewportPrefetch(href: string) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const callbackRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node || prefetchedRef.current) return;
      if (href.startsWith("#") || href.startsWith("http")) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !prefetchedRef.current) {
            prefetchedRef.current = true;
            router.prefetch(href);
            observer.disconnect();
          }
        },
        { rootMargin: "200px" },
      );

      observer.observe(node);
      return () => observer.disconnect();
    },
    [href, router],
  );

  return callbackRef;
}
