"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  Droplet,
  EyeOff,
  ExternalLink,
  Flag,
  Globe,
  Heart,
  Leaf,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Sprout,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { EduFeedPost } from "@/lib/edu/feed";
import { trackEduInteraction } from "@/lib/edu/interactions";

const statusStyles = {
  VERIFIED: "bg-emerald-100 text-emerald-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
  REJECTED: "bg-rose-100 text-rose-700",
} as const;

const statusLabels = {
  VERIFIED: "AI Verified",
  NEEDS_REVIEW: "Needs Review",
  REJECTED: "Rejected",
} as const;

const touch =
  "transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]";
const hiddenPostsStorageKey = "gd.education.hidden_posts";
let cachedEduViewerUserId: string | null | undefined;
let pendingEduViewerUserIdPromise: Promise<string | null> | null = null;

const resolveEduViewerUserId = async (): Promise<string | null> => {
  if (typeof cachedEduViewerUserId !== "undefined") {
    return cachedEduViewerUserId;
  }
  if (pendingEduViewerUserIdPromise) {
    return pendingEduViewerUserIdPromise;
  }

  pendingEduViewerUserIdPromise = supabase.auth
    .getUser()
    .then(({ data }) => {
      cachedEduViewerUserId = data.user?.id ?? null;
      return cachedEduViewerUserId;
    })
    .catch(() => {
      cachedEduViewerUserId = null;
      return null;
    })
    .finally(() => {
      pendingEduViewerUserIdPromise = null;
    });

  return pendingEduViewerUserIdPromise;
};

type ThreadComment = {
  id: string;
  userId: string;
  author: string;
  role: string;
  body: string;
  time: string;
  createdAt: string;
  parentCommentId: string | null;
  likeCount: number;
  liked: boolean;
  replies: ThreadComment[];
};

const countThreadComments = (comments: ThreadComment[]): number =>
  comments.reduce((total, comment) => total + 1 + countThreadComments(comment.replies), 0);

const formatCommentTime = (iso: string) => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

const updateThreadComment = (
  comments: ThreadComment[],
  commentId: string,
  updater: (comment: ThreadComment) => ThreadComment
): ThreadComment[] =>
  comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }
    if (comment.replies.length) {
      return {
        ...comment,
        replies: updateThreadComment(comment.replies, commentId, updater),
      };
    }
    return comment;
  });

const findThreadComment = (
  comments: ThreadComment[],
  commentId: string
): ThreadComment | null => {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    if (comment.replies.length) {
      const nested = findThreadComment(comment.replies, commentId);
      if (nested) return nested;
    }
  }
  return null;
};

const removeThreadComment = (comments: ThreadComment[], commentId: string): ThreadComment[] =>
  comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeThreadComment(comment.replies, commentId),
    }));

const fromSeedComments = (comments: EduFeedPost["comments"]): ThreadComment[] =>
  comments.map((comment) => ({
    id: comment.id,
    userId: comment.userId ?? "",
    author: comment.author,
    role: comment.role,
    body: comment.body,
    time: comment.time,
    createdAt: new Date().toISOString(),
    parentCommentId: null,
    likeCount: comment.likeCount ?? 0,
    liked: Boolean(comment.liked),
    replies: [],
  }));

