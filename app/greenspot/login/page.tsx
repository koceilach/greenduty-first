"use client";

import { useCallback, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function GreenspotLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/40 transition hover:from-emerald-600 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Login"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="mt-4 px-4 text-center text-xs leading-relaxed text-slate-500 dark:text-white/60 green:text-white/60">
          By signing in you agree to support community-led green action.
        </p>
      </form>
    </GreenspotAuthLayout>
  );
}
