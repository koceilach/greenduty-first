"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type EditableProfile = {
  fullName: string;
  username: string;
  bio: string;
  location: string;
  phone: string;
  website: string;
  education: string;
  work: string;
  dateOfBirth: string;
  gender: string;
  avatarUrl: string | null;
  coverUrl: string | null;
};

export function useEditProfile() {
  const [profile, setProfile] = useState<EditableProfile>({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    phone: "",
    website: "",
    education: "",
    work: "",
    dateOfBirth: "",
    gender: "",
    avatarUrl: null,
    coverUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* ── load current profile ────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: row } = await supabase
        .from("profiles")
        .select("full_name, username, bio, avatar_url, cover_url, location, phone, website, education, work, date_of_birth, gender")
        .eq("id", user.id)
        .single();

      if (row) {
        setProfile({
          fullName: row.full_name ?? "",
          username: row.username ?? "",
          bio: row.bio ?? "",
          location: row.location ?? "",
          phone: (row as any).phone ?? "",
          website: (row as any).website ?? "",
          education: (row as any).education ?? "",
          work: (row as any).work ?? "",
          dateOfBirth: (row as any).date_of_birth ?? "",
          gender: (row as any).gender ?? "",
          avatarUrl: row.avatar_url ?? null,
          coverUrl: row.cover_url ?? null,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  /* ── update field ────────────────────────────────────── */
  const updateField = useCallback(<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }, []);

  /* ── upload avatar or cover ──────────────────────────── */
  const uploadImage = useCallback(
    async (file: File, type: "avatar" | "cover"): Promise<string | null> => {
      if (!userId) return null;

      const ext = file.name.split(".").pop();
      const path = `${type}s/${userId}/${Date.now()}.${ext}`;
      const bucket = "profile-images";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    [userId]
  );

  /* ── save profile ────────────────────────────────────── */
  const saveProfile = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.fullName.trim(),
        username: profile.username.trim(),
        bio: profile.bio.trim(),
        location: profile.location.trim(),
        phone: profile.phone.trim(),
        website: profile.website.trim(),
        education: profile.education.trim(),
        work: profile.work.trim(),
        date_of_birth: profile.dateOfBirth || null,
        gender: profile.gender || null,
        avatar_url: profile.avatarUrl,
        cover_url: profile.coverUrl,
      } as any)
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
    setSaving(false);
  }, [userId, profile]);

  return {
    profile,
    loading,
    saving,
    error,
    success,
    userId,
    updateField,
    uploadImage,
    saveProfile,
  };
}
