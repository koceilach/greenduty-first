"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Message, MessageEdit, MessageType } from "./types";

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
};

type RawProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type RawEdit = {
  message_id: string;
  previous_content: string | null;
  new_content: string | null;
  edited_at: string;
};

const normalizeType = (value: string | null | undefined): MessageType => {
  if (value === "voice" || value === "image" || value === "system") return value;
  return "text";
};

const loadEditHistory = async (messageIds: string[]) => {
  const map = new Map<string, MessageEdit[]>();
  if (!messageIds.length) return map;

  const { data, error } = await supabase
    .from("message_edit_history")
    .select("message_id, previous_content, new_content, edited_at")
    .in("message_id", messageIds)
    .order("edited_at", { ascending: false });

  if (error) {
    // Table may not be migrated yet; fail soft for chat rendering.
    if (!error.message?.toLowerCase().includes("message_edit_history")) {
      console.error("Fetch message edit history error:", error);
    }
    return map;
  }

  for (const row of (data ?? []) as RawEdit[]) {
    const history = map.get(row.message_id) ?? [];
    history.push({
      previousContent: row.previous_content,
      newContent: row.new_content,
      editedAt: row.edited_at,
    });
    map.set(row.message_id, history);
  }

  return map;
};

function mapRow(
  row: RawMsg,
  profileMap: Map<string, RawProfile>,
  editHistoryMap: Map<string, MessageEdit[]>
): Message {
  const prof = profileMap.get(row.sender_id);
  const edits = editHistoryMap.get(row.id) ?? [];
  const editedAt =
    edits[0]?.editedAt ??
    (row.updated_at !== row.created_at ? row.updated_at : null);

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: normalizeType(row.message_type),
    mediaUrl: row.media_url,
    mediaDuration: row.media_duration,
    replyToId: row.reply_to_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    editedAt,
    editHistory: edits,
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

export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherParticipantLastReadAt, setOtherParticipantLastReadAt] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!conversationId) return;
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const viewerId = userData.user?.id ?? null;
      if (viewerId) {
        setCurrentUserId(viewerId);
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("user_id, last_read_at, joined_at")
          .eq("conversation_id", conversationId)
          .neq("user_id", viewerId)
          .order("joined_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        setOtherParticipantLastReadAt(otherParticipant?.last_read_at ?? null);
      } else {
        setOtherParticipantLastReadAt(null);
      }

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
          deleted_at
        `
        )
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Fetch messages error:", error);
        if (!before) setMessages([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as RawMsg[];
      const senderIds = Array.from(new Set(rows.map((row) => row.sender_id))).filter(Boolean);
      const messageIds = rows.map((row) => row.id);

      let profileMap = new Map<string, RawProfile>();
      if (senderIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", senderIds);

        if (profileError) {
          console.error("Fetch sender profiles error:", profileError);
        } else {
          profileMap = new Map(
            ((profileRows ?? []) as RawProfile[]).map((profile) => [profile.id, profile])
          );
        }
      }

      const editHistoryMap = await loadEditHistory(messageIds);
      const mapped = rows
        .map((row) => mapRow(row, profileMap, editHistoryMap))
        .reverse();

      if (before) {
        setMessages((prev) => [...mapped, ...prev]);
      } else {
        setMessages(mapped);
      }

      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    },
    [conversationId]
  );

  const loadMore = useCallback(() => {
    if (messages.length > 0) {
      fetchMessages(messages[0].createdAt);
    }
  }, [messages, fetchMessages]);

  const sendMessage = useCallback(
    async (opts: {
      content?: string;
      messageType?: MessageType;
      mediaUrl?: string;
      mediaDuration?: number;
      replyToId?: string;
    }) => {
      if (!conversationId) return;

      let senderId = currentUserId;
      if (!senderId) {
        const { data: userData } = await supabase.auth.getUser();
        senderId = userData.user?.id ?? null;
        if (!senderId) return;
        setCurrentUserId(senderId);
      }

      setSending(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
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

  const editMessage = useCallback(
    async (messageId: string, nextContent: string): Promise<boolean> => {
      if (!conversationId) return false;

      const trimmed = nextContent.trim();
      if (!trimmed) return false;

      let editorId = currentUserId;
      if (!editorId) {
        const { data: userData } = await supabase.auth.getUser();
        editorId = userData.user?.id ?? null;
        if (!editorId) return false;
        setCurrentUserId(editorId);
      }

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("messages")
        .update({ content: trimmed, updated_at: nowIso })
        .eq("id", messageId)
        .eq("conversation_id", conversationId)
        .eq("sender_id", editorId);

      if (error) {
        console.error("Edit message error:", error);
        return false;
      }

      const editHistoryMap = await loadEditHistory([messageId]);
      const persistedEdits = editHistoryMap.get(messageId) ?? [];

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const fallbackEdit: MessageEdit = {
            previousContent: msg.content,
            newContent: trimmed,
            editedAt: nowIso,
          };
          const edits = persistedEdits.length ? persistedEdits : [fallbackEdit, ...(msg.editHistory ?? [])];
          return {
            ...msg,
            content: trimmed,
            updatedAt: nowIso,
            editedAt: edits[0]?.editedAt ?? nowIso,
            editHistory: edits,
          };
        })
      );

      return true;
    },
    [conversationId, currentUserId]
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    void fetchMessages();

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
          const row = payload.new as RawMsg;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", row.sender_id)
            .maybeSingle();

          const mapped: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content,
            messageType: normalizeType(row.message_type),
            mediaUrl: row.media_url,
            mediaDuration: row.media_duration,
            replyToId: row.reply_to_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
            editedAt: row.updated_at !== row.created_at ? row.updated_at : null,
            editHistory: [],
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
            if (prev.some((m) => m.id === mapped.id)) return prev;
            return [...prev, mapped];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as RawMsg;
          if (row.deleted_at) return;

          const editHistoryMap = await loadEditHistory([row.id]);
          const edits = editHistoryMap.get(row.id) ?? [];

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id !== row.id
                ? msg
                : {
                    ...msg,
                    content: row.content,
                    updatedAt: row.updated_at,
                    editedAt: edits[0]?.editedAt ?? (row.updated_at !== row.created_at ? row.updated_at : null),
                    editHistory: edits.length ? edits : msg.editHistory ?? [],
                  }
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string | null } | null;
          if (!row?.user_id || !currentUserId) return;
          if (row.user_id !== currentUserId) {
            setOtherParticipantLastReadAt(row.last_read_at ?? null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string | null } | null;
          if (!row?.user_id || !currentUserId) return;
          if (row.user_id !== currentUserId) {
            setOtherParticipantLastReadAt(row.last_read_at ?? null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, currentUserId, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    hasMore,
    currentUserId,
    otherParticipantLastReadAt,
    sendMessage,
    editMessage,
    loadMore,
    markAsRead,
  };
}
