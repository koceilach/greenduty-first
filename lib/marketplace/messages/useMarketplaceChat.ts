"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type MarketplaceProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
};

type MarketplaceMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "voice" | "image" | "system";
  media_url: string | null;
  media_duration: number | null;
  created_at: string;
  deleted_at: string | null;
  marketplace_profiles?: MarketplaceProfileRow | MarketplaceProfileRow[] | null;
};

type MarketplaceConversationMetaRow = {
  id: string;
  pinned_item_id: string | null;
  pinned_item_title: string | null;
  pinned_item_image_url: string | null;
  pinned_item_price_dzd: number | null;
};

type SendMessageOptions = {
  messageType?: "text" | "image" | "system";
  mediaUrl?: string | null;
  mediaDuration?: number | null;
};

export type MarketplaceMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  messageType: "text" | "voice" | "image" | "system";
  mediaUrl: string | null;
  mediaDuration: number | null;
  createdAt: string;
  deletedAt: string | null;
  status?: "sending" | "sent" | "error";
  sender?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

export type MarketplaceConversationMeta = {
  id: string;
  pinnedProduct: {
    id: string;
    title: string | null;
    imageUrl: string | null;
    priceDzd: number | null;
  } | null;
};

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const resolveDisplayName = (profile: MarketplaceProfileRow | null): string => {
  if (!profile) return "Marketplace User";
  if (profile.store_name && profile.store_name.trim().length > 0) {
    return profile.store_name;
  }
  if (profile.username && profile.username.trim().length > 0) {
    return profile.username;
  }
  if (profile.email && profile.email.includes("@")) {
    return profile.email.split("@")[0];
  }
  return "Marketplace User";
};

