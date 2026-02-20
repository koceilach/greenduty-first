"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";

const Spline = lazy(() => import("@splinetool/react-spline"));

function SceneLoadingFallback() {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
      <span className="sr-only">{t("landing.earth.loading")}</span>
    </div>
  );
}

export function Interactive3DSection() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const splineContainerRef = useRef<HTMLDivElement>(null);

  /* Block wheel and touch zooming so the scene remains stable */
  useEffect(() => {
    const el = splineContainerRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    return () => {
      el.removeEventListener("wheel", block);
      el.removeEventListener("touchmove", block);
    };
  }, []);

  return (
    <section
      id="earth-section"
      className="relative h-[430px] w-full scroll-mt-24 overflow-hidden sm:h-[580px] md:h-[700px] lg:h-[800px]"
    >
      <div className="relative h-full w-full">
        <div
          ref={splineContainerRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transformOrigin: "center center" }}
        >
          <Suspense fallback={<SceneLoadingFallback />}>
            <Spline
              scene="https://prod.spline.design/Tl8jtkORBKvCzSPC/scene.splinecode"
              className="pointer-events-none h-full w-full"
            />
          </Suspense>
        </div>

        <div
          className={`absolute top-6 z-20 w-[min(94vw,34rem)] overflow-hidden rounded-[22px] border border-white/20 bg-white/14 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl light:border-slate-900/10 light:bg-white/80 sm:top-8 sm:p-5 md:top-1/2 md:w-[460px] md:-translate-y-1/2 md:rounded-[26px] md:p-6 ${
            isArabic ? "right-3 sm:right-4 md:right-10" : "left-3 sm:left-4 md:left-10"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-y-0 w-20 bg-gradient-to-l from-black/35 via-black/10 to-transparent light:from-white/90 light:via-white/35 md:w-28 ${
              isArabic ? "left-0 rounded-l-[22px] md:rounded-l-[26px]" : "right-0 rounded-r-[22px] md:rounded-r-[26px]"
            }`}
          />
          <div className={`relative z-10 max-w-[22rem] md:max-w-[24rem] ${isArabic ? "text-right" : ""}`}>
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
