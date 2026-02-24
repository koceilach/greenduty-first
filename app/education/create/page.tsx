"use client";

import { EduNavbar } from "@/components/edu/Navbar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  Clapperboard,
  FilePlus2,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; name: string };
type CreateMode = "post" | "reel" | "event";

const touch = "active:scale-[0.97] transition-all duration-200";

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export default function CreatePostPage() {
  const router = useRouter();
  const postMediaInputRef = useRef<HTMLInputElement>(null);
  const reelVideoInputRef = useRef<HTMLInputElement>(null);

  const [createMode, setCreateMode] = useState<CreateMode>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "carousel" | "infographic" | "resource">("image");
  const [resourceUrl, setResourceUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState("");
  const [sources, setSources] = useState("");

  const [reelCaption, setReelCaption] = useState("");
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelPreviewUrl, setReelPreviewUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (reelPreviewUrl) {
        URL.revokeObjectURL(reelPreviewUrl);
      }
    };
  }, [reelPreviewUrl]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const switchMode = (mode: CreateMode) => {
    setCreateMode(mode);
    resetFeedback();
  };

  const handlePostFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setMediaFiles((prev) => [...prev, ...incoming]);

    for (const file of incoming) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaPreviews((prev) => [...prev, String(event.target?.result ?? "")]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removePostMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReelFile = (files: FileList | null) => {
    if (!files || !files.length) return;
    const nextFile = files[0];
    if (!nextFile.type.startsWith("video/")) {
      setError("Please upload a valid video file for reels.");
      return;
    }

    if (reelPreviewUrl) {
      URL.revokeObjectURL(reelPreviewUrl);
    }
    setReelFile(nextFile);
    setReelPreviewUrl(URL.createObjectURL(nextFile));
    setError(null);
  };

  const removeReelFile = () => {
    if (reelPreviewUrl) {
      URL.revokeObjectURL(reelPreviewUrl);
    }
    setReelFile(null);
    setReelPreviewUrl(null);
  };

  const ensureCreatorId = async (userId: string, email: string | null) => {
    const { data: existingCreator } = await supabase
      .from("edu_creators")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCreator?.id) return existingCreator.id;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", userId)
      .single();

    const { data: newCreator, error } = await supabase
      .from("edu_creators")
      .insert({
        user_id: userId,
        display_name: profileRow?.full_name ?? "Anonymous",
        handle: profileRow?.username ?? email?.split("@")[0] ?? "user",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return newCreator?.id ?? null;
  };

  const publishPost = async (userId: string, userEmail: string | null) => {
    if (!title.trim()) {
      throw new Error("Title is required.");
    }
    if (mediaType === "resource" && !/^https?:\/\//i.test(resourceUrl.trim())) {
      throw new Error("A valid resource URL is required (http/https).");
    }

    const mediaUrls: string[] = [];
    for (const file of mediaType === "resource" ? [] : mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `edu-posts/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("edu-media")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from("edu-media").getPublicUrl(path);
      mediaUrls.push(urlData.publicUrl);
    }

    const creatorId = await ensureCreatorId(userId, userEmail);
    const { error: insertError } = await supabase.from("edu_posts").insert({
      user_id: userId,
      creator_id: creatorId ?? null,
      title: title.trim(),
      body: body.trim() || null,
      category_id: categoryId || null,
      media_type: mediaType,
      media_urls: mediaUrls.length ? mediaUrls : null,
      resource_url: mediaType === "resource" ? resourceUrl.trim() : null,
      hashtags: hashtags
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      sources: sources
        .split("\n")
        .map((source) => source.trim())
        .filter(Boolean),
      status: "published",
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  };

  const publishReel = async (userId: string) => {
    if (!reelCaption.trim()) {
      throw new Error("Caption is required for reels.");
    }
    if (!reelFile) {
      throw new Error("Upload one video file to publish a reel.");
    }

    const ext = reelFile.name.split(".").pop();
    const path = `reels/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("edu-reels")
      .upload(path, reelFile, { contentType: reelFile.type || "video/mp4" });

    if (uploadError) {
      throw new Error(`Reel upload failed: ${uploadError.message}`);
    }

    const { data: reelUrl } = supabase.storage.from("edu-reels").getPublicUrl(path);
    const { error: insertError } = await supabase.from("edu_reels").insert({
      author_id: userId,
      video_url: reelUrl.publicUrl,
      caption: reelCaption.trim(),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  };

  const publishEvent = async (userId: string) => {
    if (!eventTitle.trim()) {
      throw new Error("Event title is required.");
    }
    if (!eventStartsAt) {
      throw new Error("Start date and time are required.");
    }

    const startsAtDate = new Date(eventStartsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      throw new Error("Invalid start date/time.");
    }

    let endsAtIso: string | null = null;
    if (eventEndsAt) {
      const endsAtDate = new Date(eventEndsAt);
      if (Number.isNaN(endsAtDate.getTime())) {
        throw new Error("Invalid end date/time.");
      }
      if (endsAtDate.getTime() < startsAtDate.getTime()) {
        throw new Error("Event end time must be after start time.");
      }
      endsAtIso = endsAtDate.toISOString();
    }

    const { error: insertError } = await supabase.from("edu_events").insert({
      title: eventTitle.trim(),
      details: eventDetails.trim() || null,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtIso,
      location: eventLocation.trim() || null,
      status: "upcoming",
      created_by: userId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    resetFeedback();

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        throw new Error("You must be logged in to publish.");
      }

      if (createMode === "post") {
        await publishPost(user.id, user.email ?? null);
        setSuccess("Post published. Redirecting...");
        setTimeout(() => router.push("/education"), 1400);
      } else if (createMode === "reel") {
        await publishReel(user.id);
        setSuccess("Reel published. Redirecting...");
        setTimeout(() => router.push("/education/reels"), 1400);
      } else {
        await publishEvent(user.id);
        setSuccess("Event created. Redirecting...");
        setTimeout(() => router.push("/education"), 1400);
      }
    } catch (publishError: any) {
      setError(
        publishError?.message ??
          "Unable to publish right now. Please try again."
      );
    } finally {
      setPublishing(false);
    }
  };

  const publishLabel = useMemo(() => {
    if (publishing) return "Publishing...";
    if (createMode === "post") return "Publish Post";
    if (createMode === "reel") return "Publish Reel";
    return "Create Event";
  }, [createMode, publishing]);

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />

      <div className="mx-auto w-full max-w-[980px] px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-4 lg:px-6 lg:pb-10 lg:pt-6">
        <Link
          href="/education"
          className={`mb-4 inline-flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${touch}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <section className="rounded-[2rem] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6">
          <div className="mb-5">
            <div className="mb-3 grid grid-cols-3 gap-2 rounded-[1.75rem] bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => switchMode("post")}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.12em] ${touch} ${
                  createMode === "post"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600"
                }`}
              >
                <FilePlus2 className="h-4 w-4" />
                Post
              </button>
              <button
                type="button"
                onClick={() => switchMode("reel")}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.12em] ${touch} ${
                  createMode === "reel"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600"
                }`}
              >
                <Clapperboard className="h-4 w-4" />
                Reel
              </button>
              <button
                type="button"
                onClick={() => switchMode("event")}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.12em] ${touch} ${
                  createMode === "event"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600"
                }`}
              >
                <CalendarPlus className="h-4 w-4" />
                Event
              </button>
            </div>

            <h1 className="text-xl font-semibold text-slate-900">
              {createMode === "post"
                ? "Create Post"
                : createMode === "reel"
                ? "Create Reel"
                : "Create Event"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {createMode === "post"
                ? "Share your educational update or learning resource."
                : createMode === "reel"
                ? "Upload a vertical short-form video for your reels audience."
                : "Publish an event that appears in the dynamic right sidebar."}
            </p>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="rounded-3xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-3xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            {createMode === "post" ? (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Give your post a clear title"
                    className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Content
                  </label>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write your post content here..."
                    rows={6}
                    className="w-full rounded-[1.6rem] bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Category
                    </label>
                    <select
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="h-12 w-full rounded-full bg-slate-100 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Media Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(["image", "video", "carousel", "infographic", "resource"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setMediaType(type)}
                          className={`h-11 rounded-full px-3 text-xs font-semibold capitalize ${touch} ${
                            mediaType === type
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                          type="button"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {mediaType === "resource" && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Resource URL *
                    </label>
                    <Input
                      value={resourceUrl}
                      onChange={(event) => setResourceUrl(event.target.value)}
                      placeholder="https://example.com/learning-resource"
                      className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                )}

                <div className={mediaType === "resource" ? "hidden" : ""}>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Media
                  </label>

                  {mediaPreviews.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="group relative aspect-square overflow-hidden rounded-3xl bg-slate-100">
                          {mediaFiles[index]?.type.startsWith("video") ? (
                            <video src={preview} className="h-full w-full object-cover" />
                          ) : (
                            <img src={preview} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                          )}
                          <button
                            onClick={() => removePostMedia(index)}
                            className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white ${touch}`}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => postMediaInputRef.current?.click()}
                    className={`flex h-28 w-full items-center justify-center gap-2 rounded-[1.6rem] bg-slate-100 text-sm font-semibold text-slate-500 ${touch}`}
                    type="button"
                  >
                    <Upload className="h-5 w-5" />
                    Click to upload images or videos
                  </button>
                  <input
                    ref={postMediaInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple={mediaType === "carousel"}
                    className="hidden"
                    onChange={(event) => handlePostFiles(event.target.files)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Hashtags
                  </label>
                  <Input
                    value={hashtags}
                    onChange={(event) => setHashtags(event.target.value)}
                    placeholder="#Agronomy, #Sustainability, #GreenDuty"
                    className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Separate with commas</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sources (optional)
                  </label>
                  <textarea
                    value={sources}
                    onChange={(event) => setSources(event.target.value)}
                    placeholder="Add source URLs, one per line"
                    rows={3}
                    className="w-full rounded-[1.6rem] bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            ) : createMode === "reel" ? (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reel Caption *
                  </label>
                  <textarea
                    value={reelCaption}
                    onChange={(event) => setReelCaption(event.target.value)}
                    placeholder="Write a short caption for your reel..."
                    rows={4}
                    className="w-full rounded-[1.6rem] bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reel Video *
                  </label>

                  {reelPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-100">
                      <video
                        src={reelPreviewUrl}
                        controls
                        playsInline
                        className="h-[56dvh] min-h-[260px] max-h-[420px] w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeReelFile}
                        className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white ${touch}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reelVideoInputRef.current?.click()}
                      className={`flex h-44 w-full flex-col items-center justify-center gap-3 rounded-[1.6rem] bg-slate-100 text-sm font-semibold text-slate-500 sm:h-48 ${touch}`}
                    >
                      <Upload className="h-6 w-6" />
                      Click to upload a reel video
                    </button>
                  )}

                  <input
                    ref={reelVideoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => handleReelFile(event.target.files)}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Recommended: vertical format (9:16), up to 50 MB.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Event Title *
                  </label>
                  <Input
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                    placeholder="Soil Health Live Session"
                    className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Event Details
                  </label>
                  <textarea
                    value={eventDetails}
                    onChange={(event) => setEventDetails(event.target.value)}
                    placeholder="Write what attendees will learn."
                    rows={4}
                    className="w-full rounded-[1.6rem] bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Starts At *
                    </label>
                    <Input
                      type="datetime-local"
                      value={eventStartsAt}
                      onChange={(event) => setEventStartsAt(event.target.value)}
                      className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Ends At
                    </label>
                    <Input
                      type="datetime-local"
                      value={eventEndsAt}
                      onChange={(event) => setEventEndsAt(event.target.value)}
                      className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Location
                  </label>
                  <Input
                    value={eventLocation}
                    onChange={(event) => setEventLocation(event.target.value)}
                    placeholder="Online or GreenDuty Learning Hub"
                    className="h-12 rounded-full border-0 bg-slate-100 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    maxLength={140}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Button
                onClick={handlePublish}
                disabled={
                  publishing ||
                  (createMode === "post"
                    ? !title.trim()
                    : createMode === "reel"
                    ? !reelCaption.trim() || !reelFile
                    : !eventTitle.trim() || !eventStartsAt)
                }
                className={`h-14 rounded-full bg-emerald-500 px-6 text-white hover:bg-emerald-600 ${touch}`}
              >
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {publishLabel}
              </Button>

              <Link
                href={createMode === "reel" ? "/education/reels" : "/education"}
                className={`inline-flex h-14 items-center justify-center rounded-full bg-slate-100 px-6 text-sm font-semibold text-slate-700 ${touch}`}
              >
                Cancel
              </Link>
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav />
    </div>
  );
}
