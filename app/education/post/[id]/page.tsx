"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { PostCard } from "@/components/edu/PostCard";
import { useEduPostDetail } from "@/lib/edu/useEduPostDetail";

export default function EducationPostDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const focusCommentId = searchParams.get("comment");
  const initialSourcesOpen =
    searchParams.get("sources") === "1" ||
    searchParams.get("panel") === "sources";
  const { post, comments, loading } = useEduPostDetail(postId);

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />

      <main className="mx-auto grid w-full max-w-[1160px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link
              href="/education"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-[0.97] transition-transform duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to feed
            </Link>
            {focusCommentId && (
              <span className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-100 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <MessageCircle className="h-3.5 w-3.5" />
                Focused Comment
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid min-h-[50vh] place-items-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                Loading post...
              </div>
            </div>
          ) : post ? (
            <PostCard
              post={{
                ...post,
                comments,
              }}
              initialCommentsOpen={Boolean(focusCommentId)}
              focusCommentId={focusCommentId}
              initialSourcesOpen={initialSourcesOpen}
            />
          ) : (
            <div className="rounded-[2rem] bg-white p-8 text-center text-sm text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              This post does not exist or is no longer public.
            </div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <section className="rounded-[2rem] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Source Panel
              </p>
              <div className="mt-3 space-y-2">
                {post?.sources?.length ? (
                  post.sources.map((source) => (
                    <div key={source} className="flex items-start gap-2 rounded-2xl bg-slate-100 p-2.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="text-xs text-slate-700">{source}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-100 p-3 text-xs text-slate-500">
                    This post has no attached sources.
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>
      </main>

      <MobileBottomNav />
    </div>
  );
}
