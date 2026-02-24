"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Conversation, ConversationParticipant, Message } from "./types";
import { GD_findOrCreateDirectConversation } from "./direct-conversation";

type ConversationRow = {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_message_id?: string | null;
  last_message_sender_id?: string | null;
  last_message_type?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
};

type ParticipantRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  is_pinned?: boolean | null;
  is_muted?: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type RpcConversationIdRow = {
  conversation_id: string;
};

type MessagePresenceRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  media_url: string | null;
  media_duration: number | null;
  created_at: string;
};

const pinnedOverridesKey = (userId: string) => `gd-chat-pinned-overrides:${userId}`;
const mutedOverridesKey = (userId: string) => `gd-chat-muted-overrides:${userId}`;

const readPinnedOverrides = (userId: string): Map<string, boolean> => {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(pinnedOverridesKey(userId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (!parsed || typeof parsed !== "object") return new Map();
    return new Map(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] =>
          typeof entry[0] === "string" && typeof entry[1] === "boolean"
      )
    );
  } catch {
    return new Map();
  }
};

const readMutedOverrides = (userId: string): Map<string, boolean> => {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(mutedOverridesKey(userId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (!parsed || typeof parsed !== "object") return new Map();
    return new Map(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] =>
          typeof entry[0] === "string" && typeof entry[1] === "boolean"
      )
    );
  } catch {
    return new Map();
  }
};

const writePinnedOverrides = (userId: string, map: Map<string, boolean>) => {
  if (typeof window === "undefined") return;
  try {
    if (!map.size) {
      window.localStorage.removeItem(pinnedOverridesKey(userId));
      return;
    }
    const payload = Object.fromEntries(map.entries());
    window.localStorage.setItem(pinnedOverridesKey(userId), JSON.stringify(payload));
  } catch {
    // no-op: local fallback is best-effort
  }
};

const writeMutedOverrides = (userId: string, map: Map<string, boolean>) => {
  if (typeof window === "undefined") return;
  try {
    if (!map.size) {
      window.localStorage.removeItem(mutedOverridesKey(userId));
      return;
    }
    const payload = Object.fromEntries(map.entries());
    window.localStorage.setItem(mutedOverridesKey(userId), JSON.stringify(payload));
  } catch {
    // no-op: local fallback is best-effort
  }
};

const toMessageType = (value: string | null | undefined): Message["messageType"] => {
  if (value === "voice" || value === "image" || value === "system") return value;
  return "text";
};

const dedupeConversationIds = (ids: string[]) =>
  Array.from(new Set(ids.filter((value): value is string => typeof value === "string" && value.length > 0)));

const conversationActivityTime = (conversation: Conversation) =>
  conversation.lastMessage?.createdAt
    ? new Date(conversation.lastMessage.createdAt).getTime()
    : new Date(conversation.updatedAt).getTime();

