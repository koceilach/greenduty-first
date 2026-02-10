"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { PostCard } from "@/components/edu/PostCard";
import { useEduPosts } from "@/lib/edu/useEduPosts";

const categories = ["All", "Agronomy", "Climate", "Soil", "Water"];

export default function EduSearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const { posts, likedIds, savedIds, toggleLike, toggleSave } = useEduPosts();

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (category !== "All" && post.category.label !== category) return false;
      if (!normalized) return true;
      const haystack = [
        post.creator.name,
        post.creator.handle,
        post.category.label,
        post.caption,
        post.explanation,
        post.hashtags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [category, query]);

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Search EDU</h1>
            <p className="text-sm text-slate-500">Find verified agronomy and sustainability posts.</p>
          </div>
          <Link
            href="/edu"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
            <ArrowLeft className="h-4 w-4" />
            Back to EDU
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full text-sm text-slate-700 outline-none dark:bg-transparent dark:text-slate-100"
              placeholder="Search by topic, creator, or hashtag"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none dark:text-slate-100"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {results.length ? (
            results.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={likedIds.has(post.id)}
                saved={savedIds.has(post.id)}
                onLike={toggleLike}
                onSave={toggleSave}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No results found. Try another keyword or category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
