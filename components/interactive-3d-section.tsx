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
    <section className="relative h-[800px] w-full overflow-hidden">
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

        <div className="absolute left-4 top-8 z-10 w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:left-10 md:top-1/2 md:w-[420px] md:-translate-y-1/2">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Real-time Monitoring</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
            Track live environmental metrics such as air quality, emissions, and ecosystem activity with instant updates.
          </p>
        </div>
      </div>
    </section>
  );
}
