"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";

const LOTTIE_EMBED_URL = "https://lottie.host/embed/d3b88187-ef6a-4d51-82a4-8e65cee1bcb2/eowEuBAxpJ.lottie";

type PrefixedStyle = CSSStyleDeclaration & {
  WebkitTransform?: string;
  MozTransform?: string;
  WebkitBackfaceVisibility?: string;
  WebkitTransformStyle?: string;
};

export function Interactive3DSection() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const sectionRef = useRef<HTMLElement | null>(null);
  const earthLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sectionElement = sectionRef.current;
    const earthLayer = earthLayerRef.current;
    if (!sectionElement || !earthLayer) return;

    const style = earthLayer.style as PrefixedStyle;
    style.backfaceVisibility = "hidden";
    style.WebkitBackfaceVisibility = "hidden";
    style.transformStyle = "preserve-3d";
    style.WebkitTransformStyle = "preserve-3d";

    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const supports3dTransform =
      typeof CSS === "undefined" || typeof CSS.supports !== "function"
        ? true
        : CSS.supports("transform", "translate3d(0,0,0)");

    let animationFrame = 0;
    let isVisible = true;
    let observer: IntersectionObserver | null = null;
    let removeScrollListener: (() => void) | null = null;

    const setTransform = (value: string) => {
      style.transform = value;
      style.WebkitTransform = value;
      style.MozTransform = value;
    };

    const updateEarthMotion = () => {
      if (!isVisible) return;

      if (motionPreference?.matches) {
        setTransform("translateY(0px) scale(1)");
        style.opacity = "1";
        return;
      }

      const rect = sectionElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) return;

      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const normalizedOffset = (sectionCenter - viewportCenter) / viewportHeight;
      const clampedOffset = Math.max(-1, Math.min(1, normalizedOffset));

      const translateY = -clampedOffset * 42;
      const scale = 1.06 - Math.abs(clampedOffset) * 0.08;
      const opacity = Math.max(0.76, 1 - Math.abs(clampedOffset) * 0.12);
      const transformValue = supports3dTransform
        ? `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
        : `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`;

      setTransform(transformValue);
      style.opacity = opacity.toFixed(3);
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        updateEarthMotion();
      });
    };

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
          if (isVisible) requestUpdate();
        },
        { threshold: [0, 0.01, 1] }
      );
      observer.observe(sectionElement);
    }

    try {
      window.addEventListener("scroll", requestUpdate, { passive: true });
      removeScrollListener = () => window.removeEventListener("scroll", requestUpdate);
    } catch {
      window.addEventListener("scroll", requestUpdate);
      removeScrollListener = () => window.removeEventListener("scroll", requestUpdate);
    }

    const handleMotionPreferenceChange = () => requestUpdate();
    if (motionPreference) {
      if (typeof motionPreference.addEventListener === "function") {
        motionPreference.addEventListener("change", handleMotionPreferenceChange);
      } else if (typeof motionPreference.addListener === "function") {
        motionPreference.addListener(handleMotionPreferenceChange);
      }
    }

    updateEarthMotion();
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("orientationchange", requestUpdate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (removeScrollListener) removeScrollListener();
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("orientationchange", requestUpdate);
      observer?.disconnect();

      if (motionPreference) {
        if (typeof motionPreference.removeEventListener === "function") {
          motionPreference.removeEventListener("change", handleMotionPreferenceChange);
        } else if (typeof motionPreference.removeListener === "function") {
          motionPreference.removeListener(handleMotionPreferenceChange);
        }
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="earth-section"
      className="relative h-[430px] w-full scroll-mt-24 overflow-hidden bg-[var(--gd-home-bg-gradient)] sm:h-[580px] md:h-[700px] lg:h-[800px]"
    >
      <div className="relative h-full w-full">
        <div ref={earthLayerRef} className="pointer-events-none absolute inset-0 h-full w-full select-none">
          <iframe
            title="GreenDuty planet animation"
            src={LOTTIE_EMBED_URL}
            loading="lazy"
            frameBorder={0}
            allowFullScreen
            className="h-full w-full border-0 bg-transparent"
          />
        </div>

        <div
          className={`absolute top-4 z-20 w-auto max-w-lg overflow-hidden rounded-[22px] border border-white/20 bg-slate-900/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:bg-white/14 supports-[backdrop-filter]:backdrop-blur-xl light:border-slate-900/10 light:bg-white/90 light:supports-[backdrop-filter]:bg-white/80 sm:top-6 sm:p-5 md:top-1/2 md:w-full md:-translate-y-1/2 md:rounded-[26px] md:p-6 ${
            isArabic
              ? "left-3 right-3 sm:left-4 sm:right-4 md:left-auto md:right-10"
              : "left-3 right-3 sm:left-4 sm:right-4 md:left-10 md:right-auto"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-l from-black/35 via-black/10 to-transparent light:from-white/90 light:via-white/35 sm:w-20 md:w-24 ${
              isArabic ? "left-0 rounded-l-[22px] md:rounded-l-[26px]" : "right-0 rounded-r-[22px] md:rounded-r-[26px]"
            }`}
          />
          <div className={`relative z-10 max-w-none sm:max-w-md ${isArabic ? "text-right" : ""}`}>
            <h2 className="text-xl font-semibold tracking-tight text-white light:text-slate-900 sm:text-2xl md:text-3xl">
              {t("landing.earth.title")}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-white/85 light:text-slate-700 sm:mt-3 sm:text-base">
              {t("landing.earth.copy")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
