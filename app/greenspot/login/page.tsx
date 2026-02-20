"use client";

import { Suspense, useCallback, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { GreenspotAuthLayout } from "@/components/greenspot-auth-layout";

function AuthField({
  label,
  icon,
  ...props
}: { label: string; icon: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700/70 dark:text-emerald-200/70 green:text-emerald-200/70">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-3 border-b border-emerald-200 pb-2 transition-colors focus-within:border-emerald-500 dark:border-emerald-400/30 green:border-emerald-400/30">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200 green:bg-emerald-500/10 green:text-emerald-200">
          {icon}
        </div>
        <input
          {...props}
          className="w-full bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none dark:text-white/80 dark:placeholder:text-white/40 green:text-white/80 green:placeholder:text-white/40"
        />
      </div>
    </label>
  );
}

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

export default function GreenspotLoginPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <GreenspotLoginPage />
    </Suspense>
  );
}

function GreenspotLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTarget = useMemo(() => {
    const raw = searchParams.get("redirect") ?? "/greenspot/reported-green";
    if (raw.startsWith("/greenspot")) return raw;
    return "/greenspot/reported-green";
  }, [searchParams]);

  const normalizeError = useCallback((message?: string) => {
    if (!message) return "Something went wrong. Please try again.";
    const normalized = message.toLowerCase();
    if (normalized.includes("invalid login credentials")) return "No account found or incorrect password.";
    if (normalized.includes("email not confirmed")) return "Please verify your email before signing in.";
    if (normalized.includes("invalid email")) return "Please enter a valid email address.";
    return message;
  }, []);

  const handleLogin = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError("Enter your email and password.");
        return;
      }
      setLoading(true);
      setError("");

      try {
        const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError(normalizeError(signInError.message));
          return;
        }
        if (!data.session) {
          setError("Unable to start session. Please try again.");
          return;
        }
        router.push(redirectTarget);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed.";
        setError(normalizeError(message));
      } finally {
        setLoading(false);
      }
    },
    [email, password, normalizeError, redirectTarget, router]
  );

  const handleGoogleLogin = useCallback(() => {
    setGoogleLoading(true);
    setError("");
    void signIn("google", { callbackUrl: "/greenspot/dashboard" }).catch(() => {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
    });
  }, []);

  return (
    <GreenspotAuthLayout
      eyebrow="Welcome"
      title="Sign in"
      subtitle="Access your GreenSpot missions and reports."
      footer={
        <span>
          New to GreenSpot?{" "}
          <Link
            href={`/greenspot/register?redirect=${encodeURIComponent(redirectTarget)}`}
            className="font-semibold text-emerald-700 dark:text-emerald-200 green:text-emerald-200"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <>
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100/80 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 green:border-emerald-400/30 green:bg-emerald-500/10 green:text-emerald-200"
          >
            Back to Home
          </Link>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <AuthField
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onInput={(event) => setEmail((event.target as HTMLInputElement).value)}
          />
          <AuthField
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onInput={(event) => setPassword((event.target as HTMLInputElement).value)}
          />

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/60 green:text-white/60">
            <span>Keep your account secure.</span>
            <button type="button" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-200 green:text-emerald-200">
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 green:border-rose-500/40 green:bg-rose-500/10 green:text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/40 transition hover:from-emerald-600 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent dark:via-emerald-400/30 green:via-emerald-400/30" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/50 green:text-white/50">or</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent dark:via-emerald-400/30 green:via-emerald-400/30" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 green:border-emerald-400/30 green:bg-emerald-500/10 green:text-emerald-200"
          >
            <GoogleIcon className="h-4 w-4" />
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <p className="mt-4 px-4 text-center text-xs leading-relaxed text-slate-500 dark:text-white/60 green:text-white/60">
            By signing in you agree to support community-led green action.
          </p>
        </form>
      </>
    </GreenspotAuthLayout>
  );
}