export function PostCard({
  post,
  liked,
  saved,
  onLike,
  onSave,
  initialCommentsOpen = false,
  focusCommentId = null,
  initialSourcesOpen = false,
}: {
  post: EduFeedPost;
  liked?: boolean;
  saved?: boolean;
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
  initialCommentsOpen?: boolean;
  focusCommentId?: string | null;
  initialSourcesOpen?: boolean;
}) {
  const router = useRouter();
  const carouselCount = post.media.assetUrls?.length ?? 0;
  const hasMedia =
    Boolean(post.media.assetUrl) ||
    (post.media.assetUrls && post.media.assetUrls.length > 0);
  const hasResource = Boolean(post.media.resourceUrl);
  const cardRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mediaClickTimeoutRef = useRef<number | null>(null);
  const actionResetTimeoutRef = useRef<number | null>(null);
  const viewStartedAtRef = useRef<number | null>(null);
  const initialCommentOpenHandledRef = useRef(false);
  const initialCommentFocusHandledRef = useRef(false);

  const [localLiked, setLocalLiked] = useState(Boolean(liked));
  const [localSaved, setLocalSaved] = useState(Boolean(saved));
  const [postCaption, setPostCaption] = useState(post.caption);

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
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyForId, setActiveReplyForId] = useState<string | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [busyReplyForId, setBusyReplyForId] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(initialCommentsOpen);
  const [commentTree, setCommentTree] = useState<ThreadComment[]>(
    fromSeedComments(post.comments ?? [])
  );
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editDraft, setEditDraft] = useState(post.caption);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [activeAction, setActiveAction] = useState<"like" | "comment" | "save" | "share" | null>(null);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [postHidden, setPostHidden] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [postDeleted, setPostDeleted] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(initialSourcesOpen);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(
    focusCommentId
  );

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
    initialCommentOpenHandledRef.current = false;
    initialCommentFocusHandledRef.current = false;
  }, [post.id]);

  useEffect(() => {
    setSourcesExpanded(initialSourcesOpen);
  }, [initialSourcesOpen, post.id]);

  useEffect(() => {
    setHighlightedCommentId(focusCommentId ?? null);
    initialCommentFocusHandledRef.current = false;
  }, [focusCommentId, post.id]);

  useEffect(() => {
    let active = true;
    resolveEduViewerUserId().then((userId) => {
      if (!active) return;
      setCurrentUserId(userId);
    });
    return () => {
      active = false;
    };
  }, []);

  const getViewerId = useCallback(async () => {
    if (currentUserId) return currentUserId;
    const resolved = await resolveEduViewerUserId();
    if (resolved) {
      setCurrentUserId(resolved);
    }
    return resolved;
  }, [currentUserId]);

  useEffect(() => {
    setPostCaption(post.caption);
    setEditDraft(post.caption);
  }, [post.caption]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(hiddenPostsStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.includes(post.id)) {
        setPostHidden(true);
      }
    } catch {
      window.localStorage.removeItem(hiddenPostsStorageKey);
    }
  }, [post.id]);

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
    return () => {
      if (mediaClickTimeoutRef.current) {
        window.clearTimeout(mediaClickTimeoutRef.current);
      }
      if (actionResetTimeoutRef.current) {
        window.clearTimeout(actionResetTimeoutRef.current);
      }
    };
  }, []);

  const flushTrackedView = useCallback(
    async (reason: "hidden" | "unmount" | "removed") => {
      const startedAt = viewStartedAtRef.current;
      if (!startedAt) return;
      viewStartedAtRef.current = null;

      const seconds = (Date.now() - startedAt) / 1000;
      if (!Number.isFinite(seconds) || seconds < 1) return;

      await trackEduInteraction({
        interactionType: "view",
        postId: post.id,
        watchTimeSeconds: Number(seconds.toFixed(2)),
        metadata: { source: "post_card", reason },
      });
    },
    [post.id]
  );

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        if (visible) {
          if (!viewStartedAtRef.current) {
            viewStartedAtRef.current = Date.now();
          }
          return;
        }
        void flushTrackedView("hidden");
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      void flushTrackedView("unmount");
    };
  }, [flushTrackedView]);

  useEffect(() => {
    if (!postDeleted && !postHidden) return;
    void flushTrackedView("removed");
  }, [flushTrackedView, postDeleted, postHidden]);

  const isPostOwner = Boolean(
    currentUserId && post.creatorUserId && currentUserId === post.creatorUserId
  );

  const loadComments = useCallback(
    async (limit = 2) => {
      setCommentLoading(true);
      setCommentError(null);

      const [{ count: totalCount }, { data: userData }] = await Promise.all([
        supabase
          .from("edu_comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", post.id),
        supabase.auth.getUser(),
      ]);

      if (typeof totalCount === "number") {
        setCommentCount(totalCount);
      }

      const userId = userData.user?.id ?? null;
      if (userId !== currentUserId) {
        setCurrentUserId(userId);
      }

      const { data: commentRows, error } = await supabase
        .from("edu_comments")
        .select(
          `
          id,
          body,
          created_at,
          user_id,
          parent_comment_id
        `
        )
        .eq("post_id", post.id)
        .order("created_at", { ascending: true })
        .limit(Math.max(60, limit * 8));

      if (error) {
        setCommentError(error.message);
        setCommentTree([]);
        setCommentLoading(false);
        return;
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
          likesByComment.set(
            row.comment_id,
            (likesByComment.get(row.comment_id) ?? 0) + 1
          );
          if (userId && row.user_id === userId) {
            likedByComment.add(row.comment_id);
          }
        });
      }

      const byId = new Map<string, ThreadComment>();
      for (const row of commentRows ?? []) {
        const creator = creatorsByUser.get(row.user_id);
        byId.set(row.id, {
          id: row.id,
          userId: row.user_id,
          author: creator?.name ?? "User",
          role: creator?.role ?? "User",
          body: row.body,
          time: formatCommentTime(row.created_at),
          createdAt: row.created_at,
          parentCommentId: row.parent_comment_id ?? null,
          likeCount: likesByComment.get(row.id) ?? 0,
          liked: likedByComment.has(row.id),
          replies: [],
        });
      }

      const roots: ThreadComment[] = [];
      for (const row of commentRows ?? []) {
        const current = byId.get(row.id);
        if (!current) continue;
        if (current.parentCommentId && byId.has(current.parentCommentId)) {
          byId.get(current.parentCommentId)!.replies.push(current);
        } else {
          roots.push(current);
        }
      }

      const sortNested = (list: ThreadComment[]) => {
        list.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        list.forEach((item) => sortNested(item.replies));
      };
      sortNested(roots);
      roots.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const limited = limit > 0 ? roots.slice(0, limit) : roots;
      setCommentTree(limited);
      setCommentLoading(false);
    },
    [currentUserId, post.id]
  );

  useEffect(() => {
    if (!initialCommentsOpen) return;
    if (initialCommentOpenHandledRef.current) return;
    initialCommentOpenHandledRef.current = true;
    setCommentsExpanded(true);
    void loadComments(20);
  }, [initialCommentsOpen, loadComments]);

  useEffect(() => {
    setCommentTree(fromSeedComments(post.comments ?? []));
  }, [post.comments]);

  const toggleComments = async () => {
    pulseAction("comment");
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
    resource: Globe,
  };
  const MediaIcon = post.media.icon ?? mediaIconMap[post.media.type] ?? Sprout;

  const handleLike = async () => {
    pulseAction("like");
    if (onLike) {
      onLike(post.id);
      return;
    }
    const viewerId = await getViewerId();
    if (!viewerId) return;

    if (localLiked) {
      await supabase
        .from("edu_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", viewerId);
    } else {
      await supabase
        .from("edu_likes")
        .insert({ post_id: post.id, user_id: viewerId });
    }

    setLocalLiked((prev) => !prev);
    setLikeCount((prev) => Math.max(0, prev + (localLiked ? -1 : 1)));
  };

  const handleSave = async () => {
    pulseAction("save");
    if (onSave) {
      onSave(post.id);
      return;
    }
    const viewerId = await getViewerId();
    if (!viewerId) return;

    if (localSaved) {
      await supabase
        .from("edu_saves")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", viewerId);
    } else {
      await supabase
        .from("edu_saves")
        .insert({ post_id: post.id, user_id: viewerId });
    }

    setLocalSaved((prev) => !prev);
    setSaveCount((prev) => Math.max(0, prev + (localSaved ? -1 : 1)));
  };

  const handleShare = async () => {
    pulseAction("share");
    const trackShare = async (method: "native" | "clipboard" | "prompt") => {
      await trackEduInteraction({
        interactionType: "share",
        postId: post.id,
        metadata: { source: "post_card", method },
      });
    };

    const notifyStoryRepost = async () => {
      const viewerId = await getViewerId();
      if (!viewerId || !post.creatorUserId || viewerId === post.creatorUserId) return;

      const { error } = await supabase
        .from("edu_story_reposts")
        .insert({ post_id: post.id, user_id: viewerId });

      if (error && !error.message.toLowerCase().includes("duplicate")) {
        console.warn("Story repost notification failed:", error.message);
      }
    };

    const shareUrl = `${window.location.origin}/education/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.caption, url: shareUrl });
        await notifyStoryRepost();
        await trackShare("native");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        await notifyStoryRepost();
        await trackShare("clipboard");
        return;
      }
      await notifyStoryRepost();
      await trackShare("prompt");
      window.prompt("Copy link:", shareUrl);
    } catch {
      await trackShare("prompt");
      window.prompt("Copy link:", shareUrl);
    }
  };

  const handleDeletePost = async () => {
    if (!isPostOwner || deletingPost) return;

    const shouldDelete = window.confirm(
      "Delete this post permanently? This action cannot be undone."
    );
    if (!shouldDelete) return;

    setDeletingPost(true);

    const { error } = await supabase
      .from("edu_posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", currentUserId as string);

    if (error) {
      const message = `Delete failed: ${error.message}`;
      setCommentMessage(message);
      window.alert(message);
      setDeletingPost(false);
      return;
    }

    setPostDeleted(true);
    setDeletingPost(false);
  };

  const pulseAction = (action: "like" | "comment" | "save" | "share") => {
    setActiveAction(action);
    if (actionResetTimeoutRef.current) {
      window.clearTimeout(actionResetTimeoutRef.current);
    }
    actionResetTimeoutRef.current = window.setTimeout(() => {
      setActiveAction(null);
    }, 260);
  };

  const triggerLikeBurst = () => {
    setShowLikeBurst(true);
    window.setTimeout(() => setShowLikeBurst(false), 620);
  };

  const handleLikeFromGesture = async () => {
    triggerLikeBurst();
    if (!localLiked) {
      await handleLike();
    }
  };

  const handleMediaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (mediaClickTimeoutRef.current) return;

    mediaClickTimeoutRef.current = window.setTimeout(() => {
      router.push(`/education/post/${post.id}`);
      mediaClickTimeoutRef.current = null;
    }, 210);
  };

  const handleMediaDoubleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (mediaClickTimeoutRef.current) {
      window.clearTimeout(mediaClickTimeoutRef.current);
      mediaClickTimeoutRef.current = null;
    }
    void handleLikeFromGesture();
  };

  const persistHiddenPostId = (postId: string) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(hiddenPostsStorageKey);
      const current = raw ? (JSON.parse(raw) as string[]) : [];
      const next = Array.from(new Set([...(Array.isArray(current) ? current : []), postId]));
      window.localStorage.setItem(hiddenPostsStorageKey, JSON.stringify(next));
    } catch {
      window.localStorage.setItem(hiddenPostsStorageKey, JSON.stringify([postId]));
    }
  };

  const handleHidePost = () => {
    persistHiddenPostId(post.id);
    setPostHidden(true);
    setMenuOpen(false);
  };

  const handleReportPost = async () => {
    setMenuOpen(false);
    const viewerId = await getViewerId();
    if (!viewerId) {
      setCommentMessage("Sign in to report this post.");
      return;
    }

    const reason = window.prompt("Why are you reporting this post?", "Inappropriate content");
    if (reason === null) return;

    const { error } = await supabase.from("edu_post_reports").insert({
      post_id: post.id,
      reporter_id: viewerId,
      reason: reason.trim() || "Reported by user",
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("edu_post_reports_post_id_reporter_id_key")
      ) {
        setCommentMessage("You already reported this post.");
        return;
      }
      if (normalized.includes("edu_post_reports")) {
        setCommentMessage("Reporting is not configured yet.");
        return;
      }
      setCommentMessage(`Report failed: ${error.message}`);
      return;
    }

    setCommentMessage("Report sent.");
  };

  const handleEditPost = () => {
    setMenuOpen(false);
    setEditingPost(true);
  };

  const handleSaveEditedPost = async () => {
    if (!isPostOwner || !currentUserId || updatingPost) return;
    const nextBody = editDraft.trim();
    if (!nextBody.length) {
      setCommentMessage("Post text cannot be empty.");
      return;
    }

    setUpdatingPost(true);
    const { error } = await supabase
      .from("edu_posts")
      .update({ body: nextBody })
      .eq("id", post.id)
      .eq("user_id", currentUserId);

    if (error) {
      setCommentMessage(`Update failed: ${error.message}`);
      setUpdatingPost(false);
      return;
    }

    setPostCaption(nextBody);
    setEditingPost(false);
    setUpdatingPost(false);
    setCommentMessage("Post updated.");
  };

  const handleComment = async (parentCommentId: string | null = null) => {
    const draft = parentCommentId ? replyDrafts[parentCommentId] ?? "" : commentDraft;
    if (!draft.trim()) return;

    setCommentBusy(true);
    setBusyReplyForId(parentCommentId);
    setCommentMessage(null);

    const viewerId = await getViewerId();
    if (!viewerId) {
      setCommentMessage("Sign in to comment.");
      setBusyReplyForId(null);
      setCommentBusy(false);
      return;
    }

    const { error } = await supabase
      .from("edu_comments")
      .insert({
        post_id: post.id,
        user_id: viewerId,
        body: draft.trim(),
        parent_comment_id: parentCommentId,
      });

    if (error) {
      setCommentMessage(`Comment failed: ${error.message}`);
      setBusyReplyForId(null);
      setCommentBusy(false);
      return;
    }

    if (parentCommentId) {
      setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
      setActiveReplyForId(null);
      setCommentMessage("Reply posted.");
    } else {
      setCommentDraft("");
      setCommentMessage("Comment posted.");
    }

    await loadComments(commentsExpanded ? 20 : 2);
    setBusyReplyForId(null);
    setCommentBusy(false);
  };

  const handleCommentLike = async (commentId: string) => {
    const viewerId = await getViewerId();
    if (!viewerId) {
      setCommentMessage("Sign in to react.");
      return;
    }

    const target = findThreadComment(commentTree, commentId);
    if (!target) return;

    const isLiked = Boolean(target.liked);
    const { error } = isLiked
      ? await supabase
          .from("edu_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", viewerId)
      : await supabase
          .from("edu_comment_likes")
          .insert({ comment_id: commentId, user_id: viewerId });

    if (error) {
      setCommentMessage(`Reaction failed: ${error.message}`);
      return;
    }

    setCommentTree((prev) =>
      updateThreadComment(prev, commentId, (comment) => ({
        ...comment,
        liked: !isLiked,
        likeCount: Math.max(0, (comment.likeCount ?? 0) + (isLiked ? -1 : 1)),
      }))
    );
  };

  const handleReplyDraftChange = (commentId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: value,
    }));
  };

  const toggleReplyInput = (commentId: string) => {
    setActiveReplyForId((prev) => (prev === commentId ? null : commentId));
  };

  const renderComment = (comment: ThreadComment, depth = 0) => {
    const isReplyOpen = activeReplyForId === comment.id;
    const replyDraft = replyDrafts[comment.id] ?? "";
    const isReplyBusy = commentBusy && busyReplyForId === comment.id;
    const canDelete = canDeleteComment(comment.userId);
    const isFocusedComment = highlightedCommentId === comment.id;

    return (
      <div
        key={comment.id}
        id={`edu-comment-${comment.id}`}
        className={`${depth > 0 ? "ml-4 border-l border-gray-200 pl-3" : ""} ${
          isFocusedComment
            ? "scroll-mt-24 rounded-xl ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-slate-100"
            : ""
        }`}
      >
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{comment.author}</span> {comment.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>{comment.time}</span>
            <button
              type="button"
              className={touch}
              onClick={() => handleCommentLike(comment.id)}
            >
              {comment.liked ? "Liked" : "Like"}
            </button>
            <button
              type="button"
              className={touch}
              onClick={() => toggleReplyInput(comment.id)}
            >
              Reply
            </button>
            {comment.likeCount ? <span>{comment.likeCount} likes</span> : null}
            {canDelete && (
              <button
                type="button"
                className={`text-rose-500 ${touch}`}
                onClick={() => handleDeleteComment(comment.id)}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {isReplyOpen && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={replyDraft}
              onChange={(event) => handleReplyDraftChange(comment.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleComment(comment.id);
                }
              }}
              className="h-10 flex-1 rounded-xl border border-gray-100 bg-white px-4 text-sm text-slate-700 outline-none"
              placeholder={`Reply to ${comment.author}...`}
            />
            <button
              type="button"
              disabled={isReplyBusy}
              onClick={() => handleComment(comment.id)}
              className={`h-10 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white disabled:opacity-60 ${touch}`}
            >
              Reply
            </button>
          </div>
        )}

        {comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    const viewerId = await getViewerId();
    if (!viewerId) {
      setCommentMessage("Sign in to delete.");
      return;
    }

    const removed = findThreadComment(commentTree, commentId);
    const removedCount = removed ? countThreadComments([removed]) : 1;

    const { error } = await supabase.from("edu_comments").delete().eq("id", commentId);

    if (error) {
      setCommentMessage(`Delete failed: ${error.message}`);
      return;
    }

    setCommentTree((prev) => removeThreadComment(prev, commentId));
    setCommentCount((prev) => Math.max(0, prev - removedCount));
  };

  const canDeleteComment = (commentUserId?: string) => {
    if (!currentUserId) return false;
    return commentUserId === currentUserId || post.creatorUserId === currentUserId;
  };

  const threadCommentCount = useMemo(
    () => countThreadComments(commentTree),
    [commentTree]
  );

  useEffect(() => {
    if (!commentsExpanded || !focusCommentId) return;
    if (commentLoading) return;

    const element = document.getElementById(`edu-comment-${focusCommentId}`);
    if (!element) {
      if (!commentLoading) {
        void loadComments(20);
      }
      return;
    }

    if (initialCommentFocusHandledRef.current) return;
    initialCommentFocusHandledRef.current = true;
    setHighlightedCommentId(focusCommentId);

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => {
      setHighlightedCommentId((current) =>
        current === focusCommentId ? null : current
      );
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [commentLoading, commentsExpanded, focusCommentId, loadComments, threadCommentCount]);

  useEffect(() => {
    if (!commentsExpanded) return;
    if (threadCommentCount > 0) return;
    void loadComments(20);
  }, [commentsExpanded, loadComments, threadCommentCount]);

  useEffect(() => {
    if (!commentsExpanded) return;
    const realtime = supabase
      .channel(`edu-post-comments-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edu_comments",
          filter: `post_id=eq.${post.id}`,
        },
        () => {
          void loadComments(20);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtime);
    };
  }, [commentsExpanded, loadComments, post.id]);

  if (postDeleted || postHidden) {
    return null;
  }

  return (
    <article
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
            {post.creator.avatarUrl ? (
              <img src={post.creator.avatarUrl} alt={post.creator.name} className="h-full w-full object-cover" />
            ) : (
              post.creator.avatar
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900">{post.creator.name}</span>
              {post.creator.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </div>
            <p className="truncate text-xs text-slate-500">{post.creator.handle}</p>
          </div>
        </div>

        <div ref={menuRef} className="relative flex items-center gap-2">
          <span
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold max-[380px]:hidden ${post.category.badgeClass}`}
          >
            {post.category.label}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-600 ring-1 ring-gray-100 ${touch}`}
            aria-label="Open post options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 min-w-[170px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_24px_-12px_rgba(15,23,42,0.2)]">
              {isPostOwner ? (
                <>
                  <button
                    type="button"
                    onClick={handleEditPost}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modify post
                  </button>
                  <button
                    type="button"
                    disabled={deletingPost}
                    onClick={() => {
                      void handleDeletePost();
                      setMenuOpen(false);
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 ${touch}`}
                  >
                    {deletingPost ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete post
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void handleReportPost();
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report post
                  </button>
                  <button
                    type="button"
                    onClick={handleHidePost}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 ${touch}`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide this post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-slate-100">
        {hasResource && !hasMedia ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <ExternalLink className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{post.media.label}</p>
            <p className="max-w-sm text-sm text-slate-500">{post.media.description}</p>
            <a
              href={post.media.resourceUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white ${touch}`}
            >
              Open Resource
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <Link
            href={`/education/post/${post.id}`}
            onClick={handleMediaClick}
            onDoubleClick={handleMediaDoubleClick}
            className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${post.media.gradientClass} ${touch}`}
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
                <div className="absolute inset-0 bg-black/20" />
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
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600">
                  <MediaIcon className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{post.media.label}</p>
                <p className="max-w-xs text-sm text-slate-500">{post.media.description}</p>
              </div>
            )}

            {hasMedia && (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between">
                <div className="rounded-lg bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {post.media.label}
                </div>
              </div>
            )}

            {post.media.type === "carousel" && carouselCount > 0 && (
              <div className="absolute right-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                1/{carouselCount}
              </div>
            )}

            {showLikeBurst && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                <div className="relative grid h-28 w-28 place-items-center">
                  <span className="absolute h-24 w-24 rounded-full bg-rose-500/45 blur-2xl animate-ping" />
                  <span className="absolute h-20 w-20 rounded-full bg-rose-400/40 blur-xl" />
                  <Heart className="relative h-20 w-20 fill-current text-rose-500 [stroke-width:0] drop-shadow-[0_14px_24px_rgba(244,63,94,0.55)] animate-[bounce_0.55s_ease-out_1]" />
                </div>
              </div>
            )}
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${statusStyles[post.aiReport.status]}`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {statusLabels[post.aiReport.status]}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-slate-600 ring-1 ring-gray-100 transition-all duration-300 ${touch} ${
              localLiked ? "text-rose-500" : ""
            } ${activeAction === "like" ? "scale-110 -translate-y-0.5 bg-rose-50 shadow-[0_10px_20px_-12px_rgba(244,63,94,0.7)]" : ""
            }`}
            aria-label="Like"
            onClick={() => {
              void handleLike();
            }}
          >
            <Heart className={`h-4 w-4 ${localLiked ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-slate-600 ring-1 ring-gray-100 transition-all duration-300 ${touch} ${
              commentsExpanded ? "text-emerald-600" : ""
            } ${activeAction === "comment" ? "scale-110 -translate-y-0.5 bg-emerald-50 shadow-[0_10px_20px_-12px_rgba(16,185,129,0.65)]" : ""
            }`}
            aria-label="Toggle comments"
            onClick={() => {
              void toggleComments();
            }}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-slate-600 ring-1 ring-gray-100 transition-all duration-300 ${touch} ${
              localSaved ? "text-emerald-600" : ""
            } ${activeAction === "save" ? "scale-110 -translate-y-0.5 bg-emerald-50 shadow-[0_10px_20px_-12px_rgba(16,185,129,0.65)]" : ""
            }`}
            aria-label="Save"
            onClick={() => {
              void handleSave();
            }}
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-slate-600 ring-1 ring-gray-100 transition-all duration-300 ${touch} ${
              activeAction === "share" ? "scale-110 -translate-y-0.5 bg-sky-50 text-sky-600 shadow-[0_10px_20px_-12px_rgba(14,165,233,0.7)]" : ""
            }`}
            aria-label="Share"
            onClick={() => {
              void handleShare();
            }}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-900">{post.creator.name}</span> {postCaption}
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-emerald-600">
          {post.hashtags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      {editingPost && isPostOwner && (
        <div className="mt-3 rounded-xl bg-slate-100 p-3 sm:p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Modify post
          </p>
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Update your post text..."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={updatingPost}
              onClick={() => {
                void handleSaveEditedPost();
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white disabled:opacity-60 ${touch}`}
            >
              {updatingPost && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </button>
            <button
              type="button"
              disabled={updatingPost}
              onClick={() => {
                setEditingPost(false);
                setEditDraft(postCaption);
              }}
              className={`inline-flex h-10 items-center rounded-xl bg-white px-4 text-xs font-semibold text-slate-600 ring-1 ring-gray-100 ${touch}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {commentsExpanded && (
        <div id={`edu-post-comments-${post.id}`} className="mt-4 rounded-xl bg-slate-100 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Comments</span>
            <button
              type="button"
              onClick={toggleComments}
              className={`rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-gray-100 ${touch}`}
            >
              Hide
            </button>
          </div>

          {commentLoading && <p className="text-xs text-slate-500">Loading comments...</p>}
          {!commentLoading && commentError && (
            <p className="text-xs text-rose-500">Could not load comments.</p>
          )}

          {!commentLoading && !commentError && commentTree.length > 0 && (
            <div className="max-h-[50dvh] space-y-3 overflow-y-auto pr-1 scrollbar-none">
              {commentTree.map((comment) => renderComment(comment))}
            </div>
          )}

          {!commentLoading && !commentError && commentTree.length === 0 && (
            <p className="text-xs text-slate-500">Be the first to comment.</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleComment();
                }
              }}
              className="h-11 flex-1 rounded-xl border border-gray-100 bg-white px-4 text-sm text-slate-700 outline-none"
              placeholder="Add a comment..."
            />
            <button
              type="button"
              disabled={commentBusy}
              onClick={() => {
                void handleComment();
              }}
              className={`h-11 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white disabled:opacity-60 ${touch}`}
            >
              Post
            </button>
          </div>
          {commentMessage && <p className="mt-2 text-xs text-slate-500">{commentMessage}</p>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
        <span>{likeCount} likes</span>
        <span>{commentCount} comments</span>
        <span>{saveCount} saves</span>
      </div>

      <details
        id={`edu-sources-${post.id}`}
        open={sourcesExpanded}
        onToggle={(event) =>
          setSourcesExpanded((event.currentTarget as HTMLDetailsElement).open)
        }
        className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600"
      >
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Sources
        </summary>
        <div className="mt-3 space-y-2">
          {post.sources.length ? (
            post.sources.map((source) => (
              <div key={source} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-sm">{source}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              No source links were attached to this post.
            </p>
          )}
        </div>
      </details>
    </article>
  );
}
