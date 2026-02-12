"use client";

import { useChat } from "@/lib/messages/useChat";
import { MessageBubble } from "./MessageBubble";
import { VoiceRecorder } from "./VoiceRecorder";
import {
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ChatRoomProps = {
  conversationId: string;
  otherUser?: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    online: boolean;
  };
};

export function ChatRoom({ conversationId, otherUser }: ChatRoomProps) {
  const { messages, loading, sending, hasMore, currentUserId, sendMessage, loadMore, markAsRead, deleteMessage } =
    useChat(conversationId);

  const [text, setText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  /* scroll to bottom on new messages */
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  /* mark as read on mount */
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  /* detect if user is scrolled to bottom */
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(atBottom);

    // Load more when scrolled to top
    if (el.scrollTop < 100 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  /* send text */
  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage({ content: trimmed, messageType: "text" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  /* send voice */
  const handleSendVoice = async (blob: Blob, duration: number) => {
    // Upload to Supabase Storage
    const fileName = `voice/${conversationId}/${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, blob, { contentType: "audio/webm" });

    if (uploadError) {
      console.error("Voice upload error:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(fileName);

    await sendMessage({
      messageType: "voice",
      mediaUrl: urlData.publicUrl,
      mediaDuration: duration,
    });
    setShowVoice(false);
  };

  /* send image */
  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `images/${conversationId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(fileName);

    await sendMessage({
      messageType: "image",
      mediaUrl: urlData.publicUrl,
    });

    e.target.value = "";
  };

  /* group messages by date */
  const groupedMessages = messages.reduce<{ date: string; msgs: typeof messages }[]>((acc, msg) => {
    const d = new Date(msg.createdAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const last = acc[acc.length - 1];
    if (last?.date === d) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: d, msgs: [msg] });
    }
    return acc;
  }, []);

  const displayName = otherUser?.fullName ?? "Chat";
  const avatarText = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-[#F6F8F7] dark:bg-slate-950">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/messages"
          className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Link>

        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {otherUser?.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span>{avatarText}</span>
            )}
          </div>
          {otherUser?.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</h2>
          <p className="text-xs text-slate-400">
            {otherUser?.online ? (
              <span className="text-emerald-500">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>

        <button className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
          <MoreVertical className="h-5 w-5 text-slate-400" />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="mx-auto mb-4 block rounded-full bg-slate-200 px-4 py-1.5 text-xs text-slate-500 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400"
          >
            Load older messages
          </button>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center justify-center">
              <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {group.date}
              </span>
            </div>
            {group.msgs.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
                onDelete={deleteMessage}
              />
            ))}
          </div>
        ))}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="mb-4 rounded-full bg-emerald-50 p-6 dark:bg-emerald-900/20">
              <Send className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-sm font-medium">Start the conversation</p>
            <p className="mt-1 text-xs">Say hello! 👋</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {showVoice ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoice(false)} />
        ) : (
          <div className="flex items-end gap-2">
            {/* Image upload */}
            <label className="cursor-pointer rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <ImageIcon className="h-5 w-5 text-slate-400" />
              <input type="file" accept="image/*" className="hidden" onChange={handleSendImage} />
            </label>

            {/* Text input */}
            <div className="flex min-h-[44px] flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="max-h-24 flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Voice or Send */}
            {text.trim() ? (
              <button
                onClick={handleSendText}
                disabled={sending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E7F43] text-white shadow-sm transition hover:bg-[#166536] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowVoice(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
