"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { GD_WILAYAS } from "@/lib/wilayas";

export default function SellerOnboardingPage() {
  const { user, profile, submitSellerApplication, getMySellerApplication } =
    useMarketplaceAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [existingApp, setExistingApp] = useState<{ status: string } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    businessName: "",
    address: "",
    wilaya: "Algiers",
    bio: "",
    acceptTerms: false,
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Check for existing application or if already a seller
  useEffect(() => {
    if (!user) return;
    if (profile?.role === "seller") {
      setCompleted(true);
      return;
    }
    getMySellerApplication().then((app) => {
      if (app) setExistingApp({ status: app.status });
    });
  }, [user, profile?.role, getMySellerApplication]);

  useEffect(() => {
    if (!user) return;
    if (!form.email && user.email) {
      setForm((prev) => ({ ...prev, email: user.email ?? "" }));
    }
  }, [user, form.email]);

  useEffect(() => {
    if (!idFile) {
      setIdPreview(null);
      return;
    }
    const url = URL.createObjectURL(idFile);
    setIdPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [idFile]);

  const isReady = useMemo(() => {
    return (
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.email.trim() &&
      form.address.trim() &&
      Boolean(idFile) &&
      form.acceptTerms
    );
  }, [form, idFile]);

  const handleIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        setIdFile(null);
        return;
      }
      setIdFile(file);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setToast("Please sign in to complete seller onboarding.");
      return;
    }
    if (!isReady) {
      setToast("Please complete all required fields.");
      return;
    }
    setSubmitting(true);

    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const { error } = await submitSellerApplication({
        store_name: form.businessName.trim() || fullName,
        bio: form.bio.trim() || "Seller on GreenDuty Marketplace",
        location: form.wilaya.trim(),
        phone: form.phone.trim(),
        full_name: fullName,
        id_file: idFile,
      });

      if (error) {
        setToast(error);
      } else {
        setCompleted(true);
        setToast("Application submitted! An admin will review it shortly.");
      }
    } catch {
      setToast("Unable to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    user,
    isReady,
    form.firstName,
    form.lastName,
    form.businessName,
    form.wilaya,
    form.bio,
    form.phone,
    idFile,
    submitSellerApplication,
  ]);

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.2),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

      <div className="gd-mp-container relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-16 pt-10">
        <Link
          href="/market-place"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80 transition hover:text-emerald-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Seller Onboarding
              </div>
              <h1 className="mt-3 text-2xl font-semibold">
                Become a Verified Seller
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Provide your identity and business details to unlock seller tools.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  {
                    title: "Personal Details",
                    description: "Name, contact, and business info.",
                    icon: User,
                  },
                  {
                    title: "Identity Proof",
                    description: "Upload a clear ID card photo.",
                    icon: FileText,
                  },
                  {
                    title: "Verification",
                    description: "Get approved and start selling.",
                    icon: BadgeCheck,
                  },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/30 bg-emerald-200/10 text-emerald-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{step.title}</div>
                        <div className="text-xs text-white/60">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200/20 bg-emerald-200/10 p-5 text-xs text-emerald-100/90">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-emerald-200/70">
                <ShieldCheck className="h-4 w-4" />
                Secure Verification
              </div>
              <p className="mt-3 text-sm text-white/70">
                Your information helps protect buyers and keep the marketplace
                trustworthy. We only use it for verification.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            {completed && profile?.role === "seller" ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/40 bg-emerald-200/10 text-emerald-200">
                  <BadgeCheck className="h-6 w-6" />
                </div>
                <div className="text-xl font-semibold">You&apos;re a Seller!</div>
                <p className="text-sm text-white/60">
                  Your seller tools are now active. You can publish products
                  directly from the marketplace.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/market-place")}
                  className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950"
                >
                  Go to Marketplace
                </button>
              </div>
            ) : completed || existingApp?.status === "pending" ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/40 bg-amber-200/10 text-amber-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="text-xl font-semibold">Application Submitted</div>
                <p className="text-sm text-white/60">
                  Your seller application is under review. An admin will approve or
                  contact you shortly. You&apos;ll be able to sell once approved.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/market-place")}
                  className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950"
                >
                  Back to Marketplace
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {existingApp?.status === "rejected" && (
                  <div className="rounded-2xl border border-red-200/40 bg-red-200/10 p-4 text-sm text-red-100">
                    <div className="font-semibold">Previous application rejected</div>
                    <p className="mt-1 text-red-100/90">
                      Update your details and submit a new application.
                    </p>
                  </div>
                )}
                <div className="text-sm font-semibold">Seller Details</div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      First name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        value={form.firstName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            firstName: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                        placeholder="First name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Last name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        value={form.lastName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            lastName: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                        placeholder="Family name"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        value={form.phone}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                        placeholder="+213 ..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        value={form.email}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                        placeholder="you@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Business name
                    </label>
                    <input
                      value={form.businessName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          businessName: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Wilaya *
                    </label>
                    <select
                      value={form.wilaya}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          wilaya: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-md"
                    >
                      {GD_WILAYAS.filter((item) => item !== "All Wilayas").map(
                        (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      value={form.address}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, address: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                      placeholder="Street, city"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Seller Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bio: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40"
                    placeholder="Share what you sell and your farming story."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    ID Card Photo *
                  </label>
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
                    <label className="flex cursor-pointer items-center gap-3 text-xs text-white/70">
                      <Camera className="h-4 w-4 text-emerald-200" />
                      Upload ID card
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdChange}
                        className="hidden"
                      />
                    </label>
                    {idPreview ? (
                      <img
                        src={idPreview}
                        alt="ID card preview"
                        className="mt-4 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs text-white/50">
                        Upload a clear image of your ID card
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        acceptTerms: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-400"
                  />
                  <span>
                    I confirm that the information provided is accurate and I agree
                    to the marketplace seller terms.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Application for Review"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
