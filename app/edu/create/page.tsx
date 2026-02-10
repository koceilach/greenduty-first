"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ImagePlus, ShieldCheck } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

const categories = ["Agronomy", "Climate", "Soil", "Water"];
const mediaTypes = ["Image", "Video", "Carousel", "Infographic"];

export default function EduCreatePage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [mediaType, setMediaType] = useState(mediaTypes[0]);
  const [caption, setCaption] = useState("");
  const [explanation, setExplanation] = useState("");
  const [sources, setSources] = useState("");
  const [hashtags, setHashtags] = useState("#Agronomy #GreenDuty #Sustainability");
  const [files, setFiles] = useState<File[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceList = useMemo(
    () =>
      sources
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [sources]
  );

  const uploadMedia = async (userId: string) => {
    if (!files.length) return [];
    const uploads: string[] = [];
    for (const file of files) {
      const filePath = `edu/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("edu-media").upload(filePath, file, {
        upsert: true,
      });
      if (uploadError) {
        const details = uploadError.message || "Unknown error";
        throw new Error(
          `Upload failed: ${details}. Make sure the 'edu-media' bucket exists and allows authenticated uploads.`
        );
      }
      const { data } = supabase.storage.from("edu-media").getPublicUrl(filePath);
      uploads.push(data.publicUrl);
    }
    return uploads;
  };

  const getCategoryId = async (name: string) => {
    const { data: existing } = await supabase
      .from("edu_categories")
      .select("id")
      .eq("name", name)
      .single();
    if (existing?.id) return existing.id;

    const { data: created } = await supabase
      .from("edu_categories")
      .insert({ name })
      .select("id")
      .single();
    return created?.id ?? null;
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitted(false);
    setSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("You must be logged in to create a post.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      const mediaUrls = await uploadMedia(user.id);
      const categoryId = await getCategoryId(category);

      const { data: creatorRows } = await supabase
        .from("edu_creators")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      let creatorId = creatorRows?.[0]?.id ?? null;
      if (creatorId) {
        await supabase
          .from("edu_creators")
          .update({
            display_name: user.user_metadata?.full_name ?? "Green Duty Creator",
            avatar_url: profile?.avatar_url ?? null,
          })
          .eq("id", creatorId);
      } else {
        const { data: creatorData, error: creatorError } = await supabase
          .from("edu_creators")
          .insert({
            user_id: user.id,
            display_name: user.user_metadata?.full_name ?? "Green Duty Creator",
            avatar_url: profile?.avatar_url ?? null,
          })
          .select("id")
          .single();

        if (creatorError || !creatorData?.id) {
          const details = creatorError?.message || "Unknown error";
          throw new Error(
            `Unable to create creator profile: ${details}. Ensure edu_creators RLS policy allows insert for auth.uid().`
          );
        }
        creatorId = creatorData.id;
      }

      const { data: postData, error: postError } = await supabase
        .from("edu_posts")
        .insert({
          user_id: user.id,
          creator_id: creatorId,
          category_id: categoryId,
          title,
          body: explanation || caption,
          media_type: mediaType.toLowerCase(),
          media_urls: mediaUrls,
          status: "needs_review",
        })
        .select("id")
        .single();

      if (postError || !postData?.id) {
        throw new Error("Post submission failed.");
      }

      await supabase.from("edu_ai_verifications").insert({
        post_id: postData.id,
        status: "needs_review",
        sources: sourceList,
        notes: "Pending AI verification.",
      });

      setSubmitted(true);
      setTitle("");
      setCaption("");
      setExplanation("");
      setSources("");
      setFiles([]);
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Create EDU Post</h1>
                <p className="text-sm text-slate-500">
                  Share verified agronomy and sustainability knowledge.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                AI Verification Required
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="e.g. Soil health check in 60 seconds"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Media type
                <select
                  value={mediaType}
                  onChange={(event) => setMediaType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {mediaTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs font-semibold text-slate-500">
                Upload media
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <ImagePlus className="h-4 w-4 text-slate-400" />
                  <span>{fileName ?? "PNG, JPG, MP4"}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple={mediaType === "Carousel"}
                    className="sr-only"
                    onChange={(event) => {
                      const list = Array.from(event.target.files ?? []);
                      setFiles(list);
                      setFileName(list.length ? `${list.length} file(s)` : null);
                    }}
                  />
                </label>
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-500">
              Caption
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Concise educational summary"
              />
            </label>

            <label className="mt-4 block text-xs font-semibold text-slate-500">
              Full explanation
              <textarea
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Detailed guidance, methods, and expected impact"
              />
            </label>

            <label className="mt-4 block text-xs font-semibold text-slate-500">
              Sources (comma separated)
              <input
                value={sources}
                onChange={(event) => setSources(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="FAO, IPCC, Journal name"
              />
            </label>

            <label className="mt-4 block text-xs font-semibold text-slate-500">
              Hashtags
              <input
                value={hashtags}
                onChange={(event) => setHashtags(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                placeholder="#Agronomy #GreenDuty #Sustainability"
              />
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-[#1E7F43] text-white hover:bg-[#166536]"
              >
                {submitting ? "Submitting..." : "Submit for verification"}
              </Button>
              {submitted && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submitted. AI review in progress.
                </div>
              )}
              {error && <div className="text-xs text-rose-600">{error}</div>}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                AI Verification Flow
              </div>
              <ol className="mt-3 space-y-2 text-xs text-slate-600">
                <li>1. Upload content</li>
                <li>2. AI scans text, images, and captions</li>
                <li>3. Status: Verified, Needs Review, or Rejected</li>
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Allowed Content
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>- Agronomy tips</li>
                <li>- Environmental education</li>
                <li>- Water & soil protection</li>
                <li>- Sustainable farming</li>
                <li>- Data visualizations</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sources Preview
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {sourceList.length ? (
                  sourceList.map((source) => (
                    <div key={source} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{source}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Add sources to strengthen verification.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

