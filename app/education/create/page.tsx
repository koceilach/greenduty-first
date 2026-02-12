"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Category = { id: string; name: string };

export default function CreatePostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "carousel" | "infographic">("image");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState("");
  const [sources, setSources] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* Load categories */
  useEffect(() => {
    supabase
      .from("edu_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setCategories(data ?? []);
        if (data?.length) setCategoryId(data[0].id);
      });
  }, []);

  /* Handle file selection */
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setMediaFiles((prev) => [...prev, ...newFiles]);

    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /* Publish */
  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setPublishing(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("You must be logged in to create a post");
      setPublishing(false);
      return;
    }

    // Upload media
    const mediaUrls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `edu-posts/${userData.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("edu-media")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        setPublishing(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("edu-media").getPublicUrl(path);
      mediaUrls.push(urlData.publicUrl);
    }

    // Try to ensure an edu_creators row exists for this user
    const { data: existingCreator } = await supabase
      .from("edu_creators")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    let creatorId = existingCreator?.id;
    if (!creatorId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", userData.user.id)
        .single();

      const { data: newCreator } = await supabase
        .from("edu_creators")
        .insert({
          user_id: userData.user.id,
          display_name: profileRow?.full_name ?? "Anonymous",
          handle: profileRow?.username ?? userData.user.email?.split("@")[0] ?? "user",
        })
        .select("id")
        .single();

      creatorId = newCreator?.id;
    }

    // Insert post
    const { error: insertError } = await supabase.from("edu_posts").insert({
      user_id: userData.user.id,
      creator_id: creatorId ?? null,
      title: title.trim(),
      body: body.trim() || null,
      category_id: categoryId || null,
      media_type: mediaType,
      media_urls: mediaUrls.length ? mediaUrls : null,
      hashtags: hashtags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sources: sources
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "published",
    });

    if (insertError) {
      setError(insertError.message);
      setPublishing(false);
      return;
    }

    setSuccess(true);
    setPublishing(false);
    setTimeout(() => router.push("/education"), 1500);
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Back */}
        <Link
          href="/education"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-[#1E7F43]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <h1 className="text-lg font-semibold">Create Post</h1>
            <p className="mt-1 text-xs text-slate-400">Share your knowledge with the community</p>
          </div>

          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Post published! Redirecting...
              </div>
            )}

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a clear title"
                className="rounded-xl"
                maxLength={200}
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Content
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your post content here... Share insights, research, tips, or observations."
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Category + Media type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1E7F43] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Media Type
                </label>
                <div className="flex gap-2">
                  {(["image", "video", "carousel", "infographic"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMediaType(type)}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold capitalize transition ${
                        mediaType === type
                          ? "bg-[#1E7F43] text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Media upload */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Media
              </label>

              {mediaPreviews.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {mediaPreviews.map((preview, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {mediaFiles[idx]?.type.startsWith("video") ? (
                        <video src={preview} className="h-full w-full object-cover" />
                      ) : (
                        <img src={preview} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(idx)}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-sm text-slate-400 transition hover:border-[#1E7F43] hover:bg-emerald-50/50 hover:text-[#1E7F43] dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700"
              >
                <Upload className="h-5 w-5" />
                Click to upload images or videos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple={mediaType === "carousel"}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hashtags
              </label>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#Agronomy, #Sustainability, #GreenDuty"
                className="rounded-xl"
              />
              <p className="mt-1 text-[11px] text-slate-400">Separate with commas</p>
            </div>

            {/* Sources */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sources (optional)
              </label>
              <textarea
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                placeholder="Add source URLs, one per line"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#1E7F43] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button
                onClick={handlePublish}
                disabled={publishing || !title.trim()}
                className="rounded-full bg-[#1E7F43] px-6 text-white hover:bg-[#166536]"
              >
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Post"
                )}
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/education">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
