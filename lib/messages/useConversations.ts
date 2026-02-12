"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Conversation, ConversationParticipant, Message } from "./types";

/* ─── helpers ───────────────────────────────────────────── */
const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

/* ─── hook ──────────────────────────────────────────────── */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /* ── fetch conversations ─────────────────────────────── */
  const fetchConversations = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    // Get all conversation ids the user is part of
    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    const convIds = (participantRows ?? []).map((r) => r.conversation_id);
    if (!convIds.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get conversations
    const { data: convRows } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    // Get all participants + profiles for those conversations
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select(
        `
          id,
          conversation_id,
          user_id,
          role,
          joined_at,
          last_read_at,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `
      )
      .in("conversation_id", convIds);

    // Get last message per conversation
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, message_type, media_url, media_duration, created_at")
      .in("conversation_id", convIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Get online users
    const otherUserIds = (allParticipants ?? [])
      .filter((p) => p.user_id !== user.id)
      .map((p) => p.user_id);

    const { data: presenceRows } = otherUserIds.length
      ? await supabase
          .from("user_presence")
          .select("user_id, status")
          .in("user_id", otherUserIds)
      : { data: [] as { user_id: string; status: string }[] };

    const presenceMap = new Map(
      (presenceRows ?? []).map((r) => [r.user_id, r.status])
    );

    // Build a map of last message per conversation
    const lastMsgMap = new Map<string, Message>();
    for (const msg of lastMessages ?? []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          messageType: msg.message_type as Message["messageType"],
          mediaUrl: msg.media_url,
          mediaDuration: msg.media_duration,
          replyToId: null,
          createdAt: msg.created_at,
          updatedAt: msg.created_at,
          deletedAt: null,
        });
      }
    }

    // Assemble conversations
    const mapped: Conversation[] = (convRows ?? []).map((conv) => {
      const participants: ConversationParticipant[] = (allParticipants ?? [])
        .filter((p) => p.conversation_id === conv.id)
        .map((p) => {
          const prof = first(p.profiles as any);
          return {
            id: p.id,
            conversationId: p.conversation_id,
            userId: p.user_id,
            role: p.role as "member" | "admin",
            joinedAt: p.joined_at,
            lastReadAt: p.last_read_at,
            profile: prof
              ? {
                  id: prof.id,
                  fullName: prof.full_name,
                  username: prof.username,
                  avatarUrl: prof.avatar_url,
                }
              : undefined,
          };
        });

      const otherParticipant = participants.find((p) => p.userId !== user.id);
      const otherProfile = otherParticipant?.profile;
      const myParticipant = participants.find((p) => p.userId === user.id);

      // Unread = messages after lastReadAt
      const lastReadAt = myParticipant?.lastReadAt;
      const lastMsg = lastMsgMap.get(conv.id);

      let unreadCount = 0;
      if (lastMsg && lastMsg.senderId !== user.id) {
        if (!lastReadAt || new Date(lastMsg.createdAt) > new Date(lastReadAt)) {
          unreadCount = 1; // simplified – shows indicator
        }
      }

      return {
        id: conv.id,
        type: conv.type as "direct" | "group",
        name: conv.name,
        avatarUrl: conv.avatar_url,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        lastMessage: lastMsg ?? null,
        unreadCount,
        participants,
        otherUser: otherProfile
          ? {
              id: otherProfile.id,
              fullName: otherProfile.fullName,
              username: otherProfile.username,
              avatarUrl: otherProfile.avatarUrl,
              online: presenceMap.get(otherProfile.id) === "online",
            }
          : undefined,
      };
    });

    setConversations(mapped);
    setLoading(false);
  }, []);

  /* ── create / find DM with a user ───────────────────── */
  const findOrCreateDM = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!currentUserId) return null;

      // Check if a direct conversation already exists between these two users
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      const myConvIds = (myConvs ?? []).map((r) => r.conversation_id);

      if (myConvIds.length) {
        const { data: otherConvs } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", myConvIds);

        for (const row of otherConvs ?? []) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("id, type")
            .eq("id", row.conversation_id)
            .eq("type", "direct")
            .single();
          if (conv) return conv.id;
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ type: "direct" })
        .select("id")
        .single();

      if (convError || !newConv) return null;

      await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: currentUserId },
        { conversation_id: newConv.id, user_id: otherUserId },
      ]);

      await fetchConversations();
      return newConv.id;
    },
    [currentUserId, fetchConversations]
  );

  /* ── initial load + realtime ─────────────────────────── */
  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages to refresh list
    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    currentUserId,
    fetchConversations,
    findOrCreateDM,
  };
}
