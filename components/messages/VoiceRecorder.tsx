"use client";

import { useVoiceMessage } from "@/lib/messages/useVoiceMessage";
import { Mic, MicOff, Play, Pause, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type VoiceRecorderProps = {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
};

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const {
    state,
    duration,
    formattedDuration,
    audioBlob,
    startRecording,
    stopRecording,
    playPreview,
    stopPlayback,
    discard,
  } = useVoiceMessage();

  const handleDiscard = () => {
    discard();
    onCancel();
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      discard();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Recording state */}
      {state === "idle" && !audioBlob && (
        <button
          onClick={startRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 hover:shadow-xl"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}

      {state === "recording" && (
        <>
          <button
            onClick={stopRecording}
            className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
          >
            <MicOff className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-sm font-semibold text-red-500">{formattedDuration}</span>
            <span className="text-xs text-slate-400">Recording...</span>
          </div>
        </>
      )}

      {/* Preview state */}
      {state !== "recording" && audioBlob && (
        <>
          <button
            onClick={state === "playing" ? stopPlayback : playPreview}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
          >
            {state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex flex-1 flex-col">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full bg-emerald-500 transition-all duration-300 ${
                  state === "playing" ? "animate-pulse" : ""
                }`}
                style={{ width: state === "playing" ? "60%" : "100%" }}
              />
            </div>
            <span className="mt-1 text-xs text-slate-400">{formattedDuration}</span>
          </div>

          <button
            onClick={handleDiscard}
            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <Button
            onClick={handleSend}
            size="sm"
            className="rounded-full bg-[#1E7F43] text-white hover:bg-[#166536]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Cancel text */}
      {state === "idle" && !audioBlob && (
        <button onClick={onCancel} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      )}
    </div>
  );
}
