"use client";

import type { Message } from "@/lib/messages/types";
import { Check, CheckCheck, Mic, Image as ImageIcon, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  onDelete?: (id: string) => void;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MessageBubble({ message, isOwn, onDelete }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div
      className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex max-w-[75%] items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {message.sender?.fullName?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isOwn
              ? "rounded-br-md bg-[#1E7F43] text-white"
              : "rounded-bl-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          {/* Sender name for group chats */}
          {!isOwn && message.sender?.fullName && (
            <div className="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {message.sender.fullName}
            </div>
          )}

          {/* Text message */}
          {message.messageType === "text" && (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}

          {/* Voice message */}
          {message.messageType === "voice" && message.mediaUrl && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isOwn
                    ? "bg-white/20 hover:bg-white/30"
                    : "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40"
                }`}
              >
                <Mic className={`h-4 w-4 ${isOwn ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`} />
              </button>
              <div className="flex flex-col">
                <div
                  className={`flex h-1.5 w-32 overflow-hidden rounded-full ${
                    isOwn ? "bg-white/30" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      playing ? "animate-pulse" : ""
                    } ${isOwn ? "bg-white" : "bg-emerald-500"}`}
                    style={{ width: playing ? "60%" : "0%" }}
                  />
                </div>
                <span
                  className={`mt-1 text-xs ${isOwn ? "text-white/70" : "text-slate-400"}`}
                >
                  {formatDuration(message.mediaDuration)}
                </span>
              </div>
              <audio
                ref={audioRef}
                src={message.mediaUrl}
                onEnded={() => setPlaying(false)}
                preload="metadata"
              />
            </div>
          )}

          {/* Image message */}
          {message.messageType === "image" && message.mediaUrl && (
            <div className="overflow-hidden rounded-xl">
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="max-h-64 max-w-full rounded-xl object-cover"
              />
              {message.content && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.content}</p>
              )}
            </div>
          )}

          {/* System message */}
          {message.messageType === "system" && (
            <p className="text-center text-xs italic text-slate-400">{message.content}</p>
          )}

          {/* Time + read indicator */}
          <div
            className={`mt-1 flex items-center gap-1 text-[10px] ${
              isOwn ? "justify-end text-white/60" : "text-slate-400"
            }`}
          >
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && <CheckCheck className="h-3 w-3" />}
          </div>

          {/* Actions */}
          {isOwn && showActions && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-full bg-red-50 p-1.5 text-red-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
