"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf, Lock, Mail } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function MarketplaceLoginPage() {
  const { user, profile, signIn: signInWithPassword, loading, supabase } =
    useMarketplaceAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password]
  );

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace("/market-place");
    }
  }, [loading, user, profile, router]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setMessage(result.error);
      setSubmitting(false);
      return;
    }
    setMessage(null);
    router.replace("/market-place");
  }, [canSubmit, submitting, signInWithPassword, email, password, router]);

  const handleGoogleLogin = useCallback(async () => {
    if (!supabase) {
      setMessage("Google sign-in is unavailable right now.");
      return;
    }
    setGoogleLoading(true);
    setMessage(null);
    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/market-place`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      setGoogleLoading(false);
      setMessage("Google sign-in failed. Please try again.");
    }
  }, [supabase]);

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="gd-mp-container relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-200/20"
            >
              Back to Home
            </Link>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              <Leaf className="h-4 w-4" />
              Marketplace Access
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-2 text-sm text-white/60">
              Sign in to manage orders, follow sellers, and track your eco impact.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@marketplace.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-emerald-200 transition hover:text-emerald-100"
                >
                  Forgot password?
                </Link>
              </div>

              {message && (
                <div className="rounded-2xl border border-rose-200/20 bg-rose-200/10 px-4 py-3 text-xs text-rose-100">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting || googleLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Enter Marketplace"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="my-1 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">or</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon className="h-4 w-4" />
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-white/60">
              New to the marketplace?{" "}
              <Link
                href="/market-place/register"
                className="font-semibold text-emerald-200 transition hover:text-emerald-100"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="mt-5 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
            GreenDuty Marketplace Login
          </div>
        </div>
      </div>
    </div>
  );
}




