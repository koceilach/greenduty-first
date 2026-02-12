"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useFriendRequests } from "@/lib/profile/useFriendRequests";
import type { FriendRequestStatus } from "@/lib/profile/useFriendRequests";
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
import { useCallback, useEffect, useState } from "react";

/* ── types ─────────────────────────────────────────────────── */

type DiscoverProfile = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  bio: string;
  location: string | null;
};

/* ── main page ─────────────────────────────────────────────── */

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<DiscoverProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggested, setSuggested] = useState<DiscoverProfile[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [tab, setTab] = useState<"discover" | "requests">("discover");

  const {
    currentUserId,
    loading: friendsLoading,
    incoming,
    outgoing,
    friends,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    getRelationship,
    getRequestId,
    getFriendshipId,
  } = useFriendRequests();

  /* ── load suggested users on mount ───────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setLoadingSuggested(false);
        return;
      }

      const { data: rows } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, role, bio, location")
        .neq("id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      const mapped: DiscoverProfile[] = (rows ?? []).map((r) => ({
        id: r.id,
        fullName: r.full_name ?? "User",
        username: r.username ?? "",
        avatarUrl: r.avatar_url ?? null,
        role: r.role ?? "User",
        bio: (r as any).bio ?? "",
        location: (r as any).location ?? null,
      }));

      setSuggested(mapped);
      setLoadingSuggested(false);
    };
    load();
  }, []);

  /* ── search users ────────────────────────────────────── */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setPeople([]);
      return;
    }
    setSearching(true);

    const { data: rows } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, role, bio, location")
      .or(`full_name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`)
      .neq("id", currentUserId ?? "")
      .limit(30);

    const mapped: DiscoverProfile[] = (rows ?? []).map((r) => ({
      id: r.id,
      fullName: r.full_name ?? "User",
      username: r.username ?? "",
      avatarUrl: r.avatar_url ?? null,
      role: r.role ?? "User",
      bio: (r as any).bio ?? "",
      location: (r as any).location ?? null,
    }));

    setPeople(mapped);
    setSearching(false);
  }, [query, currentUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const displayList = query.trim() ? people : suggested;
  const isLoading = query.trim() ? searching : loadingSuggested;

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="left" />
        </aside>

        <main>
          {/* Tabs */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setTab("discover")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === "discover"
                  ? "bg-[#1E7F43] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <Users className="mr-2 inline h-4 w-4" />
              Discover People
            </button>
            <button
              onClick={() => setTab("requests")}
              className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === "requests"
                  ? "bg-[#1E7F43] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <UserPlus className="mr-2 inline h-4 w-4" />
              Friend Requests
              {incoming.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {incoming.length}
                </span>
              )}
            </button>
          </div>

          {tab === "discover" ? (
            <>
              {/* Search */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search people by name or username..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setPeople([]);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-[#1E7F43] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#166536]"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Heading */}
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                {query.trim()
                  ? `Search results (${people.length})`
                  : "Suggested People"}
              </h2>

              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : displayList.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                  <Users className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">
                    {query.trim() ? "No users found" : "No suggestions available"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayList.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      relationship={getRelationship(person.id)}
                      requestId={getRequestId(person.id)}
                      friendshipId={getFriendshipId(person.id)}
                      onSendRequest={sendRequest}
                      onCancelRequest={cancelRequest}
                      onAcceptRequest={acceptRequest}
                      onDeclineRequest={declineRequest}
                      onUnfriend={unfriend}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Requests tab ──────────────────────────────── */
            <>
              {/* Incoming */}
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                Incoming Requests ({incoming.length})
              </h2>
              {friendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              ) : incoming.length === 0 ? (
                <p className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  No pending friend requests
                </p>
              ) : (
                <div className="mb-8 space-y-2">
                  {incoming.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <Link href={`/profile/${req.profile.id}`}>
                        <Avatar name={req.profile.fullName} url={req.profile.avatarUrl} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${req.profile.id}`}
                          className="text-sm font-semibold hover:text-[#1E7F43]"
                        >
                          {req.profile.fullName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          @{req.profile.username || req.profile.id.slice(0, 6)}
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
              )}

              {/* Outgoing */}
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                Sent Requests ({outgoing.length})
              </h2>
              {outgoing.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  No pending sent requests
                </p>
              ) : (
                <div className="space-y-2">
                  {outgoing.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <Link href={`/profile/${req.profile.id}`}>
                        <Avatar name={req.profile.fullName} url={req.profile.avatarUrl} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${req.profile.id}`}
                          className="text-sm font-semibold hover:text-[#1E7F43]"
                        >
                          {req.profile.fullName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          @{req.profile.username || req.profile.id.slice(0, 6)} ·{" "}
                          <Clock className="mr-0.5 inline h-3 w-3" />
                          Pending
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelRequest(req.id)}
                        className="rounded-full text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block">
          <EduSidebar side="right" />
        </aside>
      </div>
    </div>
  );
}

/* ── Avatar helper ─────────────────────────────────────────── */

function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm";
  return (
    <div
      className={`flex ${dim} items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

/* ── Person card with dynamic action button ────────────────── */

function PersonCard({
  person,
  relationship,
  requestId,
  friendshipId,
  onSendRequest,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onUnfriend,
}: {
  person: DiscoverProfile;
  relationship: FriendRequestStatus;
  requestId: string | null;
  friendshipId: string | null;
  onSendRequest: (id: string) => Promise<void>;
  onCancelRequest: (id: string) => Promise<void>;
  onAcceptRequest: (id: string) => Promise<void>;
  onDeclineRequest: (id: string) => Promise<void>;
  onUnfriend: (id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);

  const doAction = async (fn: (id: string) => Promise<void>, id: string) => {
    setActing(true);
    await fn(id);
    setActing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/profile/${person.id}`} className="flex-shrink-0">
        <Avatar name={person.fullName} url={person.avatarUrl} />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${person.id}`}
          className="block truncate text-sm font-semibold text-slate-900 hover:text-[#1E7F43] dark:text-slate-100"
        >
          {person.fullName}
        </Link>
        <p className="truncate text-xs text-slate-400">
          @{person.username || person.id.slice(0, 6)}
          {person.location && ` · ${person.location}`}
        </p>
        {person.bio && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
            {person.bio}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 gap-1.5">
        {/* Message */}
        <Link
          href="/messages"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-[#1E7F43] hover:text-[#1E7F43] dark:border-slate-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Link>

        {/* Friend action */}
        {relationship === "none" && (
          <Button
            size="sm"
            disabled={acting}
            onClick={() => doAction(onSendRequest, person.id)}
            className="rounded-full bg-[#1E7F43] text-xs text-white hover:bg-[#166536]"
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1 h-3.5 w-3.5" />}
            Add Friend
          </Button>
        )}

        {relationship === "sent" && requestId && (
          <Button
            size="sm"
            variant="outline"
            disabled={acting}
            onClick={() => doAction(onCancelRequest, requestId)}
            className="rounded-full text-xs"
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="mr-1 h-3.5 w-3.5" />}
            Pending
          </Button>
        )}

        {relationship === "received" && requestId && (
          <div className="flex gap-1">
            <Button
              size="sm"
              disabled={acting}
              onClick={() => doAction(onAcceptRequest, requestId)}
              className="rounded-full bg-[#1E7F43] text-xs text-white hover:bg-[#166536]"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={acting}
              onClick={() => doAction(onDeclineRequest, requestId)}
              className="rounded-full text-xs"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {relationship === "friends" && friendshipId && (
          <Button
            size="sm"
            variant="outline"
            disabled={acting}
            onClick={() => doAction(onUnfriend, friendshipId)}
            className="rounded-full text-xs text-emerald-600"
          >
            {acting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserCheck className="mr-1 h-3.5 w-3.5" />
            )}
            Friends
          </Button>
        )}
      </div>
    </div>
  );
}
