"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { ChatList } from "@/components/messages/ChatList";
import { OnlineFriends } from "@/components/messages/OnlineFriends";
import { useConversations } from "@/lib/messages/useConversations";
import { usePresence } from "@/lib/messages/usePresence";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  const { conversations, loading, currentUserId } = useConversations();
  usePresence(); // keeps user online

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main – Conversation list */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <MessageCircle className="h-5 w-5 text-[#1E7F43]" />
              <h1 className="text-lg font-semibold">Messages</h1>
            </div>

            <ChatList
              conversations={conversations}
              loading={loading}
              currentUserId={currentUserId}
            />
          </div>

          {/* Right sidebar – Online friends */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <OnlineFriends currentUserId={currentUserId} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
