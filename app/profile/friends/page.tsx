"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { useProfileData } from "@/lib/profile/useProfileData";
import { useFriendRequests } from "@/lib/profile/useFriendRequests";
import { Button } from "@/components/ui/button";
import {
  Check,
  Clock,
  Loader2,
  MessageCircle,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ProfileFriendsPage() {
  const { profile, loading: profileLoading } = useProfileData();
  const {
    friends,
    incoming,
    outgoing,
    loading: friendsLoading,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
  } = useFriendRequests();

  const [filter, setFilter] = useState<"friends" | "requests" | "sent">("friends");
  const [searchQuery, setSearchQuery] = useState("");

  const loading = profileLoading || friendsLoading;

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const filters = [
    { id: "friends" as const, label: "Friends", count: friends.length, icon: Users },
    { id: "requests" as const, label: "Requests", count: incoming.length, icon: UserPlus },
    { id: "sent" as const, label: "Sent", count: outgoing.length, icon: Clock },
  ];

  return (
    <ProfileShell
      profile={profile}
      loading={profileLoading}
      activeTab="friends"
      headerRight={
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.id
                  ? "bg-[#1E7F43] text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <f.icon className="h-3 w-3" />
              {f.label}
              {f.count > 0 && (
                <span
                  className={`ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    filter === f.id
                      ? "bg-white/20 text-white"
                      : f.id === "requests" && f.count > 0
                      ? "bg-red-100 text-red-600"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
          <Link
            href="/education/people"
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-[#1E7F43] transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
          >
            <Search className="h-3 w-3" />
            Find People
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : filter === "friends" ? (
        /* ── Friends list ──────────────────────────────── */
        <>
          {/* Search within friends */}
          {friends.length > 3 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          )}

          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Users className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">
                {searchQuery ? "No friends match your search" : "No friends yet"}
              </p>
              <p className="mt-1 text-xs">
                <Link href="/education/people" className="text-[#1E7F43] hover:underline">
                  Discover people
                </Link>{" "}
                to grow your network
              </p>
            </div>
          ) : (
            /* Friends table/grid */
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/60">
                    <th className="px-4 py-3">Friend</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Role</th>
                    <th className="hidden px-4 py-3 md:table-cell">Since</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFriends.map((friend) => (
                    <tr
                      key={friend.id}
                      className="transition hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/profile/${friend.friendId}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt={friend.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{friend.fullName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 hover:text-[#1E7F43] dark:text-slate-100">
                              {friend.fullName}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              @{friend.username || friend.friendId.slice(0, 6)}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          {friend.role}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-400 md:table-cell">
                        {new Date(friend.since).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href="/messages"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-[#1E7F43] hover:text-[#1E7F43] dark:border-slate-700"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unfriend(friend.id)}
                            className="rounded-full text-xs"
                          >
                            <UserMinus className="mr-1 h-3 w-3" />
                            Unfriend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : filter === "requests" ? (
        /* ── Incoming requests ─────────────────────────── */
        incoming.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <UserPlus className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No pending friend requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incoming.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
              >
                <Link href={`/profile/${req.profile.id}`}>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {req.profile.avatarUrl ? (
                      <img src={req.profile.avatarUrl} alt={req.profile.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{req.profile.fullName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${req.profile.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-[#1E7F43] dark:text-slate-100"
                  >
                    {req.profile.fullName}
                  </Link>
                  <p className="text-xs text-slate-400">
                    @{req.profile.username || req.profile.id.slice(0, 6)} wants to be your friend
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptRequest(req.id)}
                    className="rounded-full bg-[#1E7F43] text-xs text-white hover:bg-[#166536]"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineRequest(req.id)}
                    className="rounded-full text-xs"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Sent requests ─────────────────────────────── */
        outgoing.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Clock className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No sent requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
              >
                <Link href={`/profile/${req.profile.id}`}>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {req.profile.avatarUrl ? (
                      <img src={req.profile.avatarUrl} alt={req.profile.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{req.profile.fullName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${req.profile.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-[#1E7F43] dark:text-slate-100"
                  >
                    {req.profile.fullName}
                  </Link>
                  <p className="text-xs text-slate-400">
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    Request pending
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelRequest(req.id)}
                  className="rounded-full text-xs"
                >
                  Cancel Request
                </Button>
              </div>
            ))}
          </div>
        )
      )}
    </ProfileShell>
  );
}
