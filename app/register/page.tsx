"use client"

import React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseClient } from "@/lib/supabase/client"

const GDutyRegisterSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""

// ============================================================
// Icons
// ============================================================

const LeafIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
)

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)


// Floating Background


function FloatingBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const leaves = [
    { left: "5%", top: "10%", delay: 0, duration: 20 },
    { left: "15%", top: "60%", delay: 2, duration: 18 },
    { left: "25%", top: "30%", delay: 4, duration: 22 },
    { left: "70%", top: "15%", delay: 1, duration: 19 },
    { left: "80%", top: "50%", delay: 3, duration: 21 },
    { left: "90%", top: "75%", delay: 5, duration: 17 },
    { left: "50%", top: "85%", delay: 2.5, duration: 23 },
    { left: "35%", top: "5%", delay: 1.5, duration: 20 },
  ]

  const dots = Array.from({ length: 25 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 4,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    opacity: 0.2 + Math.random() * 0.3,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />

      {/* Floating leaves */}
      {leaves.map((leaf, i) => (
        <div
          key={`leaf-${i}`}
          className="absolute opacity-[0.07] text-emerald-600"
          style={{
            left: leaf.left,
            top: leaf.top,
            animation: `floatLeaf ${leaf.duration}s ease-in-out infinite`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <LeafIcon className="w-16 h-16 md:w-20 md:h-20" />
        </div>
      ))}

      {/* Floating dots */}
      {dots.map((dot, i) => (
        <div
          key={`dot-${i}`}
          className="absolute rounded-full bg-emerald-500"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            animation: `floatDot ${dot.duration}s ease-in-out infinite`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes floatLeaf {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(10deg);
          }
        }
        @keyframes floatDot {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(8px, -12px);
          }
          50% {
            transform: translate(-4px, -20px);
          }
          75% {
            transform: translate(12px, -8px);
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// Success Overlay
// ============================================================

function SuccessOverlay({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 500),
      setTimeout(() => setStage(3), 1000),
      setTimeout(onComplete, 3000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm transition-opacity duration-500 ${stage >= 1 ? "opacity-100" : "opacity-0"}`}>
      {/* Confetti */}
      {stage >= 2 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 md:w-3 md:h-3"
              style={{
                left: `${50 + (Math.random() - 0.5) * 60}%`,
                top: "50%",
                backgroundColor: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857"][i % 5],
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                animation: `confetti ${1.5 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center px-4">
        <div className={`mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-200 transition-all duration-500 ${stage >= 1 ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
          <CheckIcon className={`w-10 h-10 md:w-12 md:h-12 text-white transition-all duration-300 delay-200 ${stage >= 2 ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
        </div>

        <h2 className={`mt-6 text-2xl md:text-3xl font-bold text-gray-900 transition-all duration-500 ${stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          Welcome to GreenDuty!
        </h2>
        <p className={`mt-2 text-gray-600 transition-all duration-500 delay-100 ${stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          Your account has been created successfully
        </p>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

function GDutyRegisterToast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-emerald-200/70 bg-white/80 px-4 py-3 text-sm text-emerald-900 shadow-lg shadow-emerald-200/40 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-emerald-800">{message}</div>
        <button
          onClick={onClose}
          className="rounded-full border border-emerald-200/60 bg-white/70 px-2 py-0.5 text-[10px] text-emerald-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Main Register Page
// ============================================================

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const router = useRouter()
  const GDutyAuthSearchParams = useSearchParams()

  const GDutyAuthRedirectTarget = useMemo(() => {
    const raw = GDutyAuthSearchParams.get("redirect") ?? "/reported-area"
    if (raw.startsWith("/GreenSport")) return "/GreenSport"
    if (raw.startsWith("/reported-area")) return "/reported-area"
    return "/reported-area"
  }, [GDutyAuthSearchParams])
  const supabase = supabaseClient
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!errorMessage) return
    const timer = setTimeout(() => setErrorMessage(""), 4000)
    return () => clearTimeout(timer)
  }, [errorMessage])

  useEffect(() => {
    if (!supabase) return
    let mountedFlag = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mountedFlag) return
      if (data.session) {
        router.push(GDutyAuthRedirectTarget)
      }
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.push(GDutyAuthRedirectTarget)
        }
      }
    )
    return () => {
      mountedFlag = false
      authListener.subscription.unsubscribe()
    }
  }, [supabase, router, GDutyAuthRedirectTarget])

  const isFormValid =
    formData.fullName.length > 0 &&
    formData.email.length > 0 &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword &&
    agreeTerms

  const showError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  const normalizeAuthError = useCallback((message?: string) => {
    if (!message) return "Something went wrong. Please try again."
    const normalized = message.toLowerCase()
    if (
      normalized.includes("already registered") ||
      normalized.includes("user already registered") ||
      normalized.includes("duplicate key value")
    ) {
      return "This email is already registered."
    }
    if (normalized.includes("invalid email")) {
      return "Please enter a valid email address."
    }
    if (normalized.includes("password")) {
      return "Password should be at least 6 characters."
    }
    if (normalized.includes("provider is not enabled")) {
      return "This social provider is not enabled yet."
    }
    return message
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isFormValid) return
      setIsLoading(true)
      const fullName = formData.fullName.trim()
      const emailValue = formData.email.trim()
      const redirectBase = GDutyRegisterSiteUrl
        ? GDutyRegisterSiteUrl.replace(/\/+$/, "")
        : typeof window !== "undefined"
          ? window.location.origin
          : ""
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailValue,
          password: formData.password,
          options: {
            emailRedirectTo: redirectBase ? `${redirectBase}${GDutyAuthRedirectTarget}` : undefined,
            data: {
              full_name: fullName,
              username: fullName,
            },
          },
        })

        if (error) {
          showError(normalizeAuthError(error.message))
          return
        }

        const user = data.user
        if (user) {
          const fallbackUsername = fullName || user.email?.split("@")[0] || "Eco Ranger"
          const { error: profileError } = await supabase
            .from("marketplace_profiles")
            .upsert(
              {
                id: user.id,
                email: user.email ?? emailValue,
                username: fallbackUsername,
                full_name: fullName || null,
                avatar_url:
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)
                    ?.avatar_url ??
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)
                    ?.picture ??
                  null,
                role: "buyer",
                account_tier: "basic",
                verification_status: "unverified",
              },
              { onConflict: "id" }
            )
          if (profileError) {
            showError("Profile setup failed. Please try again.")
          }
        }

        if (!data.session) {
          showError("Account created. Check your email to confirm before signing in.")
          setTimeout(() => {
            router.push(`/login?redirect=${encodeURIComponent(GDutyAuthRedirectTarget)}`)
          }, 1200)
          return
        }

        setShowSuccess(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed."
        showError(normalizeAuthError(message))
      } finally {
        setIsLoading(false)
      }
    },
    [
      isFormValid,
      formData,
      supabase,
      showError,
      normalizeAuthError,
      router,
      GDutyAuthRedirectTarget,
    ]
  )

  const handleOAuth = useCallback(
    async (provider: "google" | "apple") => {
      if (typeof window === "undefined") return
      if (provider === "google") {
        setIsGoogleLoading(true)
      } else {
        setIsAppleLoading(true)
      }
      const redirectBase = GDutyRegisterSiteUrl
        ? GDutyRegisterSiteUrl.replace(/\/+$/, "")
        : window.location.origin
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${redirectBase}${GDutyAuthRedirectTarget}`,
          },
        })
        if (error) {
          showError(normalizeAuthError(error.message))
          setIsGoogleLoading(false)
          setIsAppleLoading(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Social login failed."
        showError(normalizeAuthError(message))
        setIsGoogleLoading(false)
        setIsAppleLoading(false)
      }
    },
    [supabase, showError, normalizeAuthError, GDutyAuthRedirectTarget]
  )

  const animationDelay = (index: number) => ({
    transitionDelay: `${index * 60}ms`,
  })

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {showSuccess && (
        <SuccessOverlay
          onComplete={() => {
            setShowSuccess(false)
            router.push(GDutyAuthRedirectTarget)
          }}
        />
      )}

      {errorMessage && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full -translate-x-1/2 px-4">
          <div className="pointer-events-auto mx-auto flex w-full max-w-sm justify-center">
            <GDutyRegisterToast
              message={errorMessage}
              onClose={() => setErrorMessage("")}
            />
          </div>
        </div>
      )}

      {/* Background */}
      <FloatingBackground />

      {/* Left Section - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
            {/* Logo */}
            <div
              className={`flex justify-center mb-5 transition-all duration-500 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
              style={animationDelay(0)}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                <LeafIcon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Header */}
            <div
              className={`text-center mb-6 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={animationDelay(1)}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create account</h1>
              <p className="mt-1.5 text-gray-500 text-sm sm:text-base">Join GreenDuty and make a difference</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div
                className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(2)}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div
                  className={`relative flex items-center rounded-xl border bg-gray-50 transition-all duration-200 ${
                    focusedField === "fullName" ? "border-emerald-500 bg-white ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <UserIcon className={`ml-4 w-5 h-5 transition-colors ${focusedField === "fullName" ? "text-emerald-500" : "text-gray-400"}`} />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    onInput={(e) =>
                      setFormData({ ...formData, fullName: (e.target as HTMLInputElement).value })
                    }
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-3 py-3 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div
                className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(3)}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div
                  className={`relative flex items-center rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 ${
                    focusedField === "email" ? "border-emerald-500 bg-white ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="ml-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50/80">
                    <MailIcon className={`w-4 h-4 transition-colors ${focusedField === "email" ? "text-emerald-500" : "text-gray-400"}`} />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onInput={(e) =>
                      setFormData({ ...formData, email: (e.target as HTMLInputElement).value })
                    }
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    name="email"
                    className="relative z-10 w-full px-3 py-3 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div
                className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(4)}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div
                  className={`relative flex items-center rounded-xl border bg-gray-50 transition-all duration-200 ${
                    focusedField === "password" ? "border-emerald-500 bg-white ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <LockIcon className={`ml-4 w-5 h-5 transition-colors ${focusedField === "password" ? "text-emerald-500" : "text-gray-400"}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onInput={(e) =>
                      setFormData({ ...formData, password: (e.target as HTMLInputElement).value })
                    }
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="new-password"
                    className="w-full px-3 py-3 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none text-sm sm:text-base"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div
                className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(5)}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div
                  className={`relative flex items-center rounded-xl border bg-gray-50 transition-all duration-200 ${
                    focusedField === "confirmPassword" ? "border-emerald-500 bg-white ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <LockIcon className={`ml-4 w-5 h-5 transition-colors ${focusedField === "confirmPassword" ? "text-emerald-500" : "text-gray-400"}`} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    onInput={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: (e.target as HTMLInputElement).value,
                      })
                    }
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="new-password"
                    className="w-full px-3 py-3 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none text-sm sm:text-base"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-4 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div
                className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(6)}
              >
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="sr-only peer" />
                    <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center group-hover:border-emerald-400">
                      <CheckIcon className={`w-3 h-3 text-white transition-all duration-200 ${agreeTerms ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div
                className={`pt-1 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={animationDelay(7)}
              >
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 disabled:hover:shadow-lg disabled:active:scale-100 transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create account"
                  )}
                </button>
                {errorMessage && (
                  <div className="mt-3 rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
                    {errorMessage}
                  </div>
                )}
              </div>
            </form>

            {/* Divider */}
            <div className={`flex items-center gap-4 my-5 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`} style={animationDelay(8)}>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social Buttons */}
            <div className={`space-y-3 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={animationDelay(9)}>
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  <>
                    <GoogleIcon className="w-5 h-5" />
                    Continue with Google
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={isAppleLoading}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAppleLoading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  <>
                    <AppleIcon className="w-5 h-5" />
                    Continue with Apple
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <p className={`text-center mt-5 text-sm text-gray-500 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={animationDelay(10)}>
              Already have an account?{" "}
              <Link
                href={`/login?redirect=${encodeURIComponent(GDutyAuthRedirectTarget)}`}
                className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>

            {/* Branding */}
            <div className={`flex items-center justify-center gap-1.5 mt-5 pt-5 border-t border-gray-100 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`} style={animationDelay(11)}>
              <LeafIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">GreenDuty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Image (Desktop/Tablet only) */}
      <div className="hidden lg:block lg:w-[45%] xl:w-1/2 relative">
        <div
          className={`absolute inset-4 xl:inset-6 rounded-3xl overflow-hidden shadow-2xl transition-all duration-1000 ease-out ${
            mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
          }`}
        >
          <Image src="/images/greenduty-nature.jpg" alt="Beautiful nature scene representing GreenDuty's environmental mission" fill className="object-cover" priority />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-emerald-900/20 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 xl:p-12">
            <div className={`transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <h2 className="text-3xl xl:text-4xl font-bold text-white mb-3">Join the Green Movement</h2>
              <p className="text-white/80 text-base xl:text-lg max-w-md leading-relaxed">
                Be part of a community dedicated to making our planet a better place for future generations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
