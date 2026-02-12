"use client";

import { useEditProfile } from "@/lib/profile/useEditProfile";
import { EduNavbar } from "@/components/edu/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Briefcase, Calendar, Camera, Check, GraduationCap, Globe, Loader2, MapPin, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function EditProfilePage() {
  const {
    profile,
    loading,
    saving,
    error,
    success,
    updateField,
    uploadImage,
    saveProfile,
  } = useEditProfile();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "avatar");
    if (url) updateField("avatarUrl", url);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "cover");
    if (url) updateField("coverUrl", url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] dark:bg-slate-950">
        <EduNavbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Back */}
        <Link
          href="/profile"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-[#1E7F43]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Cover photo */}
          <div className="relative">
            <div className="h-48 bg-gradient-to-br from-emerald-200 via-emerald-50 to-white dark:from-emerald-900/30 dark:via-slate-900 dark:to-slate-950">
              {profile.coverUrl && (
                <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
              )}
            </div>
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <Camera className="h-3.5 w-3.5" />
              Change cover
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

            {/* Avatar */}
            <div className="absolute -bottom-14 left-8">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 text-2xl font-bold text-emerald-700 shadow-lg dark:border-slate-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#1E7F43] text-white shadow-md transition hover:bg-[#166536]"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6 px-6 pb-8 pt-20">
            <h2 className="text-lg font-semibold">Edit Profile</h2>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Profile updated successfully
              </div>
            )}

            {/* Basic info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Basic Information</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Full Name
                  </label>
                  <Input
                    value={profile.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Your name"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Username
                  </label>
                  <div className="flex items-center">
                    <span className="mr-1 text-sm text-slate-400">@</span>
                    <Input
                      value={profile.username}
                      onChange={(e) => updateField("username", e.target.value)}
                      placeholder="username"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Contact & Location */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Contact & Location</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={profile.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="City, Country"
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+213 555 123 456"
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="url"
                      value={profile.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Education & Work */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Education & Work</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Education
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={profile.education}
                      onChange={(e) => updateField("education", e.target.value)}
                      placeholder="University / School"
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Work
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={profile.work}
                      onChange={(e) => updateField("work", e.target.value)}
                      placeholder="Job title, company"
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Personal</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => updateField("dateOfBirth", e.target.value)}
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Gender
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1E7F43] focus:ring-1 focus:ring-[#1E7F43] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-full bg-[#1E7F43] px-6 text-white hover:bg-[#166536]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/profile">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
