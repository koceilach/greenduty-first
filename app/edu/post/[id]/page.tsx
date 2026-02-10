"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Droplet,
  Globe,
  Heart,
  Leaf,
  MessageCircle,
  Share2,
  Sprout,
  ShieldAlert,
} from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { supabase } from "@/lib/supabase/client";
import { useEduPostDetail } from "@/lib/edu/useEduPostDetail";

const statusStyles = {
  VERIFIED: "bg-emerald-50 text-emerald-700",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700",
  REJECTED: "bg-rose-50 text-rose-700",
} as const;

const statusLabels = {
  VERIFIED: "AI Verified",
  NEEDS_REVIEW: "Needs Review",
  REJECTED: "Rejected",
} as const;

export default function EduPostDetailPage() {
  const params = useParams<{ id?: string }>();
  const postId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const { post, loading, comments, liked, saved, addComment } = useEduPostDetail(postId);
  const [commentDraft, setCommentDraft] = useState("");
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [likedState, setLikedState] = useState(false);
  const [savedState, setSavedState] = useState(false);
  const mediaIconMap = {
    image: Sprout,
    video: Droplet,
    carousel: Globe,
    infographic: Leaf,
  };
  const MediaIcon = post?.media.icon ?? (post ? mediaIconMap[post.media.type] : Sprout);

  useEffect(() => {
    setLikedState(liked);
    setSavedState(saved);
  }, [liked, saved]);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <EduNavbar />
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
              {loading ? "Loading post..." : "Post not found"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {loading
                ? "Please wait while we load the EDU post."
                : "This EDU post is unavailable or still under review."}
            </p>
            <Link
              href="/edu"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to EDU
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/edu"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to EDU
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {post.media.type === "video" && post.media.assetUrl ? (
              <div className="relative">
                <video
                  className="h-[420px] w-full object-cover"
                  src={post.media.assetUrl}
                  poster={post.media.posterUrl}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            ) : post.media.type === "carousel" && post.media.assetUrls?.length ? (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {post.media.assetUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={post.media.label}
                    className="h-52 w-full rounded-2xl object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            ) : post.media.assetUrl ? (
              <img
                src={post.media.assetUrl}
                alt={post.media.label}
                className="h-[420px] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className={`flex min-h-[420px] items-center justify-center bg-gradient-to-br ${post.media.gradientClass}`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-[#1E7F43] shadow">
                    <MediaIcon className="h-7 w-7" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {post.media.label}
                  </div>
                  <p className="max-w-sm text-sm text-slate-600">{post.media.description}</p>
                </div>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-5">
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E7F43]/10 text-sm font-semibold text-[#1E7F43]">
                      {post.creator.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold dark:text-slate-100">
                        {post.creator.name}
                        {post.creator.verified && <CheckCircle2 className="h-4 w-4 text-[#1E7F43]" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{post.creator.handle}</div>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${post.category.badgeClass}`}>
                    {post.category.label}
                  </span>
                </div>

                <div className="mt-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[post.aiReport.status]}`}
                    title="Checked for accuracy, sources, and environmental impact"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {statusLabels[post.aiReport.status]}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4 pt-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{post.creator.name}</span>{" "}
                {post.caption}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#1E7F43]">
                  {post.hashtags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 pb-4 text-slate-500 dark:text-slate-400">
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
                    likedState ? "text-rose-500" : "hover:text-rose-500"
                  }`}
                  aria-label="Like"
                  disabled={likeBusy}
                  onClick={async () => {
                    if (!post) return;
                    setLikeBusy(true);
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData.user;
                    if (user) {
                      if (likedState) {
                        await supabase.from("edu_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
                      } else {
                        await supabase.from("edu_likes").insert({ post_id: post.id, user_id: user.id });
                      }
                      post.stats.likes = String(
                        Math.max(0, (Number(post.stats.likes) || 0) + (likedState ? -1 : 1))
                      );
                      setLikedState(!likedState);
                    }
                    setLikeBusy(false);
                  }}
                >
                  <Heart className="h-4 w-4" />
                </button>
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
                    savedState ? "text-[#1E7F43]" : "hover:text-[#1E7F43]"
                  }`}
                  aria-label="Comment"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900"
                  aria-label="Save"
                  disabled={saveBusy}
                  onClick={async () => {
                    if (!post) return;
                    setSaveBusy(true);
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData.user;
                    if (user) {
                      if (savedState) {
                        await supabase.from("edu_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
                      } else {
                        await supabase.from("edu_saves").insert({ post_id: post.id, user_id: user.id });
                      }
                      post.saves = String(
                        Math.max(0, (Number(post.saves ?? 0) || 0) + (savedState ? -1 : 1))
                      );
                      setSavedState(!savedState);
                    }
                    setSaveBusy(false);
                  }}
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <span className="ml-auto text-xs text-slate-400">{post.stats.likes} likes</span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {comment.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {comment.author} <span className="text-slate-400">• {comment.role}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{comment.body}</p>
                      <span className="mt-1 block text-[10px] text-slate-400">{comment.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Add a comment..."
                  />
                  <button
                    className="rounded-full bg-[#1E7F43] px-4 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      if (!commentDraft.trim()) return;
                      await addComment(commentDraft.trim());
                      setCommentDraft("");
                    }}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>

            <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                AI Verification Report
              </summary>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {statusLabels[post.aiReport.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Accuracy score</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {(post.aiReport.accuracy * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Source credibility</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {(post.aiReport.sourceCredibility * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Greenwashing risk</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {post.aiReport.greenwashingRisk}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Risk flags</p>
                  {post.aiReport.flags.length ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                      {post.aiReport.flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      No risk flags detected
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sources checked</p>
                  <div className="mt-2 space-y-2">
                    {post.aiReport.sources.map((source) => (
                      <div key={source} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4" />
                    Verification note
                  </div>
                  <p className="mt-2">{post.aiReport.notes}</p>
                </div>
              </div>
            </details>
          </aside>
        </div>
      </div>
    </div>
  );
}

