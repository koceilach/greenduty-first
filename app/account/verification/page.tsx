"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { GraduationCap, ShieldCheck, UploadCloud } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/components/auth-provider"
import { supabaseClient } from "@/lib/supabase/client"

type VerificationType = "student" | "researcher"

export default function VerificationPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [type, setType] = useState<VerificationType>("student")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (user?.user_metadata?.greenspot) {
      router.replace("/greenspot/verification")
    }
  }, [user?.user_metadata?.greenspot, router])

  useEffect(() => {
    if (profile?.verification_type) {
      setType(profile.verification_type)
    }
  }, [profile?.verification_type])

  const verificationStatus = profile?.verification_status ?? "unverified"
  const isPending = verificationStatus === "pending"
  const isApproved = verificationStatus === "approved"
  const isBlocked = isPending || isApproved

  const handleSubmit = async () => {
    if (!user || isBlocked) return
    setSubmitting(true)
    setError(null)

    const { error: requestError } = await supabaseClient
      .from("verification_requests")
      .insert({ user_id: user.id, type })

    const { error: profileError } = await supabaseClient
      .from("marketplace_profiles")
      .update({ verification_status: "pending", verification_type: type })
      .eq("id", user.id)

    if (requestError || profileError) {
      setError((requestError ?? profileError)?.message ?? "Unable to submit verification request.")
    } else {
      await refreshProfile()
    }

    setSubmitting(false)
  }

  if (loading) return null

  if (!user) {
    return (
      <main className="min-h-screen gd-page-bg--blue text-white">
        <Navbar />
        <section className="pt-28 pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
              <h1 className="text-2xl font-semibold">Sign in required</h1>
              <p className="mt-2 text-sm text-white/60">
                Please sign in to request academic verification.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Link href="/login">Go to login</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen gd-page-bg--blue text-white">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-sm text-white/60">Verified academic access</p>
                <h1 className="text-2xl font-semibold mt-1">
                  {t("verification.title")}
                </h1>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <label
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  type === "student"
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  checked={type === "student"}
                  onChange={() => setType("student")}
                  className="accent-emerald-400"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-200" />
                    <p className="font-medium">{t("verification.student")}</p>
                  </div>
                  <p className="text-sm text-white/60">Access Pro plan with verification.</p>
                </div>
              </label>
              <label
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  type === "researcher"
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  checked={type === "researcher"}
                  onChange={() => setType("researcher")}
                  className="accent-emerald-400"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <p className="font-medium">{t("verification.researcher")}</p>
                  </div>
                  <p className="text-sm text-white/60">Access Impact plan with verification.</p>
                </div>
              </label>
            </div>

            <div className="mt-6">
              <label className="text-sm text-white/60">Upload proof</label>
              <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-white/60">
                <UploadCloud className="w-6 h-6 mx-auto mb-2" />
                Drag & drop or click to upload
              </div>
              <p className="mt-2 text-xs text-white/60">
                Accepted: student card, research document, institutional email.
              </p>
            </div>

            <Button
              className="mt-6 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-60"
              disabled={submitting || isBlocked}
              onClick={handleSubmit}
            >
              {submitting
                ? "Submitting..."
                : isApproved
                  ? "Verified"
                  : isPending
                    ? "Request submitted"
                    : t("verification.submit")}
            </Button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {isPending && (
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                Verification request submitted. Status: Pending review.
              </div>
            )}
            {isApproved && (
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
                Verification approved. Your account now has academic access.
              </div>
            )}
            {verificationStatus === "rejected" && (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Verification rejected. You can submit a new request with updated documents.
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
