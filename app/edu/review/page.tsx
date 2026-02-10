"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { supabase } from "@/lib/supabase/client";

type ReviewPost = {
  id: string;
  title: string;
  body: string | null;
  media_type: string;
  created_at: string;
  edu_creators: {
    display_name: string;
  } | null;
  edu_ai_verifications: {
    status: string | null;
    notes: string | null;
    sources: string[] | null;
  } | null;
};

export default function EduReviewPage() {
  const [role, setRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<ReviewPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (mounted) setRole(profile?.role ?? "user");

      const { data } = await supabase
        .from("edu_posts")
        .select(
          `
            id,
            title,
            body,
            media_type,
            created_at,
            edu_creators:creator_id (
              display_name
            ),
            edu_ai_verifications:edu_ai_verifications (
              status,
              notes,
              sources
            )
          `
        )
        .in("status", ["needs_review", "rejected"])
        .order("created_at", { ascending: false });

      if (mounted) {
        setPosts((data as ReviewPost[]) ?? []);
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const updateStatus = async (postId: string, status: "verified" | "rejected") => {
    setActionMessage(null);
    setActionTone(null);

    if (!role || !["admin", "expert"].includes(role)) {
      setActionMessage("You need admin/expert access to approve posts.");
      setActionTone("error");
      return;
    }

    const { error: postError } = await supabase.from("edu_posts").update({ status }).eq("id", postId);
    if (postError) {
      setActionMessage(`Approval failed: ${postError.message}`);
      setActionTone("error");
      return;
    }

    const { error: aiError } = await supabase
      .from("edu_ai_verifications")
      .update({
        status,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("post_id", postId);

    if (aiError) {
      setActionMessage(`AI verification update failed: ${aiError.message}`);
      setActionTone("error");
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setActionMessage(status === "verified" ? "Post approved." : "Post rejected.");
    setActionTone("success");
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">EDU Review Queue</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review AI-flagged posts before they hit the feed.
            </p>
          </div>
          <Link
            href="/edu"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            Back to EDU
          </Link>
        </div>

        {role && !["admin", "expert"].includes(role) && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            You do not have permission to review posts.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {actionMessage && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                actionTone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {actionMessage}
            </div>
          )}
          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading review queue...
            </div>
          )}
          {!loading && !posts.length && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No posts awaiting review.
            </div>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{post.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {post.edu_creators?.display_name ?? "Unknown creator"} - {post.media_type}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  {post.edu_ai_verifications?.status ?? "needs_review"}
                </div>
              </div>
              {post.body && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{post.body}</p>}
              {post.edu_ai_verifications?.notes && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  AI notes: {post.edu_ai_verifications.notes}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                  onClick={() => updateStatus(post.id, "verified")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white"
                  onClick={() => updateStatus(post.id, "rejected")}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
