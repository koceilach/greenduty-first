"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { useNotifications } from "@/lib/notifications/useNotifications";
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  UserPlus,
  AlertCircle,
  AtSign,
} from "lucide-react";
import Link from "next/link";

const ICON_MAP: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  message: MessageCircle,
  mention: AtSign,
  system: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
  like: "bg-pink-50 text-pink-500 dark:bg-pink-900/20 dark:text-pink-400",
  comment: "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400",
  follow: "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400",
  message: "bg-purple-50 text-purple-500 dark:bg-purple-900/20 dark:text-purple-400",
  mention: "bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400",
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

function getNotifLink(type: string, resourceType: string | null, resourceId: string | null) {
  if (type === "message" && resourceId) return `/messages/${resourceId}`;
  if (type === "follow") return `/profile`;
  if (resourceType === "post" && resourceId) return `/education/post/${resourceId}`;
  if (resourceType === "conversation" && resourceId) return `/messages/${resourceId}`;
  return "#";
}

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications();

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 pb-24 pt-4 sm:gap-6 sm:px-6 sm:pt-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="left" />
        </aside>

        {/* Main */}
        <main>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
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

            {/* List */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 sm:h-10 sm:w-10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-2 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-slate-400">
                  <Bell className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="mt-1 text-xs">
                    When someone likes, comments, or follows you, it will show up here
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = ICON_MAP[notif.type] ?? Bell;
                  const colorClass = COLOR_MAP[notif.type] ?? COLOR_MAP.system;
                  const link = getNotifLink(notif.type, notif.resourceType, notif.resourceId);

                  return (
                    <Link
                      key={notif.id}
                      href={link}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:gap-3 sm:px-6 sm:py-4 ${
                        !notif.read ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""
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
                          {notif.actor?.fullName && (
                            <span className="font-semibold">{notif.actor.fullName} </span>
                          )}
                          {notif.title}
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
      <div className="h-20 lg:hidden" />
      <MobileBottomNav />
    </div>
  );
}