const conversationSort = (a: Conversation, b: Conversation) => {
  const pinnedDelta = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
  if (pinnedDelta !== 0) return pinnedDelta;
  return conversationActivityTime(b) - conversationActivityTime(a);
};

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadConversationIds = useCallback(async (userId: string): Promise<string[]> => {
    const participantsResult = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (!participantsResult.error) {
      return dedupeConversationIds(
        (participantsResult.data ?? []).map((row) => row.conversation_id)
      );
    }

    const rpcResult = await supabase.rpc("get_user_conversation_ids", { p_user_id: userId });
    if (!rpcResult.error) {
      return dedupeConversationIds(
        ((rpcResult.data ?? []) as RpcConversationIdRow[]).map((row) => row.conversation_id)
      );
    }

    const fallbackConversations = await supabase
      .from("conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (fallbackConversations.error) return [];
    return dedupeConversationIds((fallbackConversations.data ?? []).map((row) => row.id));
  }, []);

  const buildFriendFallback = useCallback(async (friendIds: string[]): Promise<Conversation[]> => {
    if (!friendIds.length) return [];

    const [{ data: friendProfiles }, { data: friendPresenceRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", friendIds),
      supabase
        .from("user_presence")
        .select("user_id, status")
        .in("user_id", friendIds),
    ]);

    const friendPresenceMap = new Map(
      (friendPresenceRows ?? []).map((row) => [row.user_id, row.status])
    );

    const nowIso = new Date().toISOString();
    const fallbackConversations: Conversation[] = (friendProfiles ?? []).map((friend) => ({
      id: `friend:${friend.id}`,
      type: "direct",
      name: null,
      avatarUrl: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      unreadCount: 0,
      participants: [],
      otherUser: {
        id: friend.id,
        fullName: friend.full_name,
        username: friend.username,
        avatarUrl: friend.avatar_url,
        online: friendPresenceMap.get(friend.id) === "online",
      },
    }));

    fallbackConversations.sort((a, b) => Number(Boolean(b.otherUser?.online)) - Number(Boolean(a.otherUser?.online)));
    return fallbackConversations;
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setConversations([]);
      setCurrentUserId(null);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    const pinnedOverrides = readPinnedOverrides(user.id);
    const mutedOverrides = readMutedOverrides(user.id);

    const [{ data: friendshipRows }, { data: acceptedRows }] = await Promise.all([
      supabase
        .from("friendships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

    const friendIds = Array.from(
      new Set(
        [
          ...(friendshipRows ?? []).map((row) => (row.user_a === user.id ? row.user_b : row.user_a)),
          ...(acceptedRows ?? []).map((row) =>
            row.sender_id === user.id ? row.receiver_id : row.sender_id
          ),
        ].filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    let convIds = await loadConversationIds(user.id);

    if (!convIds.length) {
      const friendFallback = await buildFriendFallback(friendIds);
      setConversations(friendFallback);
      setLoading(false);
      return;
    }

    const selectWithSnapshots = [
      "id",
      "type",
      "name",
      "avatar_url",
      "created_at",
      "updated_at",
      "last_message_id",
      "last_message_sender_id",
      "last_message_type",
      "last_message_preview",
      "last_message_at",
    ].join(", ");

    let convRows: ConversationRow[] = [];
    let snapshotColumnsAvailable = true;

    const { data: snapshotRows, error: snapshotError } = await supabase
      .from("conversations")
      .select(selectWithSnapshots)
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (snapshotError) {
      snapshotColumnsAvailable = false;
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from("conversations")
        .select("id, type, name, avatar_url, created_at, updated_at")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (fallbackError) {
        setConversations([]);
        setLoading(false);
        return;
      }

      convRows = (fallbackRows ?? []) as unknown as ConversationRow[];
    } else {
      convRows = (snapshotRows ?? []) as unknown as ConversationRow[];
    }

    if (!convRows.length && convIds.length) {
      const nowIso = new Date().toISOString();
      snapshotColumnsAvailable = false;
      convRows = convIds.map((id) => ({
        id,
        type: "direct",
        name: null,
        avatar_url: null,
        created_at: nowIso,
        updated_at: nowIso,
      }));
    }

    let allParticipants: ParticipantRow[] = [];
    const participantsWithPrefs = await supabase
      .from("conversation_participants")
      .select("id, conversation_id, user_id, role, joined_at, last_read_at, is_pinned, is_muted")
      .in("conversation_id", convIds);

    if (participantsWithPrefs.error) {
      const participantsFallback = await supabase
        .from("conversation_participants")
        .select("id, conversation_id, user_id, role, joined_at, last_read_at")
        .in("conversation_id", convIds);
      allParticipants = (participantsFallback.data ?? []) as ParticipantRow[];
    } else {
      allParticipants = (participantsWithPrefs.data ?? []) as ParticipantRow[];
    }

    const userIds = Array.from(new Set(allParticipants.map((row) => row.user_id)));

    const { data: profileRows } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds)
      : { data: [] as ProfileRow[] };

    const profileMap = new Map<string, ProfileRow>(
      ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    const otherUserIds = Array.from(
      new Set(allParticipants.filter((row) => row.user_id !== user.id).map((row) => row.user_id))
    );

    const { data: presenceRows } = otherUserIds.length
      ? await supabase
          .from("user_presence")
          .select("user_id, status")
          .in("user_id", otherUserIds)
      : { data: [] as { user_id: string; status: string }[] };

    const presenceMap = new Map((presenceRows ?? []).map((row) => [row.user_id, row.status]));
    const myLastReadAtByConversation = new Map<string, string | null>(
      allParticipants
        .filter((row) => row.user_id === user.id)
        .map((row) => [row.conversation_id, row.last_read_at])
    );

    const unreadCountMap = new Map<string, number>();
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .is("deleted_at", null);

    for (const row of (unreadRows ?? []) as MessagePresenceRow[]) {
      const lastReadAt = myLastReadAtByConversation.get(row.conversation_id) ?? null;
      if (!lastReadAt || new Date(row.created_at).getTime() > new Date(lastReadAt).getTime()) {
        unreadCountMap.set(
          row.conversation_id,
          (unreadCountMap.get(row.conversation_id) ?? 0) + 1
        );
      }
    }

    const lastMsgMap = new Map<string, Message>();

    if (snapshotColumnsAvailable) {
      for (const conv of convRows) {
        const createdAt = conv.last_message_at ?? null;
        if (!createdAt) continue;

        lastMsgMap.set(conv.id, {
          id: conv.last_message_id ?? `${conv.id}-last`,
          conversationId: conv.id,
          senderId: conv.last_message_sender_id ?? "",
          content: conv.last_message_preview ?? null,
          messageType: toMessageType(conv.last_message_type),
          mediaUrl: null,
          mediaDuration: null,
          replyToId: null,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
        });
      }
    } else {
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, message_type, media_url, media_duration, created_at")
        .in("conversation_id", convIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      for (const msg of lastMessages ?? []) {
        if (lastMsgMap.has(msg.conversation_id)) continue;
        lastMsgMap.set(msg.conversation_id, {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          messageType: toMessageType(msg.message_type),
          mediaUrl: msg.media_url,
          mediaDuration: msg.media_duration,
          replyToId: null,
          createdAt: msg.created_at,
          updatedAt: msg.created_at,
          deletedAt: null,
        });
      }
    }

    const mapped: Conversation[] = convRows.map((conv) => {
      const participants: ConversationParticipant[] = allParticipants
        .filter((row) => row.conversation_id === conv.id)
        .map((row) => {
          const profile = profileMap.get(row.user_id);
          return {
            id: row.id,
            conversationId: row.conversation_id,
            userId: row.user_id,
            role: row.role === "admin" ? "admin" : "member",
            joinedAt: row.joined_at,
            lastReadAt: row.last_read_at,
            isPinned: Boolean(row.is_pinned),
            isMuted: Boolean(row.is_muted),
            profile: profile
              ? {
                  id: profile.id,
                  fullName: profile.full_name,
                  username: profile.username,
                  avatarUrl: profile.avatar_url,
                }
              : undefined,
          };
        });

      const otherParticipant = participants.find((participant) => participant.userId !== user.id);
      const otherProfile = otherParticipant?.profile;
      const myParticipant = participants.find((participant) => participant.userId === user.id);
      const lastMsg = lastMsgMap.get(conv.id) ?? null;
      const pinnedOverride = pinnedOverrides.get(conv.id);
      const mutedOverride = mutedOverrides.get(conv.id);

      const unreadCount = unreadCountMap.get(conv.id) ?? 0;

      return {
        id: conv.id,
        type: conv.type === "group" ? "group" : "direct",
        name: conv.name,
        avatarUrl: conv.avatar_url,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        isPinned:
          typeof pinnedOverride === "boolean"
            ? pinnedOverride
            : Boolean(myParticipant?.isPinned),
        isMuted:
          typeof mutedOverride === "boolean"
            ? mutedOverride
            : Boolean(myParticipant?.isMuted),
        lastMessage: lastMsg,
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

    mapped.sort(conversationSort);

    if (!mapped.length) {
      const friendFallback = await buildFriendFallback(friendIds);
      setConversations(friendFallback);
      setLoading(false);
      return;
    }

    setConversations(mapped);
    setLoading(false);
  }, [buildFriendFallback, loadConversationIds]);

  const togglePinned = useCallback(
    async (conversationId: string, nextPinned: boolean): Promise<boolean> => {
      if (!currentUserId || conversationId.startsWith("friend:")) return false;

      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation.id === conversationId ? { ...conversation, isPinned: nextPinned } : conversation
          )
          .sort(conversationSort)
      );

      // Optimistic local persistence so pin works even if DB schema/policy is not ready.
      const optimisticOverrides = readPinnedOverrides(currentUserId);
      optimisticOverrides.set(conversationId, nextPinned);
      writePinnedOverrides(currentUserId, optimisticOverrides);

      const { data, error } = await supabase
        .from("conversation_participants")
        .update({ is_pinned: nextPinned })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId)
        .select("conversation_id, is_pinned")
        .maybeSingle();

      if (!error && data) {
        // DB is source of truth when available; clear local override.
        const overrides = readPinnedOverrides(currentUserId);
        overrides.delete(conversationId);
        writePinnedOverrides(currentUserId, overrides);
        return true;
      }

      // Keep local override active as fallback.
      if (error) {
        console.warn("Pin conversation fallback to local override:", error.message);
      } else {
        console.warn("Pin conversation fallback to local override: no updatable participant row found.");
      }
      return true;
    },
    [currentUserId]
  );

  const toggleMuted = useCallback(
    async (conversationId: string, nextMuted: boolean): Promise<boolean> => {
      if (!currentUserId || conversationId.startsWith("friend:")) return false;

      const previousMuted =
        conversations.find((conversation) => conversation.id === conversationId)?.isMuted ?? false;

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, isMuted: nextMuted } : conversation
        )
      );

      // Optimistic local persistence so mute works even if DB schema/policy is not ready.
      const optimisticOverrides = readMutedOverrides(currentUserId);
      optimisticOverrides.set(conversationId, nextMuted);
      writeMutedOverrides(currentUserId, optimisticOverrides);

      const { error } = await supabase
        .from("conversation_participants")
        .update({ is_muted: nextMuted })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);

      if (!error) {
        // DB is source of truth when available; clear local override.
        const overrides = readMutedOverrides(currentUserId);
        overrides.delete(conversationId);
        writeMutedOverrides(currentUserId, overrides);
        return true;
      }

      // Keep local override active as a fallback and preserve UX state.
      console.warn("Mute conversation fallback to local override:", error.message);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, isMuted: nextMuted } : conversation
        )
      );
      // If user attempted unmute but we cannot persist remotely, preserve previous in memory if desired.
      if (!nextMuted && previousMuted) {
        const overrides = readMutedOverrides(currentUserId);
        overrides.set(conversationId, false);
        writeMutedOverrides(currentUserId, overrides);
      }
      return true;
    },
    [conversations, currentUserId]
  );

  const markConversationRead = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!currentUserId || conversationId.startsWith("friend:")) return;
      const nowIso = new Date().toISOString();

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id !== conversationId
            ? conversation
            : {
                ...conversation,
                unreadCount: 0,
                participants: conversation.participants.map((participant) =>
                  participant.userId === currentUserId
                    ? { ...participant, lastReadAt: nowIso }
                    : participant
                ),
              }
        )
      );

      await supabase
        .from("conversation_participants")
        .update({ last_read_at: nowIso })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);
    },
    [currentUserId]
  );

  const findOrCreateDM = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!currentUserId) return null;
      const result = await GD_findOrCreateDirectConversation(supabase, currentUserId, otherUserId);
      if (!result.conversationId) return null;
      await fetchConversations();
      return result.conversationId;
    },
    [currentUserId, fetchConversations]
  );

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as RealtimeMessageRow;
          if (!row?.conversation_id) {
            void fetchConversations();
            return;
          }

          const isIncoming = Boolean(currentUserId && row.sender_id && row.sender_id !== currentUserId);
          const messageType = toMessageType(row.message_type);
          let foundConversation = false;

          setConversations((prev) => {
            const next = prev
              .map((conversation) => {
                if (conversation.id !== row.conversation_id) return conversation;
                foundConversation = true;
                const nextUnread = isIncoming ? (conversation.unreadCount ?? 0) + 1 : conversation.unreadCount;
                return {
                  ...conversation,
                  updatedAt: row.created_at,
                  lastMessage: {
                    id: row.id,
                    conversationId: row.conversation_id,
                    senderId: row.sender_id,
                    content: row.content,
                    messageType,
                    mediaUrl: row.media_url ?? null,
                    mediaDuration: row.media_duration ?? null,
                    replyToId: null,
                    createdAt: row.created_at,
                    updatedAt: row.created_at,
                    deletedAt: null,
                  },
                  unreadCount: nextUnread,
                };
              })
              .sort(conversationSort);

            return next;
          });

          if (!foundConversation) {
            // New conversation not in memory yet (or friend placeholder) -> refetch once.
            void fetchConversations();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_participants" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { user_id?: string; status?: string }
            | null;
          if (!row?.user_id) return;
          const online = payload.eventType === "DELETE" ? false : row.status === "online";

          setConversations((prev) => {
            let changed = false;
            const next = prev.map((conversation) => {
              if (!conversation.otherUser || conversation.otherUser.id !== row.user_id) {
                return conversation;
              }
              if (conversation.otherUser.online === online) {
                return conversation;
              }
              changed = true;
              return {
                ...conversation,
                otherUser: {
                  ...conversation.otherUser,
                  online,
                },
              };
            });
            return changed ? next : prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchConversations]);

  return {
    conversations,
    loading,
    currentUserId,
    fetchConversations,
    findOrCreateDM,
    togglePinned,
    toggleMuted,
    markConversationRead,
  };
}
