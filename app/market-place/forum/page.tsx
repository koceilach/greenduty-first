import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ForumSubmitButton } from "./submit-button";

const GD_FORUM_PATH = "/market-place/forum";
const GD_FORUM_LOGIN_PATH = `/market-place/login?redirect=${encodeURIComponent(
  GD_FORUM_PATH
)}`;
const GD_FORUM_CATEGORIES = [
  "General",
  "Seeds",
  "Livestock",
  "Fertilizers",
  "Weather",
  "Pests",
  "Irrigation",
] as const;

type ForumProfile = {
  id: string;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
};

type ForumComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type ForumPost = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  forum_comments: ForumComment[] | null;
};

const GD_displayName = (profile: ForumProfile | null, userId: string) => {
  if (profile?.store_name && profile.store_name.trim()) return profile.store_name;
  if (profile?.username && profile.username.trim()) return profile.username;
  return `Grower ${userId.slice(0, 6)}`;
};

const GD_initials = (label: string) => {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const GD_formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const GD_normalizeCategory = (raw: string) => {
  const candidate = raw.trim();
  if (!candidate) return "General";
  return GD_FORUM_CATEGORIES.includes(candidate as (typeof GD_FORUM_CATEGORIES)[number])
    ? candidate
    : "General";
};

const GD_isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function createForumPostAction(formData: FormData) {
  "use server";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(GD_FORUM_LOGIN_PATH);
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = GD_normalizeCategory(String(formData.get("category") ?? ""));

  if (title.length < 3 || body.length < 3) {
    revalidatePath(GD_FORUM_PATH);
    return;
  }

  await supabase.from("forum_posts").insert([
    {
      user_id: user.id,
      title: title.slice(0, 160),
      body: body.slice(0, 5000),
      category,
    },
  ]);

  revalidatePath(GD_FORUM_PATH);
}

export async function createForumCommentAction(formData: FormData) {
  "use server";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(GD_FORUM_LOGIN_PATH);
  }

  const postId = String(formData.get("post_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!GD_isUuid(postId) || body.length < 1) {
    revalidatePath(GD_FORUM_PATH);
    return;
  }

  await supabase.from("forum_comments").insert([
    {
      post_id: postId,
      user_id: user.id,
      body: body.slice(0, 2000),
    },
  ]);

  revalidatePath(GD_FORUM_PATH);
}

export async function deleteForumPostAction(formData: FormData) {
  "use server";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(GD_FORUM_LOGIN_PATH);
  }

  const postId = String(formData.get("post_id") ?? "").trim();
  if (!GD_isUuid(postId)) {
    revalidatePath(GD_FORUM_PATH);
    return;
  }

  await supabase.from("forum_posts").delete().eq("id", postId);
  revalidatePath(GD_FORUM_PATH);
}

export const dynamic = "force-dynamic";

