"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Message, MessageType } from "./types";

/* ─── helpers ───────────────────────────────────────────── */
const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const PAGE_SIZE = 40;

type RawMsg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  media_duration: number | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: any;
};

function mapRow(row: RawMsg): Message {
  const prof = first(row.profiles);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as MessageType,
    mediaUrl: row.media_url,
    mediaDuration: row.media_duration,
    replyToId: row.reply_to_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sender: prof
      ? {
          id: prof.id,
          fullName: prof.full_name,
          username: prof.username,
          avatarUrl: prof.avatar_url,
        }
      : undefined,
  };
}

/* ─── hook ──────────────────────────────────────────────── */
export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ── fetch messages ──────────────────────────────────── */
  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!conversationId) return;
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) setCurrentUserId(userData.user.id);

      let query = supabase
        .from("messages")
        .select(
          `
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          media_url,
          media_duration,
          reply_to_id,
          created_at,
          updated_at,
          deleted_at,
          profiles:sender_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data } = await query;
      const mapped = (data ?? []).map((row) => mapRow(row as unknown as RawMsg)).reverse();

      if (before) {
        setMessages((prev) => [...mapped, ...prev]);
      } else {
        setMessages(mapped);
      }

      setHasMore((data ?? []).length === PAGE_SIZE);
      setLoading(false);
    },
    [conversationId]
  );

  /* ── load more (scroll up pagination) ────────────────── */
  const loadMore = useCallback(() => {
    if (messages.length > 0) {
      fetchMessages(messages[0].createdAt);
    }
  }, [messages, fetchMessages]);

  /* ── send message ────────────────────────────────────── */
  const sendMessage = useCallback(
    async (opts: {
      content?: string;
      messageType?: MessageType;
      mediaUrl?: string;
      mediaDuration?: number;
      replyToId?: string;
    }) => {
      if (!conversationId || !currentUserId) return;
      setSending(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: opts.content ?? null,
        message_type: opts.messageType ?? "text",
        media_url: opts.mediaUrl ?? null,
        media_duration: opts.mediaDuration ?? null,
        reply_to_id: opts.replyToId ?? null,
      });

      if (error) console.error("Send message error:", error);
      setSending(false);
    },
    [conversationId, currentUserId]
  );

  /* ── mark as read ────────────────────────────────────── */
  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
  }, [conversationId, currentUserId]);

  /* ── delete message (soft) ───────────────────────────── */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentUserId) return;
      await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [currentUserId]
  );

  /* ── realtime subscription ───────────────────────────── */
  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          // Fetch sender profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", row.sender_id)
            .single();

          const newMsg: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content,
            messageType: row.message_type,
            mediaUrl: row.media_url,
            mediaDuration: row.media_duration,
            replyToId: row.reply_to_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
            sender: profile
              ? {
                  id: profile.id,
                  fullName: profile.full_name,
                  username: profile.username,
                  avatarUrl: profile.avatar_url,
                }
              : undefined,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    hasMore,
    currentUserId,
    sendMessage,
    loadMore,
    markAsRead,
    deleteMessage,
  };
}
