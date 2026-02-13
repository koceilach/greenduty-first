"use client";

import Link from "next/link";
import { Bookmark, CheckCircle2, Droplet, Globe, Heart, Leaf, MessageCircle, Share2, Sprout } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";

const statusStyles = {
  VERIFIED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
} as const;

const statusLabels = {
  VERIFIED: "AI Verified",
  NEEDS_REVIEW: "Needs Review",
  REJECTED: "Rejected",
} as const;

export function PostCard({
  post,
  liked,
  saved,
  onLike,
  onSave,
}: {
  post: EduFeedPost;
  liked?: boolean;
  saved?: boolean;
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
}) {
  const carouselCount = post.media.assetUrls?.length ?? 0;
  const hasMedia =
    Boolean(post.media.assetUrl) || (post.media.assetUrls && post.media.assetUrls.length > 0);
  const [localLiked, setLocalLiked] = useState(Boolean(liked));
  const [localSaved, setLocalSaved] = useState(Boolean(saved));
  const initialLikeCount = useMemo(() => {
    const n = Number(String(post.stats.likes).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }, [post.stats.likes]);
  const initialSaveCount = useMemo(() => {
    const n = Number(String(post.saves ?? "0").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }, [post.saves]);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentList, setCommentList] = useState<EduFeedPost["comments"]>(post.comments ?? []);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const initialCommentCount = useMemo(() => {
    const numeric = Number(String(post.stats.comments).replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? Math.round(numeric) : 0;
  }, [post.stats.comments]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  useEffect(() => {
    setLocalLiked(Boolean(liked));
  }, [liked]);

  useEffect(() => {
    setLocalSaved(Boolean(saved));
  }, [saved]);

  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  useEffect(() => {
    setSaveCount(initialSaveCount);
  }, [initialSaveCount]);

  useEffect(() => {
    setCommentCount(initialCommentCount);
  }, [initialCommentCount]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const loadComments = useCallback(async (limit = 2) => {
    setCommentLoading(true);
    setCommentError(null);
    const { data: commentRows, error } = await supabase
      .from("edu_comments")
      .select(
        `
          id,
          body,
          created_at,
          user_id
        `
      )
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      setCommentError(error.message);
      setCommentList([]);
      setCommentLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    if (userId !== currentUserId) {
      setCurrentUserId(userId);
    }

    const userIds = Array.from(
      new Set((commentRows ?? []).map((row) => row.user_id).filter(Boolean))
    );
    let creatorsByUser = new Map<string, { name: string; role: string }>();
    if (userIds.length) {
      const { data: creators } = await supabase
        .from("edu_creators")
        .select("user_id,display_name,verified")
        .in("user_id", userIds);
      if (creators) {
        creators.forEach((creator) => {
          if (!creator.user_id) return;
          creatorsByUser.set(creator.user_id, {
            name: creator.display_name ?? "User",
            role: creator.verified ? "Expert" : "User",
          });
        });
      }
    }

    const commentIds = (commentRows ?? []).map((row) => row.id).filter(Boolean);
    const likesByComment = new Map<string, number>();
    const likedByComment = new Set<string>();
    if (commentIds.length) {
      const { data: likeRows } = await supabase
        .from("edu_comment_likes")
        .select("comment_id,user_id")
        .in("comment_id", commentIds);
      (likeRows ?? []).forEach((row) => {
        likesByComment.set(row.comment_id, (likesByComment.get(row.comment_id) ?? 0) + 1);
        if (userId && row.user_id === userId) {
          likedByComment.add(row.comment_id);
        }
      });
    }

    const mapped = (commentRows ?? []).map((row) => {
      const creator = creatorsByUser.get(row.user_id);
      return {
        id: row.id,
        userId: row.user_id,
        author: creator?.name ?? "User",
        role: creator?.role ?? "User",
        body: row.body,
        time: new Date(row.created_at).toLocaleDateString(),
        likeCount: likesByComment.get(row.id) ?? 0,
        liked: likedByComment.has(row.id),
      };
    });
    setCommentList(mapped);
    setCommentLoading(false);
  }, [currentUserId, post.id]);

  useEffect(() => {
    if (post.comments?.length) {
      setCommentList(post.comments);
    }
  }, [post.comments]);

  const toggleComments = async () => {
    const next = !commentsExpanded;
    setCommentsExpanded(next);
    if (next) {
      await loadComments(20);
    }
  };
  const mediaIconMap = {
    image: Sprout,
    video: Droplet,
    carousel: Globe,
    infographic: Leaf,
  };
  const MediaIcon = post.media.icon ?? mediaIconMap[post.media.type] ?? Sprout;

  const handleLike = async () => {
    if (onLike) {
      onLike(post.id);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    if (localLiked) {
      await supabase.from("edu_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("edu_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setLocalLiked((prev) => !prev);
    setLikeCount((prev) => Math.max(0, prev + (localLiked ? -1 : 1)));
  };

  const handleSave = async () => {
    if (onSave) {
      onSave(post.id);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    if (localSaved) {
      await supabase.from("edu_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("edu_saves").insert({ post_id: post.id, user_id: user.id });
    }
    setLocalSaved((prev) => !prev);
    setSaveCount((prev) => Math.max(0, prev + (localSaved ? -1 : 1)));
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/education/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.caption, url: shareUrl });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        return;
      }
      window.prompt("Copy link:", shareUrl);
    } catch {
      window.prompt("Copy link:", shareUrl);
    }
  };

  const handleComment = async () => {
    if (!commentDraft.trim()) return;
    setCommentBusy(true);
    setCommentMessage(null);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setCommentMessage("Sign in to comment.");
      setCommentBusy(false);
      return;
    }
    const { error } = await supabase
      .from("edu_comments")
      .insert({ post_id: post.id, user_id: user.id, body: commentDraft.trim() });
    if (error) {
      setCommentMessage(`Comment failed: ${error.message}`);
      setCommentBusy(false);
      return;
    }
    setCommentDraft("");
    setCommentMessage("Comment posted.");
    setCommentCount((prev) => prev + 1);
    await loadComments(commentsExpanded ? 20 : 2);
    setCommentBusy(false);
  };

  const handleCommentLike = async (commentId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setCommentMessage("Sign in to react.");
      return;
    }
    const target = commentList.find((comment) => comment.id === commentId);
    if (!target) return;
    const isLiked = Boolean(target.liked);
    const { error } = isLiked
      ? await supabase.from("edu_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id)
      : await supabase.from("edu_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    if (error) {
      setCommentMessage(`Reaction failed: ${error.message}`);
      return;
    }
    setCommentList((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              liked: !isLiked,
              likeCount: Math.max(0, (comment.likeCount ?? 0) + (isLiked ? -1 : 1)),
            }
          : comment
      )
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setCommentMessage("Sign in to delete.");
      return;
    }
    const { error } = await supabase.from("edu_comments").delete().eq("id", commentId);
    if (error) {
      setCommentMessage(`Delete failed: ${error.message}`);
      return;
    }
    setCommentList((prev) => prev.filter((comment) => comment.id !== commentId));
    setCommentCount((prev) => Math.max(0, prev - 1));
  };

  const canDeleteComment = (commentUserId?: string) => {
    if (!currentUserId) return false;
    return commentUserId === currentUserId || post.creatorUserId === currentUserId;
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
      {/* Post Header */}
      <div className="flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1E7F43]/10 text-xs font-semibold text-[#1E7F43] sm:h-11 sm:w-11 sm:rounded-2xl sm:text-sm">
            {post.creator.avatarUrl ? (
              <img src={post.creator.avatarUrl} alt={post.creator.name} className="h-full w-full object-cover" />
            ) : (
              post.creator.avatar
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 sm:gap-2 sm:text-sm">
              <span className="truncate">{post.creator.name}</span>
              {post.creator.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1E7F43] sm:h-4 sm:w-4" />}
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{post.creator.handle}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${post.category.badgeClass}`}>
          {post.category.label}
        </span>
      </div>

      {/* Media */}
      <Link
        href={`/education/post/${post.id}`}
        className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br ${post.media.gradientClass}`}
      >
        {post.media.type === "video" && post.media.assetUrl ? (
          <>
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={post.media.assetUrl}
              poster={post.media.posterUrl}
              muted
              loop
              playsInline
              preload="none"
            />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : post.media.type === "carousel" && post.media.assetUrls?.[0] ? (
          <img
            src={post.media.assetUrls[0]}
            alt={post.media.label}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : post.media.assetUrl ? (
          <img
            src={post.media.assetUrl}
            alt={post.media.label}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : null}

        {!hasMedia && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-[#1E7F43] shadow dark:bg-slate-800/80">
              <MediaIcon className="h-6 w-6" />
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{post.media.label}</div>
            <p className="max-w-xs text-sm text-slate-600 dark:text-slate-300">{post.media.description}</p>
          </div>
        )}

        {hasMedia && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between">
            <div className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              {post.media.label}
            </div>
          </div>
        )}

        {post.media.type === "carousel" && carouselCount > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600">
            1/{carouselCount}
          </div>
        )}
        {post.media.type === "video" && (
          <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-600">
            Video
          </div>
        )}
      </Link>

      {/* AI Badge + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:gap-2 sm:px-3 sm:py-1 sm:text-xs ${statusStyles[post.aiReport.status]}`}
          title="Checked for accuracy, sources, and environmental impact"
        >
          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {statusLabels[post.aiReport.status]}
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 sm:gap-3">
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:h-9 sm:w-9 ${
              localLiked ? "text-rose-500" : "hover:text-rose-500"
            } active:scale-110 transition`}
            aria-label="Like"
            onClick={handleLike}
          >
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 sm:h-9 sm:w-9 ${
              commentsExpanded ? "text-[#1E7F43]" : ""
            }`}
            aria-label="Toggle comments"
            onClick={toggleComments}
          >
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:h-9 sm:w-9 ${
              localSaved ? "text-[#1E7F43]" : "hover:text-[#1E7F43]"
            } active:scale-110 transition`}
            aria-label="Save"
            onClick={handleSave}
          >
            <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 sm:h-9 sm:w-9"
            aria-label="Share"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 sm:px-5 sm:pb-4 sm:text-sm">
        <span className="font-semibold text-slate-900 dark:text-slate-100">{post.creator.name}</span>{" "}
        {post.caption}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[#1E7F43] sm:gap-2 sm:text-xs">
          {post.hashtags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Comments panel — only visible when expanded */}
      {commentsExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="px-3 pt-3 pb-2 text-xs text-slate-600 dark:text-slate-300 sm:px-5 sm:pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Comments</span>
              <button
                type="button"
                onClick={toggleComments}
                className="text-[11px] font-semibold text-slate-400 hover:text-[#1E7F43]"
              >
                Hide
              </button>
            </div>
            {commentLoading && <p className="text-[11px] text-slate-400">Loading comments...</p>}
            {!commentLoading && commentError && (
              <p className="text-[11px] text-rose-500">Could not load comments.</p>
            )}
            {!commentLoading && !commentError && commentList.length > 0 && (
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {commentList.map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {comment.author}
                        </span>{" "}
                        {comment.body}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span>{comment.time}</span>
                        <button
                          type="button"
                          className="hover:text-[#1E7F43]"
                          onClick={() => handleCommentLike(comment.id)}
                        >
                          {comment.liked ? "Liked" : "Like"}
                        </button>
                        {comment.likeCount ? <span>{comment.likeCount} likes</span> : null}
                        {canDeleteComment(comment.userId) && (
                          <button
                            type="button"
                            className="hover:text-rose-500"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900"
                      aria-label="React"
                      onClick={() => handleCommentLike(comment.id)}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${
                          comment.liked ? "fill-rose-500 text-rose-500" : "text-slate-300"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!commentLoading && !commentError && commentList.length === 0 && (
              <p className="text-[11px] text-slate-400">Be the first to comment.</p>
            )}
          </div>

          {/* Comment input */}
          <div className="px-3 pb-3 sm:px-5 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:px-4"
                placeholder="Add a comment..."
              />
              <button
                type="button"
                disabled={commentBusy}
                onClick={handleComment}
                className="shrink-0 rounded-full bg-[#1E7F43] px-3 py-2 text-xs font-semibold text-white hover:bg-[#166536] disabled:opacity-60 sm:px-4"
              >
                Post
              </button>
            </div>
            {commentMessage && <p className="mt-2 text-[11px] text-slate-500">{commentMessage}</p>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5 sm:py-3 sm:text-xs">
        <span>{likeCount} likes</span>
        <span>{commentCount} comments</span>
        <span>{saveCount} saves</span>
      </div>

      {/* Sources */}
      <details className="border-t border-slate-100 px-3 py-3 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:px-5 sm:py-4 sm:text-sm">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Sources
        </summary>
        <div className="mt-3 space-y-2">
          {post.sources.map((source) => (
            <div key={source} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{source}</span>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}
