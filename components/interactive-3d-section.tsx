"use client";

import { lazy, Suspense, useEffect, useRef } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

function SceneLoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
      <span className="sr-only">Loading 3D monitoring scene</span>
    </div>
  );
}

export function Interactive3DSection() {
  const splineContainerRef = useRef<HTMLDivElement>(null);

  /* Block all wheel & touch events so the globe stays at a fixed size */
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
    <section className="relative h-[500px] w-full overflow-hidden sm:h-[600px] md:h-[700px] lg:h-[800px]">
      <div className="relative h-full w-full">
        {/* Globe wrapper — pointer-events-none locks the size, CSS animation rotates it */}
        <div
          ref={splineContainerRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ transformOrigin: "center center" }}
        >
          <Suspense fallback={<SceneLoadingFallback />}>
            <Spline
              scene="https://prod.spline.design/Tl8jtkORBKvCzSPC/scene.splinecode"
              className="h-full w-full pointer-events-none"
            />
          </Suspense>
        </div>

        <div className="absolute left-4 top-8 z-20 w-[min(92vw,34rem)] overflow-hidden rounded-[24px] border border-white/20 bg-white/14 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl light:border-slate-900/10 light:bg-white/80 md:left-10 md:top-1/2 md:w-[460px] md:-translate-y-1/2 md:rounded-[26px]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 rounded-r-[24px] bg-gradient-to-l from-black/35 via-black/10 to-transparent light:from-white/90 light:via-white/35 md:rounded-r-[26px]" />
          <div className="relative z-10 max-w-[22rem] md:max-w-[24rem]">
            <h2 className="text-2xl font-semibold tracking-tight text-white light:text-slate-900 sm:text-3xl">Real-time Monitoring</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85 light:text-slate-700 sm:text-base">
              Track live environmental metrics such as air quality, emissions, and ecosystem activity with instant updates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
