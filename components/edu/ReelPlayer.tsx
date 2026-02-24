"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";

type ReelPlayerProps = {
  src: string;
  poster?: string | null;
  className?: string;
  children?: ReactNode;
  onDoubleTap?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
};

export function ReelPlayer({
  src,
  poster,
  className,
  children,
  onDoubleTap,
  onVisibilityChange,
}: ReelPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(true);
  const [isFullyVisible, setIsFullyVisible] = useState(false);
  const [manualPause, setManualPause] = useState(false);

  const attemptPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setIsPaused(false);
    } catch {
      setIsPaused(true);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setManualPause(false);
      void attemptPlay();
      return;
    }
    setManualPause(true);
    video.pause();
    setIsPaused(true);
  }, [attemptPlay]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const fullyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.98;
        setIsFullyVisible(fullyVisible);
      },
      {
        threshold: [0, 1],
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullyVisible) {
      video.pause();
      setIsPaused(true);
      return;
    }

    if (!manualPause) {
      void attemptPlay();
    }
  }, [attemptPlay, isFullyVisible, manualPause]);

  useEffect(() => {
    onVisibilityChange?.(isFullyVisible);
  }, [isFullyVisible, onVisibilityChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    setManualPause(false);
  }, [src]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleSurfaceTap = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-reel-control="true"]')) return;

    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onDoubleTap?.();
      return;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      togglePlayback();
      clickTimeoutRef.current = null;
    }, 210);
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      onClick={handleSurfaceTap}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="h-full w-full object-cover"
        playsInline
        preload="metadata"
        loop
        muted={isMuted}
      />

      <button
        type="button"
        data-reel-control="true"
        onClick={(event) => {
          event.stopPropagation();
          setIsMuted((prev) => !prev);
        }}
        className="absolute right-4 top-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur active:scale-[0.90] transition-transform duration-200"
        aria-label={isMuted ? "Unmute reel" : "Mute reel"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {isPaused && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur">
            <Play className="h-7 w-7" />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
