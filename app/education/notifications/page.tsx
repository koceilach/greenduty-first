"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { useNotifications } from "@/lib/notifications/useNotifications";
import { supabase } from "@/lib/supabase/client";
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  Repeat,
  UserPlus,
  AlertCircle,
  AtSign,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ICON_MAP: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageSquare,
  comment_reply: MessageCircle,
  follow: UserPlus,
  message: MessageCircle,
  mention: AtSign,
  repost_story: Repeat,
  system: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
  like: "bg-pink-50 text-pink-500 dark:bg-pink-900/20 dark:text-pink-400",
  comment: "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400",
  comment_reply: "bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300",
  follow: "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400",
  message: "bg-purple-50 text-purple-500 dark:bg-purple-900/20 dark:text-purple-400",
  mention: "bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400",
  repost_story: "bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-300",
  system: "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getNotifLink(
  type: string,
  resourceType: string | null,
  resourceId: string | null,
  actorId: string | null,
  commentPostMap: Map<string, string>
) {
  if (type === "message" && resourceId) return `/messages/${resourceId}`;
  if (type === "follow") return actorId ? `/profile/${actorId}` : "/profile";
  if (resourceType === "conversation" && resourceId) return `/messages/${resourceId}`;
  if (resourceType === "profile" && resourceId) return `/profile/${resourceId}`;
  if (resourceType === "post" && resourceId) return `/education/post/${resourceId}`;
  if (resourceType === "story" && resourceId) return `/education/post/${resourceId}`;
  if (resourceType === "comment" && resourceId) {
    const postId = commentPostMap.get(resourceId);
    return postId ? `/education/post/${postId}?comment=${resourceId}` : "/education";
  }
  return "/education";
}

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllRead,
    preferences,
    preferencesLoading,
    updatePreference,
  } = useNotifications();
  const [commentPostMap, setCommentPostMap] = useState<Map<string, string>>(new Map());

  const preferenceToggles: Array<{
    key:
      | "muteLike"
      | "muteComment"
      | "muteCommentReply"
      | "muteFollow"
      | "muteMessage"
      | "muteMention"
      | "muteRepostStory";
    label: string;
  }> = [
    { key: "muteLike", label: "Likes" },
    { key: "muteComment", label: "Comments" },
    { key: "muteCommentReply", label: "Replies" },
    { key: "muteMessage", label: "Messages" },
    { key: "muteFollow", label: "Follows" },
    { key: "muteMention", label: "Mentions" },
    { key: "muteRepostStory", label: "Reposts" },
  ];

  useEffect(() => {
    const commentIds = Array.from(
      new Set(
        notifications
          .filter(
            (notif) => notif.resourceType === "comment" && Boolean(notif.resourceId)
          )
          .map((notif) => notif.resourceId as string)
      )
    );

    if (!commentIds.length) {
      setCommentPostMap(new Map());
      return;
    }

    let active = true;
    (async () => {
      const { data } = await supabase
        .from("edu_comments")
        .select("id, post_id")
        .in("id", commentIds);

      if (!active) return;
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (row.id && row.post_id) {
          map.set(row.id, row.post_id);
        }
      }
      setCommentPostMap(map);
    })();

    return () => {
      active = false;
    };
  }, [notifications]);

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6">
        {/* Left sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="left" />
        </aside>

        {/* Main */}
        <main className="min-w-0">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Bell className="h-4 w-4 text-[#1E7F43] sm:h-5 sm:w-5" />
                <h1 className="text-base font-semibold sm:text-lg">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-[#1E7F43] px-2 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-[#1E7F43] transition hover:text-[#166536]"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Settings2 className="h-3.5 w-3.5 text-emerald-600" />
                Notification Mute Settings
              </div>
              <div className="flex flex-wrap gap-2">
                {preferencesLoading ? (
                  <span className="text-xs text-slate-500">Loading preferences...</span>
                ) : (
                  preferenceToggles.map((item) => {
                    const muted = preferences[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          void updatePreference(item.key, !muted);
                        }}
                        className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold active:scale-[0.97] transition-all duration-200 ${
                          muted
                            ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}
                      >
                        {item.label}
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide">
                          {muted ? "Muted" : "On"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="h-9 w-9 rounded-full bg-slate-200 sm:h-10 sm:w-10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-48 rounded bg-slate-200" />
                      <div className="h-2 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                ))
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-400">
                  <Bell className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="mt-1 text-xs">
                    Likes, comments, replies, messages, and reposts will show up here
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = ICON_MAP[notif.type] ?? Bell;
                  const colorClass = COLOR_MAP[notif.type] ?? COLOR_MAP.system;
                  const link = getNotifLink(
                    notif.type,
                    notif.resourceType,
                    notif.resourceId,
                    notif.actorId,
                    commentPostMap
                  );

                  return (
                    <Link
                      key={notif.id}
                      href={link}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 transition hover:bg-slate-50 sm:gap-3 sm:px-6 sm:py-4 ${
                        !notif.read ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      {/* Actor avatar or icon */}
                      <div className="flex-shrink-0">
                        {notif.actor?.avatarUrl ? (
                          <div className="relative">
                            <img
                              src={notif.actor.avatarUrl}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div
                              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${colorClass}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-700 dark:text-slate-200 sm:text-sm">
                          {notif.title}
                          {notif.groupCount && notif.groupCount > 1 && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              x{notif.groupCount}
                            </span>
                          )}
                        </p>
                        {notif.body && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">{notif.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">{timeAgo(notif.createdAt)}</p>
                      </div>

                      {/* Read indicator */}
                      {!notif.read && (
                        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#1E7F43]" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="right" />
        </aside>
      </div>
      <MobileBottomNav />
    </div>
  );
}