export default async function MarketplaceForumPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawPosts, error: postsError } = await supabase
    .from("forum_posts")
    .select(
      "id, user_id, title, body, category, created_at, updated_at, forum_comments ( id, post_id, user_id, body, created_at, updated_at )"
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const forumTableMissing =
    !!postsError &&
    /(forum_posts|forum_comments|relation|does not exist)/i.test(
      postsError.message ?? ""
    );

  const posts = ((rawPosts ?? []) as ForumPost[]).map((post) => ({
    ...post,
    forum_comments: (post.forum_comments ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
  }));

  const profileIds = Array.from(
    new Set(
      posts
        .flatMap((post) => [
          post.user_id,
          ...(post.forum_comments ?? []).map((comment) => comment.user_id),
        ])
        .filter((value) => typeof value === "string" && value.length > 0)
    )
  );

  const profileMap = new Map<string, ForumProfile>();
  if (profileIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("marketplace_profiles")
      .select("id, username, store_name, avatar_url")
      .in("id", profileIds);

    for (const row of (profileRows ?? []) as ForumProfile[]) {
      profileMap.set(row.id, row);
    }
  }

  const commentCount = posts.reduce(
    (sum, post) => sum + (post.forum_comments?.length ?? 0),
    0
  );

  return (
    <div className="gd-mp-sub gd-mp-shell min-h-screen bg-[#f3f7f6] pb-12">
      <div className="mx-auto w-full max-w-6xl px-3 pt-4 sm:px-4 sm:pt-6 lg:px-6">
        <div className="rounded-[24px] border border-emerald-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="border-b border-emerald-100/80 px-4 py-4 sm:px-6 sm:py-5">
            <Link
              href="/market-place"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Community Forum
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Growers sharing practical advice, crop insights, and livestock know-how.
                </p>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 font-semibold text-emerald-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {posts.length} posts
                </span>
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 font-semibold text-sky-700">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentCount} comments
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-3 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.85fr)] lg:gap-6 lg:px-6 lg:py-6">
            <div className="min-w-0 space-y-4">
              <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-emerald-700">
                  <Users className="h-4 w-4" />
                  <p className="text-sm font-semibold">Start a discussion</p>
                </div>
                {user ? (
                  <form action={createForumPostAction} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr]">
                      <input
                        type="text"
                        name="title"
                        required
                        minLength={3}
                        maxLength={160}
                        placeholder="Post title"
                        className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                      <select
                        name="category"
                        defaultValue="General"
                        className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      >
                        {GD_FORUM_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      name="body"
                      required
                      minLength={3}
                      maxLength={5000}
                      rows={4}
                      placeholder="Share your question, experience, or practical tip..."
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <ForumSubmitButton
                      label="Publish post"
                      pendingLabel="Publishing..."
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </form>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Sign in to create a post or comment.
                    <Link
                      href={GD_FORUM_LOGIN_PATH}
                      className="ml-2 font-semibold underline underline-offset-2"
                    >
                      Go to login
                    </Link>
                  </div>
                )}
              </section>

              {forumTableMissing ? (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:p-5">
                  <p className="font-semibold">Forum tables are missing in Supabase.</p>
                  <p className="mt-1">
                    Apply migration:
                    <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 font-mono text-xs">
                      20260227195000_marketplace_forum.sql
                    </span>
                  </p>
                </section>
              ) : posts.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No posts yet. Be the first to help the community.
                </section>
              ) : (
                <section className="space-y-3 sm:space-y-4">
                  {posts.map((post) => {
                    const author = profileMap.get(post.user_id) ?? null;
                    const authorName = GD_displayName(author, post.user_id);
                    const comments = post.forum_comments ?? [];
                    const isOwner = user?.id === post.user_id;
                    const category = post.category?.trim() || "General";

                    return (
                      <article
                        key={post.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                      >
                        <div className="space-y-3 p-4 sm:p-5">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                  {category}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {GD_formatDate(post.created_at)}
                                </span>
                              </div>
                              <h2 className="break-words text-base font-semibold text-slate-900 sm:text-lg">
                                {post.title}
                              </h2>
                              <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">
                                {post.body}
                              </p>
                            </div>
                            {isOwner && (
                              <form action={deleteForumPostAction}>
                                <input type="hidden" name="post_id" value={post.id} />
                                <ForumSubmitButton
                                  label="Delete"
                                  pendingLabel="Deleting..."
                                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </form>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <div className="inline-flex min-w-0 items-center gap-2">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                                {author?.avatar_url ? (
                                  <img
                                    src={author.avatar_url}
                                    alt={authorName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  GD_initials(authorName)
                                )}
                              </span>
                              <span className="truncate text-xs font-semibold text-slate-600">
                                {authorName}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {comments.length} comment{comments.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                          <div className="space-y-3">
                            {comments.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                No comments yet.
                              </p>
                            ) : (
                              comments.map((comment) => {
                                const commentAuthor =
                                  profileMap.get(comment.user_id) ?? null;
                                const commentAuthorName = GD_displayName(
                                  commentAuthor,
                                  comment.user_id
                                );
                                return (
                                  <div
                                    key={comment.id}
                                    className="rounded-xl border border-slate-200 bg-white p-3"
                                  >
                                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-slate-700">
                                        {commentAuthorName}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        {GD_formatDate(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="break-words text-sm leading-relaxed text-slate-600">
                                      {comment.body}
                                    </p>
                                  </div>
                                );
                              })
                            )}

                            {user ? (
                              <form
                                action={createForumCommentAction}
                                className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                              >
                                <input type="hidden" name="post_id" value={post.id} />
                                <textarea
                                  name="body"
                                  required
                                  minLength={1}
                                  maxLength={2000}
                                  rows={2}
                                  placeholder="Write a comment..."
                                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                />
                                <ForumSubmitButton
                                  label="Post comment"
                                  pendingLabel="Posting..."
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </div>

            <aside className="min-w-0 space-y-3">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  Community rules
                </h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>Share practical details: location, season, and crop or livestock type.</li>
                  <li>Respect other growers. No spam, insults, or misleading offers.</li>
                  <li>Keep posts concise and useful so others can answer quickly.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
                <div className="mt-3 grid gap-2">
                  <Link
                    href="/market-place"
                    className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Return to marketplace
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/market-place/search"
                    className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Discover listings
                    <Send className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