export function useMarketplaceChat(conversationId: string | null) {
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<MarketplaceConversationMeta | null>(null);

  const resolvePublicUrl = useCallback((rawUrl?: string | null) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith("http")) return rawUrl;
    const { data } = supabase.storage.from("avatars").getPublicUrl(rawUrl);
    return data?.publicUrl ?? rawUrl;
  }, []);

  const mapMessage = useCallback(
    (row: MarketplaceMessageRow): MarketplaceMessage => {
      const senderProfile = first(row.marketplace_profiles ?? null);
      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        messageType: row.message_type,
        mediaUrl: resolvePublicUrl(row.media_url),
        mediaDuration: row.media_duration,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
        status: "sent",
        sender: senderProfile
          ? {
              id: senderProfile.id,
              name: resolveDisplayName(senderProfile),
              avatarUrl: resolvePublicUrl(senderProfile.avatar_url),
            }
          : undefined,
      };
    },
    [resolvePublicUrl]
  );

  const fetchConversationMeta = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("marketplace_conversations")
      .select(
        "id, pinned_item_id, pinned_item_title, pinned_item_image_url, pinned_item_price_dzd"
      )
      .eq("id", conversationId)
      .maybeSingle();

    if (fetchError || !data) {
      setConversation(null);
      if (fetchError) {
        setError("Unable to load conversation details.");
      }
      return;
    }

    const row = data as MarketplaceConversationMetaRow;
    setConversation({
      id: row.id,
      pinnedProduct: row.pinned_item_id
        ? {
            id: row.pinned_item_id,
            title: row.pinned_item_title,
            imageUrl: resolvePublicUrl(row.pinned_item_image_url),
            priceDzd: row.pinned_item_price_dzd,
          }
        : null,
    });
  }, [conversationId, resolvePublicUrl]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      const user = userData.user;
      if (authError || !user) {
        setCurrentUserId(null);
        setMessages([]);
        setError("Please sign in to open this chat.");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from("marketplace_messages")
        .select(
          `
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          media_url,
          media_duration,
          created_at,
          deleted_at,
          marketplace_profiles:sender_id (
            id,
            email,
            username,
            store_name,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);

      if (fetchError) {
        setMessages([]);
        setError("Unable to load messages right now.");
        return;
      }

      setMessages(((data ?? []) as MarketplaceMessageRow[]).map(mapMessage));
    } catch (error) {
      setMessages([]);
      setError("Unexpected message loading error.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, mapMessage]);

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      if (!conversationId || !currentUserId) {
        return { error: "Please sign in first." };
      }

      const messageType = options?.messageType ?? "text";
      const trimmed = content.trim();
      if (messageType === "text" && !trimmed) {
        return { error: "Message is empty." };
      }
      if (messageType === "image" && !options?.mediaUrl) {
        return { error: "Image URL is required." };
      }

      const optimisticId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: MarketplaceMessage = {
        id: optimisticId,
        conversationId,
        senderId: currentUserId,
        content: trimmed.length > 0 ? trimmed : null,
        messageType,
        mediaUrl: options?.mediaUrl ?? null,
        mediaDuration: options?.mediaDuration ?? null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        status: "sending",
      };
      setMessages((previous) => [...previous, optimisticMessage]);

      setSending(true);
      setError(null);
      try {
        const { data, error: insertError } = await supabase
          .from("marketplace_messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: trimmed.length > 0 ? trimmed : null,
            message_type: messageType,
            media_url: options?.mediaUrl ?? null,
            media_duration: options?.mediaDuration ?? null,
          })
          .select(
            `
            id,
            conversation_id,
            sender_id,
            content,
            message_type,
            media_url,
            media_duration,
            created_at,
            deleted_at,
            marketplace_profiles:sender_id (
              id,
              email,
              username,
              store_name,
              avatar_url
            )
          `
          )
          .single();

        if (insertError) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === optimisticId ? { ...message, status: "error" } : message
            )
          );
          return {
            error: insertError.message ?? "Failed to send message.",
          };
        }

        if (data) {
          const inserted = mapMessage(data as MarketplaceMessageRow);
          setMessages((previous) =>
            previous.map((message) =>
              message.id === optimisticId ? inserted : message
            )
          );
        }

        return { error: null };
      } catch (error) {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === optimisticId ? { ...message, status: "error" } : message
          )
        );
        return { error: "Failed to send message." };
      } finally {
        setSending(false);
      }
    },
    [conversationId, currentUserId, mapMessage]
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    await supabase
      .from("marketplace_conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
  }, [conversationId, currentUserId]);

  const otherUser = useMemo(() => {
    if (!currentUserId) return null;
    const otherMessage = [...messages]
      .reverse()
      .find((message) => message.senderId !== currentUserId);
    return otherMessage?.sender ?? null;
  }, [messages, currentUserId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setConversation(null);
      setLoading(false);
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");
    fetchConversationMeta();
    fetchMessages();

    const channel = supabase
      .channel(`marketplace-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as MarketplaceMessageRow;
          const { data: sender } = await supabase
            .from("marketplace_profiles")
            .select("id, email, username, store_name, avatar_url")
            .eq("id", row.sender_id)
            .maybeSingle();

          const newMessage = mapMessage({
            ...row,
            marketplace_profiles: sender ?? null,
          });

          setMessages((previous) => {
            const optimisticIndex = previous.findIndex(
              (message) =>
                message.status === "sending" &&
                message.senderId === newMessage.senderId &&
                message.content?.trim() === newMessage.content?.trim()
            );
            if (optimisticIndex >= 0) {
              const next = [...previous];
              next[optimisticIndex] = newMessage;
              return next;
            }
            if (previous.some((message) => message.id === newMessage.id)) {
              return previous;
            }
            return [...previous, newMessage];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("disconnected");
          setError("Realtime connection lost. Pull to refresh messages.");
        } else if (status === "CLOSED") {
          setConnectionState("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setConnectionState("disconnected");
    };
  }, [conversationId, fetchConversationMeta, fetchMessages, mapMessage]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchConversationMeta(), fetchMessages()]);
  }, [fetchConversationMeta, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    error,
    connectionState,
    currentUserId,
    otherUser,
    conversation,
    fetchMessages,
    fetchConversationMeta,
    refresh,
    sendMessage,
    markAsRead,
  };
}
