"use client"

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode, type InputHTMLAttributes } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseClient } from "@/lib/supabase/client"

const GDutyAuthSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""

// ═══════════════════════════════════════════════════════════════════════════════
// GREENDUTY AUTH - IMMERSIVE NATURE EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════════

export default function GDutyAuthLoginPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <GDutyAuthLoginPage />
    </Suspense>
  )
}

// Icons
function GDutyAuthMailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function GDutyAuthLockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function GDutyAuthLeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function GDutyAuthGoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESMERIZING BACKGROUND ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Floating Orb - Organic movement like fireflies
function GDutyAuthOrb({ delay, duration, size, color, initialX, initialY }: { 
  delay: number
  duration: number
  size: number
  color: string
  initialX: string
  initialY: string
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ 
        width: size, 
        height: size, 
        background: color,
        left: initialX,
        top: initialY,
        filter: "blur(1px)",
      }}
      animate={{
        x: [0, 30, -20, 40, 0],
        y: [0, -40, 20, -30, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
        opacity: [0.4, 0.8, 0.5, 0.7, 0.4],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// Aurora Wave - Flowing gradient bands
function GDutyAuthAurora({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0.1, 0.3, 0.15, 0.25, 0.1],
        scale: [1, 1.1, 0.95, 1.05, 1],
        rotate: [0, 5, -3, 2, 0],
      }}
      transition={{
        duration: 15,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// Floating Particle System
function GDutyAuthParticle({ delay, x }: { delay: number; x: string }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-emerald-400/60 pointer-events-none"
      style={{ left: x, bottom: "-5%" }}
      animate={{
        y: [0, "-100vh"],
        x: [0, Math.random() * 100 - 50],
        opacity: [0, 0.8, 0.6, 0],
        scale: [0.5, 1, 0.8, 0.3],
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}

// Morphing Blob Shape
function GDutyAuthMorphBlob({ className, delay, color }: { className?: string; delay: number; color: string }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      style={{ background: color }}
      animate={{
        borderRadius: [
          "60% 40% 30% 70% / 60% 30% 70% 40%",
          "30% 60% 70% 40% / 50% 60% 30% 60%",
          "60% 40% 30% 70% / 60% 30% 70% 40%",
        ],
        scale: [1, 1.05, 0.95, 1],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{
        duration: 20,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// Animated Leaf with realistic movement
function GDutyAuthFloatingLeaf({ delay, x, y, rotation }: { 
  delay: number
  x: string
  y: string
  rotation: number
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, rotate: rotation }}
      animate={{ 
        opacity: [0.2, 0.4, 0.2], 
        y: [0, -15, 5, -10, 0],
        x: [0, 8, -5, 3, 0],
        rotate: [rotation, rotation + 10, rotation - 5, rotation + 3, rotation],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <GDutyAuthLeafIcon className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600/30" />
    </motion.div>
  )
}

// Ripple Effect
function GDutyAuthRipple({ delay, x, y }: { delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute rounded-full border border-emerald-400/20 pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ width: 0, height: 0, opacity: 0.6 }}
      animate={{
        width: [0, 200, 300],
        height: [0, 200, 300],
        opacity: [0.4, 0.2, 0],
        x: [0, -100, -150],
        y: [0, -100, -150],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}

// Light Ray
function GDutyAuthLightRay({ delay, angle, x }: { delay: number; angle: number; x: string }) {
  return (
    <motion.div
      className="absolute h-[150vh] w-20 sm:w-32 pointer-events-none origin-top"
      style={{ 
        left: x,
        top: "-20%",
        background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)",
        transform: `rotate(${angle}deg)`,
      }}
      animate={{
        opacity: [0.3, 0.6, 0.3],
        scaleY: [1, 1.1, 1],
      }}
      transition={{
        duration: 5,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface GDutyAuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode
  label: string
}

function GDutyAuthInput({ icon, label, ...props }: GDutyAuthInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div 
      className="relative"
      animate={{ scale: isFocused ? 1.01 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <label className="block text-xs font-medium text-stone-600 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <motion.div 
            className={`w-4 h-4 transition-colors duration-200 ${isFocused ? "text-emerald-600" : "text-stone-400"}`}
            animate={{ scale: isFocused ? 1.1 : 1, rotate: isFocused ? 5 : 0 }}
          >
            {icon}
          </motion.div>
        </div>
        <input
          {...props}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          className="w-full bg-white/60 backdrop-blur-sm border border-stone-200/80 rounded-lg py-2 sm:py-2.5 pl-9 pr-3 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/80 transition-all duration-300"
        />
        {/* Input glow effect on focus */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: isFocused 
              ? "0 0 20px rgba(16, 185, 129, 0.15), inset 0 0 20px rgba(16, 185, 129, 0.05)" 
              : "0 0 0 transparent"
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

function GDutyAuthButton({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled,
  loading,
  loadingText,
}: {
  children: ReactNode
  variant?: "primary" | "secondary"
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
  loading?: boolean
  loadingText?: string
}) {
  const spinnerClass =
    variant === "primary"
      ? "border-white/40 border-t-white"
      : "border-emerald-500/40 border-t-emerald-600"
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      className={`relative w-full py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed ${
        variant === "primary"
          ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/25"
          : "bg-white/70 backdrop-blur-sm border border-stone-200/80 text-stone-700 hover:bg-white/90"
      }`}
    >
      {/* Shimmer effect for primary button */}
      {variant === "primary" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <span className={`h-4 w-4 animate-spin rounded-full border ${spinnerClass}`} />
        )}
        {loading ? loadingText ?? "Loading..." : children}
      </span>
    </motion.button>
  )
}

function GDutyAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-3 sm:my-4">
      <motion.div 
        className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <span className="text-stone-400 text-xs">or</span>
      <motion.div 
        className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      />
    </div>
  )
}

function GDutyAuthToast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="pointer-events-auto w-full max-w-sm rounded-2xl border border-emerald-200/70 bg-white/70 px-4 py-3 text-xs text-emerald-900 shadow-lg shadow-emerald-200/40 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-emerald-800">{message}</div>
        <button
          onClick={onClose}
          className="rounded-full border border-emerald-200/60 bg-white/70 px-2 py-0.5 text-[10px] text-emerald-700"
        >
          Close
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function GDutyAuthLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const GDutyAuthRouter = useRouter()
  const GDutyAuthSearchParams = useSearchParams()

  const GDutyAuthRedirectTarget = useMemo(() => {
    const raw = GDutyAuthSearchParams.get("redirect") ?? "/reported-area"
    if (raw.startsWith("/GreenSport")) return "/GreenSport"
    if (raw.startsWith("/reported-area")) return "/reported-area"
    return "/reported-area"
  }, [GDutyAuthSearchParams])

  const GDutyAuthSupabase = supabaseClient

  const GDutyAuthShowError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  const GDutyAuthNormalizeError = useCallback((message?: string) => {
    if (!message) return "Something went wrong. Please try again."
    const normalized = message.toLowerCase()
    if (normalized.includes("invalid login credentials")) {
      return "No account found or incorrect password."
    }
    if (normalized.includes("user not found")) {
      return "No account found for this email."
    }
    if (normalized.includes("email not confirmed")) {
      return "Please verify your email before signing in."
    }
    if (normalized.includes("invalid email")) {
      return "Please enter a valid email address."
    }
    if (normalized.includes("provider is not enabled")) {
      return "This social provider is not enabled yet."
    }
    if (normalized.includes("oauth")) {
      return "Social sign-in failed. Please try again."
    }
    return message
  }, [])

  useEffect(() => {
    if (!errorMessage) return
    const timer = setTimeout(() => setErrorMessage(""), 4000)
    return () => clearTimeout(timer)
  }, [errorMessage])

  useEffect(() => {
    if (!GDutyAuthSupabase) return
    let mounted = true
    GDutyAuthSupabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) {
        GDutyAuthRouter.push(GDutyAuthRedirectTarget)
      }
    })
    const { data: authListener } = GDutyAuthSupabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
        GDutyAuthRouter.push(GDutyAuthRedirectTarget)
        }
      }
    )
    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [GDutyAuthSupabase, GDutyAuthRouter, GDutyAuthRedirectTarget])

  const GDutyAuthLogin = useCallback(async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      GDutyAuthShowError("Enter your email and password.")
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await GDutyAuthSupabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (error) {
        GDutyAuthShowError(GDutyAuthNormalizeError(error.message))
        return
      }
      if (!data?.session) {
        GDutyAuthShowError("Unable to start session. Please try again.")
        return
      }
      GDutyAuthRouter.push(GDutyAuthRedirectTarget)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed."
      GDutyAuthShowError(GDutyAuthNormalizeError(message))
    } finally {
      setIsLoading(false)
    }
  }, [
    GDutyAuthSupabase,
    email,
    password,
    GDutyAuthShowError,
    GDutyAuthRouter,
    GDutyAuthNormalizeError,
    GDutyAuthRedirectTarget,
  ])

  const GDutyAuthLoginWithGoogle = useCallback(async () => {
    if (typeof window === "undefined") return
    setIsOAuthLoading(true)
    const redirectBase = GDutyAuthSiteUrl
      ? GDutyAuthSiteUrl.replace(/\/+$/, "")
      : window.location.origin
    try {
      const { error } = await GDutyAuthSupabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectBase}${GDutyAuthRedirectTarget}`,
        },
      })
      if (error) {
        GDutyAuthShowError(GDutyAuthNormalizeError(error.message))
        setIsOAuthLoading(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed."
      GDutyAuthShowError(GDutyAuthNormalizeError(message))
      setIsOAuthLoading(false)
    }
  }, [GDutyAuthSupabase, GDutyAuthShowError, GDutyAuthNormalizeError, GDutyAuthRedirectTarget])

  return (
    <div className="min-h-svh w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-stone-50 via-emerald-50/40 to-stone-100 py-6 px-4">
      <AnimatePresence>
        {errorMessage && (
          <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full -translate-x-1/2 px-4">
            <div className="pointer-events-auto mx-auto flex w-full max-w-sm justify-center">
              <GDutyAuthToast
                message={errorMessage}
                onClose={() => setErrorMessage("")}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {/* ═══ LAYERED ANIMATED BACKGROUND ═══ */}
      
      {/* Base Aurora Waves */}
      <GDutyAuthAurora 
        className="w-[800px] h-[600px] -top-40 -left-40 bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent rounded-full blur-3xl"
        delay={0}
      />
      <GDutyAuthAurora 
        className="w-[600px] h-[500px] -bottom-32 -right-32 bg-gradient-to-tl from-emerald-300/30 via-green-100/20 to-transparent rounded-full blur-3xl"
        delay={5}
      />
      <GDutyAuthAurora 
        className="w-[400px] h-[400px] top-1/4 right-1/4 bg-gradient-to-bl from-teal-200/25 to-transparent rounded-full blur-2xl"
        delay={8}
      />

      {/* Morphing Blobs */}
      <GDutyAuthMorphBlob 
        className="w-48 h-48 sm:w-72 sm:h-72 top-10 left-10 blur-2xl"
        color="rgba(16, 185, 129, 0.12)"
        delay={0}
      />
      <GDutyAuthMorphBlob 
        className="w-40 h-40 sm:w-56 sm:h-56 bottom-20 right-10 blur-2xl"
        color="rgba(20, 184, 166, 0.1)"
        delay={3}
      />

      {/* Light Rays - Hidden on mobile */}
      <div className="hidden sm:block">
        <GDutyAuthLightRay delay={0} angle={-15} x="10%" />
        <GDutyAuthLightRay delay={2} angle={10} x="70%" />
        <GDutyAuthLightRay delay={4} angle={-5} x="85%" />
      </div>

      {/* Floating Orbs - Firefly effect */}
      <GDutyAuthOrb delay={0} duration={12} size={8} color="rgba(16, 185, 129, 0.6)" initialX="15%" initialY="25%" />
      <GDutyAuthOrb delay={2} duration={10} size={6} color="rgba(20, 184, 166, 0.5)" initialX="80%" initialY="20%" />
      <GDutyAuthOrb delay={4} duration={14} size={10} color="rgba(16, 185, 129, 0.4)" initialX="25%" initialY="70%" />
      <GDutyAuthOrb delay={1} duration={11} size={5} color="rgba(52, 211, 153, 0.5)" initialX="70%" initialY="65%" />
      <GDutyAuthOrb delay={3} duration={13} size={7} color="rgba(16, 185, 129, 0.5)" initialX="50%" initialY="15%" />
      <GDutyAuthOrb delay={5} duration={9} size={4} color="rgba(20, 184, 166, 0.6)" initialX="90%" initialY="45%" />
      <GDutyAuthOrb delay={2.5} duration={15} size={9} color="rgba(16, 185, 129, 0.35)" initialX="5%" initialY="50%" />

      {/* Rising Particles */}
      {[...Array(12)].map((_, i) => (
        <GDutyAuthParticle key={i} delay={i * 0.8} x={`${5 + i * 8}%`} />
      ))}

      {/* Ripple Effects */}
      <GDutyAuthRipple delay={0} x="20%" y="30%" />
      <GDutyAuthRipple delay={2} x="75%" y="60%" />
      <GDutyAuthRipple delay={4} x="40%" y="80%" />

      {/* Floating Leaves - Hidden on very small screens */}
      <div className="hidden sm:block">
        <GDutyAuthFloatingLeaf delay={0} x="5%" y="15%" rotation={-20} />
        <GDutyAuthFloatingLeaf delay={1.5} x="92%" y="20%" rotation={15} />
        <GDutyAuthFloatingLeaf delay={0.8} x="8%" y="75%" rotation={-10} />
        <GDutyAuthFloatingLeaf delay={2.2} x="88%" y="70%" rotation={25} />
        <GDutyAuthFloatingLeaf delay={3} x="45%" y="5%" rotation={0} />
        <GDutyAuthFloatingLeaf delay={1.2} x="60%" y="90%" rotation={-15} />
      </div>

      {/* ═══ MAIN LOGIN CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-xs sm:max-w-sm z-10"
      >
        {/* Card Glow Effect */}
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 via-teal-300/20 to-emerald-400/20 rounded-2xl blur-xl"
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main Card */}
        <div className="relative bg-white/70 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-2xl shadow-emerald-900/10">
          
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/50 via-transparent to-emerald-50/30 pointer-events-none" />
          
          {/* Logo & Header */}
          <div className="relative text-center mb-4 sm:mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
              className="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 mb-3 sm:mb-4 shadow-lg shadow-emerald-500/30"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <GDutyAuthLeafIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
            </motion.div>
            <motion.h1 
              className="text-lg sm:text-2xl font-semibold text-stone-800 mb-0.5 sm:mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Welcome back
            </motion.h1>
            <motion.p 
              className="text-stone-500 text-xs sm:text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Sign in to your GreenDuty account
            </motion.p>
          </div>

          {/* Login Form */}
          <motion.form 
            className="relative space-y-2.5 sm:space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onSubmit={(e) => {
              e.preventDefault()
              GDutyAuthLogin()
            }}
          >
            <GDutyAuthInput
              icon={<GDutyAuthMailIcon className="w-full h-full" />}
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />

            <GDutyAuthInput
              icon={<GDutyAuthLockIcon className="w-full h-full" />}
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            />

            <div className="text-right">
              <motion.a 
                href="#" 
                className="text-emerald-600 text-xs hover:text-emerald-700 transition-colors"
                whileHover={{ x: 2 }}
              >
                Forgot password?
              </motion.a>
            </div>

            <GDutyAuthButton
              type="submit"
              variant="primary"
              loading={isLoading}
              loadingText="Signing in..."
              disabled={isLoading}
            >
              Sign in
            </GDutyAuthButton>

            {errorMessage && (
              <div className="rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
                {errorMessage}
              </div>
            )}

            <GDutyAuthDivider />

            <GDutyAuthButton
              variant="secondary"
              onClick={GDutyAuthLoginWithGoogle}
              loading={isOAuthLoading}
              loadingText="Connecting..."
            >
              <span className="flex items-center justify-center gap-3">
                <GDutyAuthGoogleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Continue with Google
              </span>
            </GDutyAuthButton>
          </motion.form>

          {/* Footer */}
          <motion.div 
            className="relative mt-4 sm:mt-5 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-stone-500 text-xs">
              Don&apos;t have an account?{" "}
              <motion.a 
                href={`/register?redirect=${encodeURIComponent(GDutyAuthRedirectTarget)}`} 
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                Sign up
              </motion.a>
            </p>
          </motion.div>
        </div>

        {/* Branding */}
        <motion.div 
          className="mt-3 sm:mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-stone-400 text-xs flex items-center justify-center gap-1.5">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <GDutyAuthLeafIcon className="w-3.5 h-3.5" />
            </motion.span>
            GreenDuty
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}
