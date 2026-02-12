"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "recording" | "playing";

export function useVoiceMessage() {
  const [state, setState] = useState<VoiceState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ── start recording ─────────────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setDuration(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, []);

  /* ── stop recording ──────────────────────────────────── */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState("idle");
  }, []);

  /* ── play preview ────────────────────────────────────── */
  const playPreview = useCallback(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setState("playing");
    audio.onended = () => setState("idle");
    audio.play();
  }, [audioUrl]);

  /* ── stop playback ───────────────────────────────────── */
  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setState("idle");
  }, []);

  /* ── discard recording ───────────────────────────────── */
  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  /* ── format duration ─────────────────────────────────── */
  const formattedDuration = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    duration,
    formattedDuration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    playPreview,
    stopPlayback,
    discard,
  };
}
