"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { UserPresence } from "./types";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── set own status ──────────────────────────────────── */
  const setStatus = useCallback(async (status: "online" | "offline" | "away") => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("user_presence").upsert(
      {
        user_id: userData.user.id,
        status,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }, []);

  /* ── fetch presence of specific users ────────────────── */
  const fetchPresence = useCallback(async (userIds: string[]) => {
    if (!userIds.length) return;

    const { data } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen_at")
      .in("user_id", userIds);

    const map = new Map<string, UserPresence>();
    for (const row of data ?? []) {
      map.set(row.user_id, {
        userId: row.user_id,
        status: row.status as UserPresence["status"],
        lastSeenAt: row.last_seen_at,
      });
    }
    setOnlineUsers(map);
  }, []);

  /* ── heartbeat: stay online while app is open ────────── */
  useEffect(() => {
    setStatus("online");

    intervalRef.current = setInterval(() => {
      setStatus("online");
    }, HEARTBEAT_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setStatus("away");
      } else {
        setStatus("online");
      }
    };

    const handleBeforeUnload = () => {
      // Best-effort offline signal
      navigator.sendBeacon?.(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${""}&select=user_id`,
        ""
      );
      setStatus("offline");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Subscribe to presence changes
    const channel = supabase
      .channel("global-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row = payload.new as any;
          if (row?.user_id) {
            setOnlineUsers((prev) => {
              const next = new Map(prev);
              next.set(row.user_id, {
                userId: row.user_id,
                status: row.status,
                lastSeenAt: row.last_seen_at,
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setStatus("offline");
      supabase.removeChannel(channel);
    };
  }, [setStatus]);

  /* ── check if specific user is online ────────────────── */
  const isOnline = useCallback(
    (userId: string) => onlineUsers.get(userId)?.status === "online",
    [onlineUsers]
  );

  return {
    onlineUsers,
    isOnline,
    fetchPresence,
    setStatus,
  };
}
