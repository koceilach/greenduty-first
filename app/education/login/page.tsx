"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Sprout,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   EDUCATION LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function EduLoginWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F8F7] dark:bg-slate-950">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      }
    >
      <EduLoginPage />
    </Suspense>
  );
}

/* ── animated background elements ──────────────────────────────────────────── */

function FloatingOrb({ cx, cy, r, delay, color }: { cx: string; cy: string; r: number; delay: number; color: string }) {
  return (
    <div
      className="pointer-events-none absolute animate-pulse rounded-full blur-2xl"
      style={{
        left: cx,
        top: cy,
        width: r,
        height: r,
        background: color,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + delay}s`,
      }}
    />
  );
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30" />

      {/* Orbs */}
      <FloatingOrb cx="-5%" cy="10%" r={400} delay={0} color="rgba(16,185,129,0.08)" />
      <FloatingOrb cx="70%" cy="-10%" r={350} delay={2} color="rgba(20,184,166,0.07)" />
      <FloatingOrb cx="50%" cy="70%" r={300} delay={4} color="rgba(16,185,129,0.06)" />
      <FloatingOrb cx="20%" cy="60%" r={200} delay={1} color="rgba(52,211,153,0.08)" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating leaf icons */}
      <div className="absolute left-[8%] top-[18%] animate-bounce text-emerald-300/20 dark:text-emerald-800/20" style={{ animationDuration: "6s" }}>
        <Leaf className="h-16 w-16 rotate-[-20deg]" />
      </div>
      <div className="absolute right-[12%] top-[22%] animate-bounce text-teal-300/15 dark:text-teal-800/15" style={{ animationDuration: "8s", animationDelay: "2s" }}>
        <Sprout className="h-12 w-12 rotate-[15deg]" />
      </div>
      <div className="absolute bottom-[20%] left-[15%] animate-bounce text-emerald-200/20 dark:text-emerald-900/20" style={{ animationDuration: "7s", animationDelay: "1s" }}>
        <BookOpen className="h-14 w-14 rotate-[-10deg]" />
      </div>
      <div className="absolute bottom-[15%] right-[8%] animate-bounce text-teal-200/15 dark:text-teal-900/15" style={{ animationDuration: "9s", animationDelay: "3s" }}>
        <Leaf className="h-10 w-10 rotate-[30deg]" />
      </div>
    </div>
  );
}

/* ── main component ────────────────────────────────────────────────────────── */

function EduLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTarget = useMemo(() => {
    return searchParams.get("redirect") ?? "/education";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  /* auto-redirect if already logged in */
  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.push(redirectTarget);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_ev, session) => {
      if (session) router.push(redirectTarget);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, redirectTarget]);

  /* auto-dismiss error */
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const normalizeError = useCallback((msg?: string) => {
    if (!msg) return "Something went wrong. Please try again.";
    const m = msg.toLowerCase();
    if (m.includes("invalid login credentials")) return "Invalid email or password.";
    if (m.includes("email not confirmed")) return "Please verify your email first.";
    if (m.includes("user not found")) return "No account found for this email.";
    if (m.includes("provider is not enabled")) return "This sign-in method is not enabled.";
    return msg;
  }, []);

  /* email/password login */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (authError) {
        setError(normalizeError(authError.message));
        return;
      }
      if (!data.session) {
        setError("Unable to create session. Try again.");
        return;
      }
      router.push(redirectTarget);
    } catch (err) {
      setError(normalizeError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  /* google oauth */
  const handleGoogle = async () => {
    setGoogleLoading(true);
    const base = siteUrl ? siteUrl.replace(/\/+$/, "") : window.location.origin;
    try {
      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${base}/auth/callback?next=${encodeURIComponent(redirectTarget)}` },
      });
      if (oauthError) {
        setError(normalizeError(oauthError.message));
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(normalizeError(err instanceof Error ? err.message : undefined));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4 py-10">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Glow */}
        <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald-400/15 via-teal-300/10 to-emerald-400/15 blur-2xl" />

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-2xl shadow-emerald-900/10 backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-900/70">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-[#1E7F43] via-emerald-400 to-teal-500" />

          <div className="px-8 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E7F43] to-emerald-500 shadow-lg shadow-emerald-500/30">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Welcome to EDU
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Sign in to access Green Duty Education
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white/60 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1E7F43] focus:ring-2 focus:ring-[#1E7F43]/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-white/60 py-3 pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1E7F43] focus:ring-2 focus:ring-[#1E7F43]/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <Link
                  href="#"
                  className="text-xs font-medium text-[#1E7F43] transition hover:text-emerald-700"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1E7F43] to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-60"
              >
                {/* shimmer */}
                <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Signing in..." : "Sign in"}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/70 py-3 text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/education/register?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="font-semibold text-[#1E7F43] transition hover:text-emerald-700"
                >
                  Sign up
                </Link>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                <Link href="/" className="transition hover:text-slate-600 dark:hover:text-slate-300">
                  ← Back to Green Duty
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Leaf className="h-3.5 w-3.5" />
          <span>Green Duty EDU</span>
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
