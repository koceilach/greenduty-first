"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { eduPosts } from "@/lib/edu/mock";
import { supabase } from "@/lib/supabase/client";
import { ShieldCheck, ArrowLeft, Heart, Bookmark, MessageCircle } from "lucide-react";

export default function EduCreatorPage() {
  const params = useParams();
  const creatorId = params?.id as string;

  const [profileMedia, setProfileMedia] = useState<{
    avatarUrl: string | null;
    coverUrl: string | null;
    aboutMediaUrls: string[];
  }>({ avatarUrl: null, coverUrl: null, aboutMediaUrls: [] });
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const creatorPosts = useMemo(
    () => eduPosts.filter((post) => post.creator.id === creatorId),
    [creatorId]
  );
  const creator = creatorPosts[0]?.creator;

  useEffect(() => {
    const stored = localStorage.getItem(`gd_edu_creator_media:${creatorId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        avatarUrl: string | null;
        coverUrl: string | null;
        aboutMediaUrls: string[];
      };
      setProfileMedia(parsed);
    }
  }, [creatorId]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      setCurrentUserId(userId);
      if (!userId) return;

      const { data } = await supabase
        .from("edu_creators")
        .select("avatar_url, cover_url, about_media_urls")
        .eq("user_id", userId)
        .single();

      if (data) {
        const next = {
          avatarUrl: data.avatar_url ?? null,
          coverUrl: data.cover_url ?? null,
          aboutMediaUrls: data.about_media_urls ?? [],
        };
        setProfileMedia(next);
        localStorage.setItem(`gd_edu_creator_media:${creatorId}`, JSON.stringify(next));
      }
    };
    loadProfile();
  }, [creatorId]);

  const handleUpload = async (file: File, kind: "avatar" | "cover" | "about") => {
    if (!currentUserId) return;
    setUploading(true);
    const filePath = `profiles/${currentUserId}/${kind}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("edu-media").upload(filePath, file);
    if (uploadError) {
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("edu-media").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const next = {
      avatarUrl: kind === "avatar" ? publicUrl : profileMedia.avatarUrl,
      coverUrl: kind === "cover" ? publicUrl : profileMedia.coverUrl,
      aboutMediaUrls:
        kind === "about" ? [...profileMedia.aboutMediaUrls, publicUrl] : profileMedia.aboutMediaUrls,
    };

    setProfileMedia(next);
    localStorage.setItem(`gd_edu_creator_media:${creatorId}`, JSON.stringify(next));

    await supabase
      .from("edu_creators")
      .upsert({
        user_id: currentUserId,
        display_name: creator?.display_name ?? "Creator",
        expertise: creator?.expertise ?? null,
        avatar_url: next.avatarUrl,
        cover_url: next.coverUrl,
        about_media_urls: next.aboutMediaUrls,
      });

    setUploading(false);
  };

  const handleAboutMedia = async (files: FileList | null) => {
    if (!files || !currentUserId) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await handleUpload(file, "about");
    }
    setUploading(false);
  };

  if (!creator) {
    return (
      <main className="min-h-screen bg-[#f4f5fb] text-slate-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <Button asChild variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Link href="/edu">
              <ArrowLeft className="w-4 h-4" />
              Back to EDU
            </Link>
          </Button>
          <p className="mt-8 text-slate-500">Creator not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f5fb] text-slate-900">
      <Navbar />
      <section className="pt-28 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button asChild variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Link href="/edu">
              <ArrowLeft className="w-4 h-4" />
              Back to EDU
            </Link>
          </Button>

          <div className="mt-8 overflow-hidden rounded-[32px] bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)]">
            <div
              className="relative h-48 bg-[linear-gradient(120deg,_#b7e4d8,_#dff3ef_45%,_#f1f5ff)] bg-cover bg-center"
              style={profileMedia.coverUrl ? { backgroundImage: `url(${profileMedia.coverUrl})` } : undefined}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_55%)]" />
            </div>
            <div className="relative px-6 pb-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
                    <img
                      src={profileMedia.avatarUrl || creator.avatar_url || "/logo.png"}
                      alt={creator.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-semibold text-slate-900">{creator.display_name}</h1>
                      {creator.verified && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <p className="text-sm text-slate-500">{creator.expertise}</p>
                    <div className="mt-2 text-sm text-emerald-600">
                      {creator.total_posts} posts · {creator.total_likes} likes
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600">
                    Follow
                  </Button>
                  <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-50">
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {currentUserId && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                Avatar photo
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file, "avatar");
                  }}
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                Cover image
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file, "cover");
                  }}
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                About media (images/video)
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  onChange={(event) => handleAboutMedia(event.target.files)}
                />
                {uploading && <p className="mt-2 text-xs text-emerald-600">Uploading…</p>}
              </label>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {profileMedia.aboutMediaUrls.map((url) => (
              <div
                key={url}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
              >
                {url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={url} controls className="h-40 w-full object-cover" />
                ) : (
                  <img src={url} alt="About media" className="h-40 w-full object-cover" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[2.2fr_1fr]">
            <div className="grid gap-6">
              {creatorPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                  <p className="text-sm text-slate-500">{post.category}</p>
                  <p className="mt-3 text-sm text-slate-600">{post.body}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      <Heart className="w-4 h-4 mr-2" />
                      {post.likes}
                    </Button>
                    <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {post.comments}
                    </Button>
                    <Button variant="outline" className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      <Bookmark className="w-4 h-4 mr-2" />
                      {post.saves}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <aside className="space-y-6">
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-sm text-slate-500">About</p>
                <p className="mt-2 text-sm text-slate-600">
                  Verified creator focused on agronomy, sustainability, and clean energy education.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <p className="text-sm text-slate-500">Activity</p>
                <p className="mt-2 text-sm text-slate-600">
                  Updated weekly with trusted, AI-verified learning content.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
