import Link from "next/link";
import { Plus } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { PostCard } from "@/components/edu/PostCard";
import { eduNavItems } from "@/lib/edu/feed";
import { getEduFeedPosts } from "@/lib/edu/server-feed";

export default async function EduPage() {
  const posts = await getEduFeedPosts();

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          <EduSidebar side="left" />

          <main className="mx-auto w-full max-w-[720px] space-y-6">
            {posts.map((post) => (
              <div key={post.id}>
                <PostCard post={post} />
              </div>
            ))}
            {!posts.length && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                No posts yet - knowledge is growing.
              </div>
            )}
          </main>

          <EduSidebar side="right" />
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:hidden">
        <div className="flex items-center justify-between">
          {eduNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <Link
        href="/edu/create"
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E7F43] text-white shadow-lg shadow-emerald-200 md:hidden"
        aria-label="Create"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  );
}
