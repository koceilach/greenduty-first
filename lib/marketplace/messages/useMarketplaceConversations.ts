"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { GD_findOrCreateMarketplaceDirectConversation } from "./direct-conversation";

type MarketplaceProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
};

type MarketplaceParticipantRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  marketplace_profiles?: MarketplaceProfileRow | MarketplaceProfileRow[] | null;
};

type MarketplaceConversationRow = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  pinned_item_id: string | null;
  pinned_item_title: string | null;
  pinned_item_image_url: string | null;
  pinned_item_price_dzd: number | null;
  updated_at: string;
  created_at: string;
};

type MarketplaceMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "voice" | "image" | "system";
  created_at: string;
};

type MarketplaceLastMessage = {
  id: string;
  senderId: string;
  content: string | null;
  messageType: "text" | "voice" | "image" | "system";
  createdAt: string;
};

export type MarketplaceConversation = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: MarketplaceLastMessage | null;
  pinnedProduct?: {
    id: string;
    title: string | null;
    imageUrl: string | null;
    priceDzd: number | null;
  } | null;
  otherUser?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
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

export function useMarketplaceConversations() {
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveAvatarUrl = useCallback((rawUrl?: string | null) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith("http")) return rawUrl;
    const { data } = supabase.storage.from("avatars").getPublicUrl(rawUrl);
    return data?.publicUrl ?? rawUrl;
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      const user = userData.user;
      if (authError || !user) {
        setCurrentUserId(null);
        setConversations([]);
        setLoading(false);
        if (authError) {
          setError("Please sign in again to load marketplace chats.");
        }
        return;
      }

      setCurrentUserId(user.id);

      const { data: myParticipantRows, error: myParticipantsError } = await supabase
        .from("marketplace_conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myParticipantsError) {
        setConversations([]);
        setError("Unable to load your conversations right now.");
        setLoading(false);
        return;
      }

      const conversationIds = Array.from(
        new Set(
          (myParticipantRows ?? [])
            .map((row: any) => row.conversation_id)
            .filter((value: unknown): value is string => typeof value === "string")
        )
      );

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const [
        { data: conversationRows, error: conversationsError },
        { data: participantRows, error: participantsError },
        { data: latestMessages, error: messagesError },
      ] = await Promise.all([
        supabase
          .from("marketplace_conversations")
          .select(
            "id, type, name, pinned_item_id, pinned_item_title, pinned_item_image_url, pinned_item_price_dzd, updated_at, created_at"
          )
          .in("id", conversationIds)
          .order("updated_at", { ascending: false }),
        supabase
          .from("marketplace_conversation_participants")
          .select(
            `
            id,
            conversation_id,
            user_id,
            last_read_at,
            marketplace_profiles:user_id (
              id,
              email,
              username,
              store_name,
              avatar_url
            )
          `
          )
          .in("conversation_id", conversationIds),
        supabase
          .from("marketplace_messages")
          .select("id, conversation_id, sender_id, content, message_type, created_at")
          .in("conversation_id", conversationIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (conversationsError || participantsError || messagesError) {
        setConversations([]);
        setError("Unable to refresh marketplace chats.");
        return;
      }

      const participantList = (participantRows ?? []) as MarketplaceParticipantRow[];
      const messageList = (latestMessages ?? []) as MarketplaceMessageRow[];

      const lastMessageMap = new Map<string, MarketplaceLastMessage>();
      for (const message of messageList) {
        if (!lastMessageMap.has(message.conversation_id)) {
          lastMessageMap.set(message.conversation_id, {
            id: message.id,
            senderId: message.sender_id,
            content: message.content,
            messageType: message.message_type,
            createdAt: message.created_at,
          });
        }
      }

      const mapped = ((conversationRows ?? []) as MarketplaceConversationRow[]).map((conversation) => {
        const conversationParticipants = participantList.filter(
          (participant) => participant.conversation_id === conversation.id
        );
        const myParticipant = conversationParticipants.find(
          (participant) => participant.user_id === user.id
        );
        const otherParticipant = conversationParticipants.find(
          (participant) => participant.user_id !== user.id
        );

        const otherProfile = first(otherParticipant?.marketplace_profiles ?? null);
        const lastMessage = lastMessageMap.get(conversation.id) ?? null;

        const unreadCount = messageList.filter((message) => {
          if (message.conversation_id !== conversation.id) return false;
          if (message.sender_id === user.id) return false;
          if (!myParticipant?.last_read_at) return true;
          return new Date(message.created_at) > new Date(myParticipant.last_read_at);
        }).length;

        return {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          unreadCount,
          lastMessage,
        pinnedProduct: conversation.pinned_item_id
          ? {
              id: conversation.pinned_item_id,
              title: conversation.pinned_item_title,
              imageUrl: resolveAvatarUrl(conversation.pinned_item_image_url),
              priceDzd: conversation.pinned_item_price_dzd,
            }
          : null,
          otherUser: otherProfile
            ? {
                id: otherProfile.id,
                name: resolveDisplayName(otherProfile),
                avatarUrl: resolveAvatarUrl(otherProfile.avatar_url),
              }
            : undefined,
        } satisfies MarketplaceConversation;
      });

      setConversations(mapped);
    } catch (error) {
      setConversations([]);
      setError("Unexpected chat loading error.");
    } finally {
      setLoading(false);
    }
  }, [resolveAvatarUrl]);

  const findOrCreateDM = useCallback(
    async (
      otherUserId: string,
      context?: {
        itemId?: string | null;
        itemTitle?: string | null;
        itemImageUrl?: string | null;
        itemPriceDzd?: number | null;
      }
    ): Promise<{ conversationId: string | null; error: string | null }> => {
      if (!otherUserId) {
        return { conversationId: null, error: "Missing user id for chat." };
      }

      const existingConversation = conversations.find(
        (conversation) =>
          conversation.type === "direct" &&
          conversation.otherUser?.id === otherUserId
      );
      if (existingConversation && !context?.itemId) {
        return { conversationId: existingConversation.id, error: null };
      }

      let actorId = currentUserId;
      if (!actorId) {
        const { data: userData } = await supabase.auth.getUser();
        actorId = userData.user?.id ?? null;
        if (actorId) {
          setCurrentUserId(actorId);
        }
      }

      if (!actorId) {
        return { conversationId: null, error: "Please sign in first." };
      }

      try {
        const result = await GD_findOrCreateMarketplaceDirectConversation(
          supabase,
          actorId,
          otherUserId,
          context
        );
        if (result.conversationId) {
          setError(null);
          await fetchConversations();
          return result;
        }
        if (result.error) {
          setError(result.error);
        }
        return result;
      } catch (error) {
        const message = "Unable to open marketplace chat right now.";
        setError(message);
        return { conversationId: null, error: message };
      }
    },
    [conversations, currentUserId, fetchConversations, supabase]
  );

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("marketplace-conversations-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_messages" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketplace_messages" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketplace_conversation_participants" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketplace_conversations" },
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
    error,
    currentUserId,
    fetchConversations,
    findOrCreateDM,
  };
}
