"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  EyeOff,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedReel } from "@/lib/edu/social-feed";

type ReelFeedCardProps = {
  reel: EduFeedReel;
  currentUserId: string | null;
  canFollow?: boolean;
  followBusy?: boolean;
  onFollow?: (authorId: string) => Promise<unknown> | void;
  onHide?: (reelId: string) => void;
  onDelete?: (reelId: string) => void;
};

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type ReelCommentRow = {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ReelCommentItem = {
  id: string;
  reelId: string;
  userId: string;
  body: string;
  createdAt: string;
  author: {
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
};

const touch =
  "transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:scale-[0.98]";

const formatCommentTime = (iso: string) => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

export function ReelFeedCard({
  reel,
  currentUserId,
  canFollow = false,
  followBusy = false,
  onFollow,
  onHide,
  onDelete,
}: ReelFeedCardProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const commentsCloseTimerRef = useRef<number | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(reel.caption);
  const [localCaption, setLocalCaption] = useState(reel.caption);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localHidden, setLocalHidden] = useState(false);
  const [localDeleted, setLocalDeleted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likesCount);
  const [commentCount, setCommentCount] = useState(reel.commentsCount);
  const [liking, setLiking] = useState(false);

  const [commentsSheetMounted, setCommentsSheetMounted] = useState(false);
  const [commentsSheetOpen, setCommentsSheetOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<ReelCommentItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<ProfileRow | null>(null);
  const [clientMounted, setClientMounted] = useState(false);

  const isOwner = Boolean(currentUserId && currentUserId === reel.authorId);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  useEffect(() => {
    setEditDraft(reel.caption);
    setLocalCaption(reel.caption);
    setLikeCount(reel.likesCount);
    setCommentCount(reel.commentsCount);
  }, [reel.caption, reel.commentsCount, reel.likesCount]);

  useEffect(() => {
    if (!currentUserId) {
      setIsLiked(false);
      setViewerProfile(null);
      return;
    }

    let active = true;

    const loadViewer = async () => {
      const [{ data: likedRows }, { data: profileRow }] = await Promise.all([
        supabase
          .from("edu_reel_likes")
          .select("reel_id")
          .eq("reel_id", reel.id)
          .eq("user_id", currentUserId)
          .limit(1),
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .eq("id", currentUserId)
          .maybeSingle(),
      ]);

      if (!active) return;
      setIsLiked(Boolean((likedRows ?? []).length));
      setViewerProfile((profileRow as ProfileRow | null) ?? null);
    };

    void loadViewer();

    return () => {
      active = false;
    };
  }, [currentUserId, reel.id]);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const closeCommentsSheet = useCallback(() => {
    setCommentsSheetOpen(false);

    if (commentsCloseTimerRef.current) {
      window.clearTimeout(commentsCloseTimerRef.current);
    }

    commentsCloseTimerRef.current = window.setTimeout(() => {
      setCommentsSheetMounted(false);
      commentsCloseTimerRef.current = null;
    }, 260);
  }, []);

  useEffect(() => {
    if (!commentsSheetMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [commentsSheetMounted]);

  useEffect(() => {
    return () => {
      if (commentsCloseTimerRef.current) {
        window.clearTimeout(commentsCloseTimerRef.current);
      }
    };
  }, []);

  const handleFollow = useCallback(async () => {
    if (!onFollow) return;
    await onFollow(reel.authorId);
  }, [onFollow, reel.authorId]);

  const handleHide = useCallback(() => {
    setMenuOpen(false);
    if (onHide) {
      onHide(reel.id);
      return;
    }
    setLocalHidden(true);
  }, [onHide, reel.id]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);

    const { data: rows, error } = await supabase
      .from("edu_reel_comments")
      .select("id, reel_id, user_id, body, created_at")
      .eq("reel_id", reel.id)
      .order("created_at", { ascending: true })
      .limit(120);

    if (error) {
      setCommentsLoading(false);
      setNotice("Could not load comments.");
      return;
    }

    const commentRows = (rows ?? []) as ReelCommentRow[];
    const userIds = Array.from(
      new Set(commentRows.map((row) => row.user_id).filter(Boolean))
    );
    let profilesMap = new Map<string, ProfileRow>();

    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      profilesMap = new Map(
        ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
      );
    }

    const mapped: ReelCommentItem[] = commentRows.map((row) => {
      const profile = profilesMap.get(row.user_id);
      const fullName = profile?.full_name?.trim() || "GreenDuty User";
      const username =
        profile?.username?.trim() || fullName.toLowerCase().replace(/\s+/g, ".");

      return {
        id: row.id,
        reelId: row.reel_id,
        userId: row.user_id,
        body: row.body,
        createdAt: row.created_at,
        author: {
          fullName,
          username,
          avatarUrl: profile?.avatar_url ?? null,
        },
      };
    });

    setComments(mapped);
    setCommentCount(mapped.length);
    setCommentsLoading(false);
  }, [reel.id]);

  const handleToggleComments = useCallback(async () => {
    if (commentsSheetMounted && commentsSheetOpen) {
      closeCommentsSheet();
      return;
    }

    if (commentsCloseTimerRef.current) {
      window.clearTimeout(commentsCloseTimerRef.current);
      commentsCloseTimerRef.current = null;
    }

    setCommentsSheetMounted(true);
    window.requestAnimationFrame(() => {
      setCommentsSheetOpen(true);
    });

    await loadComments();
  }, [closeCommentsSheet, commentsSheetMounted, commentsSheetOpen, loadComments]);

  const handleSubmitComment = useCallback(async () => {
    const body = commentDraft.trim();
    if (!body.length) return;

    if (!currentUserId) {
      setNotice("Sign in to comment on reels.");
      return;
    }

    setSendingComment(true);
    const { data: insertedRow, error } = await supabase
      .from("edu_reel_comments")
      .insert({
        reel_id: reel.id,
        user_id: currentUserId,
        body,
      })
      .select("id, reel_id, user_id, body, created_at")
      .single();

    if (error || !insertedRow) {
      setSendingComment(false);
      setNotice(error?.message ?? "Could not post comment.");
      return;
    }

    const fullName =
      viewerProfile?.full_name?.trim() ||
      viewerProfile?.username?.trim() ||
      "You";
    const username =
      viewerProfile?.username?.trim() ||
      fullName.toLowerCase().replace(/\s+/g, ".");

    const mapped: ReelCommentItem = {
      id: insertedRow.id,
      reelId: insertedRow.reel_id,
      userId: insertedRow.user_id,
      body: insertedRow.body,
      createdAt: insertedRow.created_at,
      author: {
        fullName,
        username,
        avatarUrl: viewerProfile?.avatar_url ?? null,
      },
    };

    setComments((prev) => [...prev, mapped]);
    setCommentCount((prev) => prev + 1);
    setCommentDraft("");
    setSendingComment(false);

    setCommentsSheetMounted(true);
    window.requestAnimationFrame(() => {
      setCommentsSheetOpen(true);
    });
  }, [commentDraft, currentUserId, reel.id, viewerProfile]);

  const handleToggleLike = useCallback(async () => {
    if (liking) return;

    if (!currentUserId) {
      setNotice("Sign in to like reels.");
      return;
    }

    const wasLiked = isLiked;
    const nextLiked = !wasLiked;

    setLiking(true);
    setIsLiked(nextLiked);
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    const request = nextLiked
      ? supabase.from("edu_reel_likes").insert({
          reel_id: reel.id,
          user_id: currentUserId,
        })
      : supabase
          .from("edu_reel_likes")
          .delete()
          .eq("reel_id", reel.id)
          .eq("user_id", currentUserId);

    const { error } = await request;
    setLiking(false);

    if (!error) return;

    const normalized = error.message.toLowerCase();
    if (
      nextLiked &&
      (normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("unique"))
    ) {
      return;
    }

    setIsLiked(wasLiked);
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
    setNotice(`Like update failed: ${error.message}`);
  }, [currentUserId, isLiked, liking, reel.id]);

  const handleReport = useCallback(async () => {
    setMenuOpen(false);
    if (!currentUserId) {
      setNotice("Sign in to report reels.");
      return;
    }

    const reason = window.prompt("Why are you reporting this reel?", "Inappropriate content");
    if (reason === null) return;

    const { error } = await supabase.from("edu_reel_reports").insert({
      reel_id: reel.id,
      reporter_id: currentUserId,
      reason: reason.trim() || "Reported by user",
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("unique")
      ) {
        setNotice("You already reported this reel.");
        return;
      }
      if (normalized.includes("edu_reel_reports") || normalized.includes("does not exist")) {
        setNotice("Reporting is not available yet.");
        return;
      }
      setNotice(`Report failed: ${error.message}`);
      return;
    }

    setNotice("Report sent.");
  }, [currentUserId, reel.id]);

  const handleSaveEdit = useCallback(async () => {
    if (!isOwner || !currentUserId || savingEdit) return;

    const nextCaption = editDraft.trim();
    if (!nextCaption.length) {
      setNotice("Caption cannot be empty.");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("edu_reels")
      .update({ caption: nextCaption })
      .eq("id", reel.id)
      .eq("author_id", currentUserId);

    setSavingEdit(false);

    if (error) {
      setNotice(`Update failed: ${error.message}`);
      return;
    }

    setLocalCaption(nextCaption);
    setEditing(false);
    setNotice("Reel updated.");
  }, [currentUserId, editDraft, isOwner, reel.id, savingEdit]);

  const handleDelete = useCallback(async () => {
    if (!isOwner || !currentUserId || deleting) return;

    const shouldDelete = window.confirm(
      "Delete this reel permanently? This action cannot be undone."
    );
    if (!shouldDelete) return;

    setDeleting(true);
    const { error } = await supabase
      .from("edu_reels")
      .delete()
      .eq("id", reel.id)
      .eq("author_id", currentUserId);

    setDeleting(false);

    if (error) {
      setNotice(`Delete failed: ${error.message}`);
      return;
    }

    setMenuOpen(false);
    if (onDelete) {
      onDelete(reel.id);
    } else {
      setLocalDeleted(true);
    }
  }, [currentUserId, deleting, isOwner, onDelete, reel.id]);

  if (localHidden || localDeleted) {
    return null;
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
            {reel.author.avatarUrl ? (
              <img
                src={reel.author.avatarUrl}
                alt={reel.author.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              reel.author.fullName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900">
                {reel.author.fullName}
              </span>
              {reel.author.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </div>
            <p className="truncate text-xs text-slate-500">@{reel.author.username}</p>
          </div>
          {canFollow && onFollow && (
            <button
              type="button"
              onClick={() => {
                void handleFollow();
              }}
              disabled={followBusy}
              className={`inline-flex h-10 items-center rounded-full bg-emerald-500 px-4 text-xs font-semibold text-white disabled:opacity-60 ${touch}`}
            >
              {followBusy ? "Following..." : "Follow"}
            </button>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600 ring-1 ring-gray-100 ${touch}`}
            aria-label="Open reel options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 min-w-[170px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_24px_-12px_rgba(15,23,42,0.2)]">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit reel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      void handleDelete();
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 ${touch}`}
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete reel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void handleReport();
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report reel
                  </button>
                  <button
                    type="button"
                    onClick={handleHide}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide reel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {editing && isOwner && (
        <div className="mt-3 rounded-xl bg-slate-100 p-3 sm:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Edit reel
          </p>
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Update your reel caption..."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => {
                void handleSaveEdit();
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white disabled:opacity-60 ${touch}`}
            >
              {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </button>
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => {
                setEditing(false);
                setEditDraft(localCaption);
              }}
              className={`inline-flex h-10 items-center rounded-xl bg-white px-4 text-xs font-semibold text-slate-600 ring-1 ring-gray-100 ${touch}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Link
        href={`/education/reels?reel=${reel.id}`}
        className={`group relative mt-4 block overflow-hidden rounded-2xl bg-slate-100 ${touch}`}
      >
        <video
          src={reel.videoUrl}
          className="h-full max-h-[640px] w-full bg-black object-cover"
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
          <span className="truncate pr-2">Tap to watch in Reels</span>
          <PlayCircle className="h-4 w-4 shrink-0" />
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <p className="line-clamp-3 min-w-0 text-sm leading-relaxed text-slate-700">
          {localCaption}
        </p>
        <Link
          href={`/education/reels?reel=${reel.id}`}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white ${touch}`}
        >
          <PlayCircle className="h-4 w-4" />
          Open reel
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleToggleLike();
            }}
            disabled={liking}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold ring-1 ring-slate-200 transition ${
              isLiked ? "bg-rose-50 text-rose-600" : "bg-white text-slate-600"
            } disabled:opacity-60`}
          >
            {liking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
            )}
            Like
          </button>

          <button
            type="button"
            onClick={() => {
              void handleToggleComments();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Comment
          </button>
        </div>

        <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
          {likeCount} likes | {commentCount} comments
        </div>
      </div>

      {clientMounted &&
        commentsSheetMounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[90] transition-opacity duration-300 ${
              commentsSheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

            <section
              className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-3xl bg-white shadow-[0_-24px_50px_-22px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out ${
                commentsSheetOpen ? "translate-y-0" : "translate-y-full"
              }`}
              aria-label="Reel comments"
            >
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300" />

              <div className="flex items-center justify-between px-4 pb-3 pt-2 sm:px-5">
                <p className="text-sm font-semibold text-slate-900">Comments</p>
                <button
                  type="button"
                  onClick={closeCommentsSheet}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                  aria-label="Close comments"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[52dvh] min-h-[30dvh] space-y-4 overflow-y-auto px-4 pb-4 sm:px-5">
                {commentsLoading ? (
                  <div className="grid place-items-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : comments.length ? (
                  comments.map((comment) => (
                    <article key={comment.id} className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                        {comment.author.avatarUrl ? (
                          <img
                            src={comment.author.avatarUrl}
                            alt={comment.author.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          comment.author.fullName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-slate-800">
                          <span className="mr-1 font-semibold text-slate-900">
                            {comment.author.username}
                          </span>
                          {comment.body}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {formatCommentTime(comment.createdAt)}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No comments yet. Start the conversation.
                  </p>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5 pl-3">
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSubmitComment();
                      }
                    }}
                    className="h-10 flex-1 bg-transparent text-sm text-slate-700 outline-none"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleSubmitComment();
                    }}
                    disabled={sendingComment || !commentDraft.trim().length}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white disabled:opacity-60"
                    aria-label="Send comment"
                  >
                    {sendingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}

      {notice && <p className="mt-3 text-xs text-slate-500">{notice}</p>}
    </article>
  );
}
