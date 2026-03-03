"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { PostCard } from "@/components/edu/PostCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { GD_findOrCreateDirectConversation } from "@/lib/messages/direct-conversation";
import {
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Play,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EduFeedPost } from "@/lib/edu/feed";
import { useFriendRequests } from "@/lib/profile/useFriendRequests";

const firstOf = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

type PublicProfile = {
  id: string;
  fullName: string;
  username: string;
  bio: string;
  location: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: string;
  postCount: number;
  reelCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

type PublicProfilePostRow = {
  id: string;
  title: string;
  body: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  created_at: string;
  edu_categories: { name: string | null } | { name: string | null }[] | null;
};

type PublicProfileReelRow = {
  id: string;
  caption: string | null;
  video_url: string;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
};

type PublicProfileReel = {
  id: string;
  caption: string;
  videoUrl: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
};

const formatCompactCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<EduFeedPost[]>([]);
  const [reels, setReels] = useState<PublicProfileReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);

  const {
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    getRelationship,
    getRequestId,
    getFriendshipId,
    loading: friendsLoading,
  } = useFriendRequests();

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const myId = userData.user?.id ?? null;
      setCurrentUserId(myId);

      // If viewing own profile, redirect
      if (myId === userId) {
        router.replace("/profile");
        return;
      }

      const [
        { data: profileRow },
        { count: followerCount },
        { count: followingCount },
        { data: postRows },
        { data: reelRows },
      ] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, username, bio, avatar_url, cover_url, location, role")
            .eq("id", userId)
            .single(),
          supabase.from("profile_follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
          supabase.from("profile_follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
          supabase
            .from("edu_posts")
            .select(
              `id, title, body, media_type, media_urls, status, created_at, edu_categories:category_id (name)`
            )
            .eq("user_id", userId)
            .eq("status", "published")
            .order("created_at", { ascending: false }),
          supabase
            .from("edu_reels")
            .select("id, caption, video_url, likes_count, comments_count, created_at")
            .eq("author_id", userId)
            .order("created_at", { ascending: false }),
        ]);

      if (!profileRow) {
        setLoading(false);
        return;
      }

      // Check if current user follows this user
      let isFollowing = false;
      if (myId) {
        const { count } = await supabase
          .from("profile_follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", myId)
          .eq("following_id", userId);
        isFollowing = (count ?? 0) > 0;
      }

      setProfile({
        id: profileRow.id,
        fullName: profileRow.full_name ?? "Unknown",
        username: profileRow.username ?? "",
        bio: profileRow.bio ?? "",
        location: profileRow.location ?? null,
        avatarUrl: profileRow.avatar_url ?? null,
        coverUrl: profileRow.cover_url ?? null,
        role: profileRow.role ?? "User",
        postCount: postRows?.length ?? 0,
        reelCount: reelRows?.length ?? 0,
        followerCount: followerCount ?? 0,
        followingCount: followingCount ?? 0,
        isFollowing,
      });

      // Map posts
      const displayName = profileRow.full_name ?? "User";
      const handle = profileRow.username ? `@${profileRow.username}` : "@user";
      const roleLabel = profileRow.role?.toLowerCase().includes("expert") ? "Expert" : "User";
      const avatar = displayName.slice(0, 2).toUpperCase();

      const mapped: EduFeedPost[] = ((postRows ?? []) as PublicProfilePostRow[]).map((row) => {
        const catName = firstOf(row.edu_categories as any)?.name ?? "Agronomy";
        return {
          id: row.id,
          creatorUserId: userId,
          creator: { name: displayName, handle, avatar, avatarUrl: profileRow.avatar_url, verified: roleLabel === "Expert", role: roleLabel as "User" | "Expert" },
          category: { label: catName as any, badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
          media: {
            type: (row.media_type?.toLowerCase() as any) ?? "image",
            label: row.media_type ?? "Image",
            description: row.title,
            gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent",
            assetUrl: row.media_urls?.[0] ?? undefined,
            assetUrls: row.media_type === "carousel" ? row.media_urls ?? undefined : undefined,
          },
          caption: row.body ?? row.title,
          explanation: row.body ?? row.title,
          hashtags: [],
          sources: [],
          stats: { likes: "0", comments: "0" },
          saves: "0",
          aiReport: { status: "VERIFIED", accuracy: 0.95, sourceCredibility: 0.9, greenwashingRisk: "Low", flags: [], notes: "", verifiedAt: new Date().toISOString(), sources: [] },
          comments: [],
        };
      });

      const mappedReels: PublicProfileReel[] = ((reelRows ?? []) as PublicProfileReelRow[]).map((row) => ({
        id: row.id,
        caption: row.caption ?? "",
        videoUrl: row.video_url,
        likesCount: row.likes_count ?? 0,
        commentsCount: row.comments_count ?? 0,
        createdAt: row.created_at,
      }));

      setPosts(mapped);
      setReels(mappedReels);
      setLoading(false);
    };

    load();
  }, [userId, router]);

  const handleFollow = async () => {
    if (!currentUserId || !profile) return;
    await supabase.from("profile_follows").insert({ follower_id: currentUserId, following_id: userId });
    setProfile((p) => p ? { ...p, isFollowing: true, followerCount: p.followerCount + 1 } : p);
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !profile) return;
    await supabase.from("profile_follows").delete().eq("follower_id", currentUserId).eq("following_id", userId);
    setProfile((p) => p ? { ...p, isFollowing: false, followerCount: Math.max(0, p.followerCount - 1) } : p);
  };

  const handleOpenChat = async () => {
    if (!currentUserId || openingChat) return;
    setOpeningChat(true);

    const result = await GD_findOrCreateDirectConversation(
      supabase,
      currentUserId,
      userId
    );

    setOpeningChat(false);
    if (!result.conversationId) {
      router.push("/messages");
      return;
    }

    router.push(`/messages/${result.conversationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] dark:bg-slate-950">
        <EduNavbar />
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
          <EduSidebar side="left" />
          <main className="min-w-0">
            <div className="flex items-center justify-center py-32">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] dark:bg-slate-950">
        <EduNavbar />
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
          <EduSidebar side="left" />
          <main className="min-w-0">
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <p className="text-lg font-medium">User not found</p>
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const avatarFallback = profile.fullName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
        <EduSidebar side="left" />

        <main className="min-w-0">
          <div className="mx-auto max-w-4xl px-0 pb-0 pt-2 sm:px-2 lg:px-4">
            {/* Profile header */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-emerald-200 via-emerald-50 to-white dark:from-emerald-900/30 dark:via-slate-900 dark:to-slate-950">
                  {profile.coverUrl && <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />}
                </div>
                <div className="absolute -bottom-12 left-8">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 text-xl font-semibold text-emerald-700 shadow-lg dark:border-slate-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{avatarFallback}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-16">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      {profile.fullName}
                      {profile.role.toLowerCase().includes("expert") && (
                        <CheckCircle2 className="h-4 w-4 text-[#1E7F43]" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">@{profile.username}</p>
                    {profile.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.bio && (
                      <p className="mt-3 max-w-lg text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>
                    )}
                  </div>

                    <div className="flex items-center gap-3">
                    <div className="flex gap-4 text-center text-sm">
                      <div>
                        <div className="font-bold">{profile.postCount}</div>
                        <div className="text-xs text-slate-400">Posts</div>
                      </div>
                      <div>
                        <div className="font-bold">{profile.reelCount}</div>
                        <div className="text-xs text-slate-400">Reels</div>
                      </div>
                      <div>
                        <div className="font-bold">{profile.followerCount}</div>
                        <div className="text-xs text-slate-400">Followers</div>
                      </div>
                      <div>
                        <div className="font-bold">{profile.followingCount}</div>
                        <div className="text-xs text-slate-400">Following</div>
                      </div>
                    </div>

                    {currentUserId && (
                      <div className="flex flex-wrap gap-2">
                        {/* Follow / Unfollow */}
                        {profile.isFollowing ? (
                          <Button onClick={handleUnfollow} variant="outline" size="sm" className="rounded-full text-xs">
                            <UserMinus className="mr-1 h-3.5 w-3.5" />
                            Unfollow
                          </Button>
                        ) : (
                          <Button onClick={handleFollow} size="sm" className="rounded-full bg-[#1E7F43] text-xs text-white hover:bg-[#166536]">
                            <UserPlus className="mr-1 h-3.5 w-3.5" />
                            Follow
                          </Button>
                        )}

                        {/* Friend request actions */}
                        {(() => {
                          const rel = getRelationship(userId);
                          const reqId = getRequestId(userId);
                          const fId = getFriendshipId(userId);

                          if (rel === "friends" && fId) {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unfriend(fId)}
                                className="rounded-full text-xs text-emerald-600"
                              >
                                <UserCheck className="mr-1 h-3.5 w-3.5" />
                                Friends
                              </Button>
                            );
                          }
                          if (rel === "sent" && reqId) {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelRequest(reqId)}
                                className="rounded-full text-xs"
                              >
                                <Clock className="mr-1 h-3.5 w-3.5" />
                                Request Sent
                              </Button>
                            );
                          }
                          if (rel === "received" && reqId) {
                            return (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acceptRequest(reqId)}
                                  className="rounded-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                >
                                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => declineRequest(reqId)}
                                  className="rounded-full text-xs"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            );
                          }
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendRequest(userId)}
                              className="rounded-full text-xs"
                            >
                              <UserPlus className="mr-1 h-3.5 w-3.5" />
                              Add Friend
                            </Button>
                          );
                        })()}

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={handleOpenChat}
                          disabled={openingChat}
                        >
                          {openingChat ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          Message
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Posts */}
            <section className="mt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Posts</h3>
              {posts.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Reels</h3>
              {reels.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm">No reels yet</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {reels.map((reel) => (
                    <Link
                      key={reel.id}
                      href={`/education/reels?reel=${reel.id}`}
                      className="block overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="grid gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="relative h-[300px] bg-black sm:h-full">
                          <video
                            src={reel.videoUrl}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                          <div className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </div>
                        </div>
                        <div className="p-4 sm:p-5">
                          <p className="line-clamp-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                            {reel.caption || "Untitled reel"}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              <Heart className="h-3.5 w-3.5" />
                              {formatCompactCount(reel.likesCount)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {formatCompactCount(reel.commentsCount)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              {formatShortDate(reel.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
