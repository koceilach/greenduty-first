"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Notification } from "@/lib/messages/types";

const GROUP_WINDOW_MS = 10 * 60 * 1000;

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

export type NotificationPreferences = {
  muteLike: boolean;
  muteComment: boolean;
  muteCommentReply: boolean;
  muteFollow: boolean;
  muteMessage: boolean;
  muteMention: boolean;
  muteRepostStory: boolean;
  muteSystem: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  muteLike: false,
  muteComment: false,
  muteCommentReply: false,
  muteFollow: false,
  muteMessage: false,
  muteMention: false,
  muteRepostStory: false,
  muteSystem: false,
};

const toGroupKey = (notification: Notification) =>
  [
    notification.type,
    notification.actorId ?? "",
    notification.resourceType ?? "",
    notification.resourceId ?? "",
  ].join(":");

const groupNotifications = (items: Notification[]) => {
  const grouped: Notification[] = [];
  for (const item of items) {
    const previous = grouped[grouped.length - 1];
    if (!previous) {
      grouped.push({ ...item, groupCount: 1 });
      continue;
    }

    const sameGroup = toGroupKey(previous) === toGroupKey(item);
    const withinWindow =
      Math.abs(new Date(previous.createdAt).getTime() - new Date(item.createdAt).getTime()) <=
      GROUP_WINDOW_MS;

    if (!sameGroup || !withinWindow) {
      grouped.push({ ...item, groupCount: 1 });
      continue;
    }

    const nextCount = (previous.groupCount ?? 1) + 1;
    grouped[grouped.length - 1] = {
      ...previous,
      read: previous.read && item.read,
      groupCount: nextCount,
    };
  }
  return grouped;
};

const prefColumnMap: Record<keyof NotificationPreferences, string> = {
  muteLike: "mute_like",
  muteComment: "mute_comment",
  muteCommentReply: "mute_comment_reply",
  muteFollow: "mute_follow",
  muteMessage: "mute_message",
  muteMention: "mute_mention",
  muteRepostStory: "mute_repost_story",
  muteSystem: "mute_system",
};

const mapPreferenceRow = (row: any): NotificationPreferences => ({
  muteLike: Boolean(row?.mute_like),
  muteComment: Boolean(row?.mute_comment),
  muteCommentReply: Boolean(row?.mute_comment_reply),
  muteFollow: Boolean(row?.mute_follow),
  muteMessage: Boolean(row?.mute_message),
  muteMention: Boolean(row?.mute_mention),
  muteRepostStory: Boolean(row?.mute_repost_story),
  muteSystem: Boolean(row?.mute_system),
});

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setPreferencesLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "mute_like,mute_comment,mute_comment_reply,mute_follow,mute_message,mute_mention,mute_repost_story,mute_system"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setPreferencesLoading(false);
      return;
    }

    if (!data) {
      await supabase.from("notification_preferences").insert({ user_id: user.id });
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setPreferencesLoading(false);
      return;
    }

    setPreferences(mapPreferenceRow(data));
    setPreferencesLoading(false);
  }, []);

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const column = prefColumnMap[key];
      if (!column) return;

      await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            [column]: value,
          },
          { onConflict: "user_id" }
        );

      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("notifications")
      .select(
        `
        id,
        user_id,
        type,
        title,
        body,
        actor_id,
        resource_type,
        resource_id,
        read,
        created_at,
        profiles:actor_id (
          full_name,
          username,
          avatar_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120);

    const mapped: Notification[] = (rows ?? []).map((row) => {
      const prof = first(row.profiles as any);
      return {
        id: row.id,
        userId: row.user_id,
        type: row.type as Notification["type"],
        title: row.title,
        body: row.body,
        actorId: row.actor_id,
        resourceType: row.resource_type as Notification["resourceType"],
        resourceId: row.resource_id,
        read: row.read,
        createdAt: row.created_at,
        actor: prof
          ? {
              fullName: prof.full_name,
              username: prof.username,
              avatarUrl: prof.avatar_url,
            }
          : undefined,
      };
    });

    setNotifications(groupNotifications(mapped));
    setUnreadCount(mapped.filter((n) => !n.read).length);
    setLoading(false);
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userData.user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await Promise.all([fetchNotifications(), fetchPreferences()]);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!active || !userId) return;

      channel = supabase
        .channel(`notifications-realtime:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void fetchNotifications();
          }
        )
        .subscribe();
    };

    void init();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications, fetchPreferences]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllRead,
    refresh: fetchNotifications,
    preferences,
    preferencesLoading,
    updatePreference,
    refreshPreferences: fetchPreferences,
  };
}
