"use client";

import type { Message } from "@/lib/messages/types";
import { CheckCheck, Flag, Mic, MoreVertical, Pin, PinOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  theme?: "light" | "ocean" | "forest";
  canEdit?: boolean;
  canReport?: boolean;
  canPin?: boolean;
  isPinned?: boolean;
  showReadReceipt?: boolean;
  readReceipt?: "sent" | "seen";
  readAt?: string | null;
  onEdit?: (id: string, nextContent: string) => Promise<boolean> | boolean;
  onReport?: (message: Message) => Promise<void> | void;
  onTogglePin?: (message: Message) => Promise<void> | void;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MessageBubble({
  message,
  isOwn,
  theme = "light",
  canEdit = false,
  canReport = false,
  canPin = false,
  isPinned = false,
  showReadReceipt = false,
  readReceipt = "sent",
  readAt = null,
  onEdit,
  onReport,
  onTogglePin,
}: MessageBubbleProps) {
  const touch = "active:scale-[0.97] transition-transform duration-200";
  const lightTheme = theme === "light";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content ?? "");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setDraft(message.content ?? "");
    setIsEditing(false);
    setSaving(false);
    setMenuOpen(false);
  }, [message.id, message.content]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  const editable = canEdit && message.messageType === "text" && Boolean(onEdit);
  const reportable = canReport && Boolean(onReport);
  const pinnable = canPin && Boolean(onTogglePin);
  const history = message.editHistory ?? [];
  const hasHistory = history.length > 0;
  const showMenuButton = !isEditing && (editable || reportable || pinnable);
  const readReceiptText =
    readReceipt === "seen"
      ? `Seen${readAt ? ` ${formatTime(readAt)}` : ""}`
      : "Sent";

  const saveEdit = async () => {
    if (!onEdit) return;

    const trimmed = draft.trim();
    const previous = (message.content ?? "").trim();
    if (!trimmed) return;
    if (trimmed === previous) {
      setIsEditing(false);
      return;
    }

    setMenuOpen(false);
    setSaving(true);
    const ok = await onEdit(message.id, trimmed);
    setSaving(false);
    if (ok !== false) {
      setIsEditing(false);
      setShowHistory(false);
    }
  };

  return (
    <div className={`mb-2 md:mb-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex w-full max-w-[86%] items-end gap-2 md:max-w-[75%] ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwn && (
          <div
            className={`mb-1 hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold md:flex ${
              lightTheme
                ? "bg-emerald-100 text-emerald-700"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            }`}
          >
            {message.sender?.fullName?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        )}

        <div
          className={`relative rounded-[1.15rem] px-3.5 py-2.5 text-[13px] shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:rounded-2xl md:px-4 md:text-sm md:shadow-sm ${
            isOwn
              ? lightTheme
                ? "rounded-br-[0.6rem] border border-slate-200/80 bg-white text-slate-900 md:rounded-br-md"
                : "rounded-br-[0.6rem] bg-[#1E7F43] text-white md:rounded-br-md"
              : lightTheme
              ? "rounded-bl-[0.6rem] border border-slate-200/80 bg-white text-slate-900 md:rounded-bl-md"
              : "rounded-bl-[0.6rem] bg-white text-slate-800 md:rounded-bl-md md:dark:bg-slate-800 md:dark:text-slate-100"
          }`}
        >
          {!isOwn && message.sender?.fullName && (
            <div className={`mb-1 hidden text-xs font-semibold md:block ${lightTheme ? "text-slate-600" : "text-emerald-600 dark:text-emerald-400"}`}>
              {message.sender.fullName}
            </div>
          )}

          {isPinned && (
            <div
              className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                lightTheme
                  ? "bg-amber-50 text-amber-600"
                  : isOwn
                  ? "bg-white/20 text-amber-100"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              <Pin className="h-3 w-3" />
              Pinned
            </div>
          )}

          {message.messageType === "text" && (
            <>
              {isEditing ? (
                <div
                  className={`space-y-3 rounded-[1.35rem] p-3 sm:p-3.5 ${
                    isOwn
                      ? lightTheme
                        ? "bg-slate-100/95 ring-1 ring-slate-200/80"
                        : "bg-white/12 ring-1 ring-white/25"
                      : "bg-slate-100/95 ring-1 ring-slate-200/80 dark:bg-slate-900/70 dark:ring-slate-700/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        isOwn
                          ? lightTheme
                            ? "text-slate-500"
                            : "text-white/85"
                          : "text-slate-500 dark:text-slate-300"
                      }`}
                    >
                      Editing Message
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isOwn
                          ? lightTheme
                            ? "bg-white text-slate-500"
                            : "bg-white/20 text-white/90"
                          : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {draft.trim().length} chars
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl p-[1px] ${
                      isOwn
                        ? lightTheme
                          ? "bg-slate-200/90"
                          : "bg-white/30"
                        : "bg-slate-200/90 dark:bg-slate-700"
                    }`}
                  >
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={3}
                      className={`w-full resize-none rounded-2xl border-0 px-3.5 py-3 text-sm leading-relaxed outline-none ${
                        isOwn
                          ? lightTheme
                            ? "bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/45"
                            : "bg-[#0f6a36]/70 text-white placeholder:text-white/70 focus:ring-2 focus:ring-white/40"
                          : "bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/45 dark:bg-slate-900 dark:text-slate-100"
                      }`}
                      placeholder="Refine your message..."
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={`text-[10px] ${
                        isOwn
                          ? lightTheme
                            ? "text-slate-400"
                            : "text-white/70"
                          : "text-slate-400 dark:text-slate-300/80"
                      }`}
                    >
                      Shift + Enter for new line
                    </span>
                    <div className="grid w-full grid-cols-2 gap-2 text-[11px] font-semibold sm:flex sm:w-auto sm:items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(message.content ?? "");
                          setIsEditing(false);
                        }}
                        className={`${touch} h-10 w-full rounded-full px-4 sm:w-auto ${
                          isOwn
                            ? lightTheme
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              : "bg-white/20 text-white hover:bg-white/30"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving || !draft.trim()}
                        onClick={() => void saveEdit()}
                        className={`${touch} h-10 w-full rounded-full px-4 sm:w-auto ${
                          isOwn
                            ? lightTheme
                              ? "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-400/70"
                              : "bg-white text-emerald-700 hover:bg-white/90 disabled:bg-white/70"
                            : "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-400/70"
                        } disabled:cursor-not-allowed`}
                      >
                        {saving ? "Saving..." : "Save Edit"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
              )}
            </>
          )}

          {message.messageType === "voice" && message.mediaUrl && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isOwn
                    ? lightTheme
                      ? "bg-slate-100 hover:bg-slate-200"
                      : "bg-white/20 hover:bg-white/30"
                    : "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40"
                }`}
              >
                <Mic
                  className={`h-4 w-4 ${
                    isOwn
                      ? lightTheme
                        ? "text-slate-600"
                        : "text-white"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
              </button>
              <div className="flex flex-col">
                <div
                  className={`flex h-1.5 w-32 overflow-hidden rounded-full ${
                    isOwn
                      ? lightTheme
                        ? "bg-slate-200"
                        : "bg-white/30"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      playing ? "animate-pulse" : ""
                    } ${
                      isOwn
                        ? lightTheme
                          ? "bg-emerald-500"
                          : "bg-white"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: playing ? "60%" : "0%" }}
                  />
                </div>
                <span
                  className={`mt-1 text-xs ${
                    isOwn
                      ? lightTheme
                        ? "text-slate-400"
                        : "text-white/70"
                      : "text-slate-400"
                  }`}
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

          {message.messageType === "system" && (
            <p className="text-center text-xs italic text-slate-400">{message.content}</p>
          )}

          {hasHistory && showHistory && !isEditing && (
            <div
              className={`mt-2 rounded-xl px-2.5 py-2 text-xs ${
                isOwn
                  ? lightTheme
                    ? "bg-slate-100 text-slate-700"
                    : "bg-white/15 text-white/90"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200"
              }`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                Before Edit
              </p>
              {history.slice(0, 3).map((entry, index) => (
                <div key={`${entry.editedAt}-${index}`} className="mb-1.5 last:mb-0">
                  <p className="whitespace-pre-wrap break-words">
                    {entry.previousContent && entry.previousContent.trim()
                      ? entry.previousContent
                      : "(empty)"}
                  </p>
                  <p className="text-[10px] opacity-70">{formatTime(entry.editedAt)}</p>
                </div>
              ))}
            </div>
          )}

          <div
            className={`mt-1 flex items-center gap-1.5 text-[10px] ${
              isOwn
                ? lightTheme
                  ? "justify-end text-slate-400"
                  : "justify-end text-white/70"
                : "text-slate-400"
            }`}
          >
            <span>{formatTime(message.createdAt)}</span>
            {message.messageType === "text" && message.editedAt && !isEditing && (
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className={`rounded-full px-1.5 py-0.5 ${
                  isOwn
                    ? lightTheme
                      ? "bg-slate-100 text-slate-500"
                      : "bg-white/15 text-white/90"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                Edited
              </button>
            )}
            {isOwn && (
              <>
                <CheckCheck
                  className={`h-3 w-3 ${
                    readReceipt === "seen"
                      ? lightTheme
                        ? "text-emerald-600"
                        : "text-emerald-200"
                      : ""
                  }`}
                />
                {showReadReceipt && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 ${
                      readReceipt === "seen"
                        ? lightTheme
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-white/20 text-emerald-100"
                        : lightTheme
                        ? "bg-slate-100 text-slate-500"
                        : "bg-white/15 text-white/80"
                    }`}
                  >
                    {readReceiptText}
                  </span>
                )}
              </>
            )}
          </div>

        </div>

        {showMenuButton && (
          <div className="relative self-center" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition sm:h-7 sm:w-7 ${
                isOwn
                  ? lightTheme
                    ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    : "bg-white/20 text-white hover:bg-white/30"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              }`}
              aria-label="Message actions"
            >
              <MoreVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>

            {menuOpen && (
              <div
                className={`absolute top-9 z-40 w-40 max-w-[75vw] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:top-8 sm:w-36 ${
                  isOwn ? "right-0" : "left-0"
                }`}
              >
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsEditing(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                )}

                {pinnable && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void onTogglePin?.(message);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    {isPinned ? "Unpin message" : "Pin message"}
                  </button>
                )}

                {reportable && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void onReport?.(message);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-medium text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
