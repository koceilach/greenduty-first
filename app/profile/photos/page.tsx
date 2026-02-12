"use client";

import { ProfileShell } from "@/components/profile/ProfileShell";
import { useProfileData } from "@/lib/profile/useProfileData";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

export default function ProfilePhotosPage() {
  const { profile, loading, mediaPosts } = useProfileData();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Collect all media URLs from posts
  const allMedia = mediaPosts.flatMap((post) => {
    const urls: { url: string; title: string; postId: string }[] = [];
    if (post.media.assetUrl) {
      urls.push({ url: post.media.assetUrl, title: post.media.description, postId: post.id });
    }
    if (post.media.assetUrls?.length) {
      post.media.assetUrls.forEach((u) =>
        urls.push({ url: u, title: post.media.description, postId: post.id })
      );
    }
    return urls;
  });

  return (
    <ProfileShell profile={profile} loading={loading} activeTab="photos">
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : allMedia.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <ImageIcon className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium">No photos yet</p>
          <p className="mt-1 text-xs">Photos from your posts will appear here</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allMedia.map((media, idx) => (
              <button
                key={`${media.postId}-${idx}`}
                onClick={() => setSelectedImage(media.url)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={media.url}
                  alt={media.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
              </button>
            ))}
          </div>

          {/* Lightbox */}
          {selectedImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            >
              <img
                src={selectedImage}
                alt="Full view"
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              />
            </div>
          )}
        </>
      )}
    </ProfileShell>
  );
}
