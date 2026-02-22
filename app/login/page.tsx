"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Leaf, Lock, Mail } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";

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

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const redirectParam = searchParams.get("redirect")?.trim();
    if (!redirectParam) return "/reported-area";
    if (!redirectParam.startsWith("/")) return "/reported-area";
    const redirectPath = redirectParam.split("?")[0] ?? redirectParam;
    if (redirectPath === "/reported-area/dashboard") {
      return "/reported-area";
    }
    return redirectParam;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!active) return;
      if (data.session) {
        router.replace(redirectTarget);
      }
    };
    void checkSession();
    return () => {
      active = false;
    };
  }, [redirectTarget, router]);

  const normalizeAuthError = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes("invalid login credentials")) {
      return "Invalid email or password.";
    }
    if (normalized.includes("email not confirmed")) {
      return "Please verify your email before signing in.";
    }
    return message;
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(normalizeAuthError(error.message));
      setSubmitting(false);
      return;
    }

    router.replace(redirectTarget);
  }, [email, normalizeAuthError, password, redirectTarget, router, submitting]);

  const handleGoogleLogin = useCallback(async () => {
    if (oauthLoading || submitting) return;
    setOauthLoading(true);
    setErrorMessage(null);
    await signIn("google", { callbackUrl: redirectTarget });
  }, [oauthLoading, redirectTarget, submitting]);

  return (
    <div className="gd-auth-shell relative flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 via-emerald-50/35 to-stone-100 px-4 py-10">
      <div className="absolute left-4 top-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-stone-300/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-700 shadow-sm transition hover:bg-white"
        >
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-6 shadow-xl shadow-emerald-900/8 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Leaf className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-800">Welcome back</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to your GreenDuty account</p>
        </div>

        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-emerald-700 transition hover:text-emerald-800">
              Forgot password?
            </Link>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password.trim() || submitting || oauthLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">or</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={oauthLoading || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon className="h-4 w-4" />
            {oauthLoading ? "Connecting..." : "Continue with Google"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Don&apos;t have an account?{" "}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
            className="font-semibold text-emerald-700 transition hover:text-emerald-800"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function GDutyAuthLoginPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
