"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Notification } from "@/lib/messages/types";

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
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
      .limit(50);

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

    setNotifications(mapped);
    setUnreadCount(mapped.filter((n) => !n.read).length);
    setLoading(false);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

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

  /* initial load + realtime */
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllRead,
    refresh: fetchNotifications,
  };
}
