"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis, { type LenisOptions } from "lenis";

function shouldEnableLenis() {
  if (typeof window === "undefined") return false;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  return !reduceMotion;
}

function isTouchInput() {
  if (typeof window === "undefined") return false;

  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const hasTouchStart = "ontouchstart" in window;

  return coarsePointer || touchPoints > 0 || hasTouchStart;
}

function getLenisOptions(touchMode: boolean): LenisOptions {
  return {
    smoothWheel: true,
    syncTouch: touchMode,
    syncTouchLerp: touchMode ? 0.08 : undefined,
    wheelMultiplier: 0.9,
    touchMultiplier: touchMode ? 1.1 : 1,
    gestureOrientation: "vertical",
    lerp: touchMode ? 0.07 : 0.08,
    autoResize: true,
  };
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const touchModeRef = useRef<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const rootElement = document.documentElement;
    const previousScrollBehavior = rootElement.style.scrollBehavior;

    const stopRafLoop = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const startRafLoop = () => {
      if (!lenisRef.current || rafIdRef.current !== null) return;

      const onFrame = (time: number) => {
        const activeLenis = lenisRef.current;
        if (!activeLenis) {
          rafIdRef.current = null;
          return;
        }

        activeLenis.raf(time);
        rafIdRef.current = requestAnimationFrame(onFrame);
      };

      rafIdRef.current = requestAnimationFrame(onFrame);
    };

    const destroyLenis = () => {
      stopRafLoop();

      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }

      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }

      touchModeRef.current = null;
      rootElement.style.scrollBehavior = previousScrollBehavior;
    };

    const createLenis = (touchMode: boolean) => {
      if (lenisRef.current) return;

      const lenis = new Lenis(getLenisOptions(touchMode));
      lenisRef.current = lenis;
      touchModeRef.current = touchMode;
      rootElement.style.scrollBehavior = "auto";
      startRafLoop();

      const onVisibilityChange = () => {
        const activeLenis = lenisRef.current;
        if (!activeLenis) return;

        if (document.hidden) {
          activeLenis.stop();
          stopRafLoop();
        } else {
          activeLenis.start();
          startRafLoop();
        }
      };

      visibilityHandlerRef.current = onVisibilityChange;
      document.addEventListener("visibilitychange", onVisibilityChange);
    };

    const refreshEngine = () => {
      if (!shouldEnableLenis()) {
        destroyLenis();
        return;
      }

      const nextTouchMode = isTouchInput();
      if (!lenisRef.current) {
        createLenis(nextTouchMode);
        return;
      }

      if (touchModeRef.current !== nextTouchMode) {
        destroyLenis();
        createLenis(nextTouchMode);
      }
    };

    refreshEngine();
    window.addEventListener("resize", refreshEngine);
    window.addEventListener("orientationchange", refreshEngine);

    return () => {
      window.removeEventListener("resize", refreshEngine);
      window.removeEventListener("orientationchange", refreshEngine);
      destroyLenis();
    };
  }, []);

  useEffect(() => {
    const activeLenis = lenisRef.current;
    if (activeLenis) {
      activeLenis.stop();
      activeLenis.scrollTo(0, { immediate: true, force: true });
      activeLenis.start();
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return <>{children}</>;
}
