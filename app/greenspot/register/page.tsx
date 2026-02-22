"use client";

import { Suspense, useCallback, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { greenspotClient, supabaseClient } from "@/lib/supabase/client";
import { GreenspotAuthLayout } from "@/components/greenspot-auth-layout";

const greenspotSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

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

export default function GreenspotRegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <GreenspotRegisterPage />
    </Suspense>
  );
}

function GreenspotRegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    if (normalized.includes("already registered") || normalized.includes("user already registered")) {
      return "This email is already registered.";
    }
    if (normalized.includes("invalid email")) return "Please enter a valid email address.";
    if (normalized.includes("password")) return "Password should be at least 6 characters.";
    return message;
  }, []);

  const isFormValid =
    formData.fullName.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!isFormValid) {
        setError("Please complete all fields and confirm your password.");
        return;
      }

      setLoading(true);
      setError("");
      setNotice("");

      const fullName = formData.fullName.trim();
      const emailValue = formData.email.trim();
      const redirectBase = greenspotSiteUrl
        ? greenspotSiteUrl.replace(/\/+$/, "")
        : typeof window !== "undefined"
          ? window.location.origin
          : "";

      try {
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email: emailValue,
          password: formData.password,
          options: {
            emailRedirectTo: redirectBase ? `${redirectBase}${redirectTarget}` : undefined,
            data: {
              full_name: fullName,
              username: fullName,
            },
          },
        });

        if (signUpError) {
          setError(normalizeError(signUpError.message));
          return;
        }

        const user = data.user;
        if (user) {
          const fallbackName = fullName || user.email?.split("@")[0] || "GreenSpot Member";
          const { error: profileError } = await greenspotClient
            .from("greenspot_profiles")
            .upsert(
              {
                id: user.id,
                email: user.email ?? emailValue,
                username: fallbackName,
                full_name: fullName || null,
                avatar_url:
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.picture ??
                  null,
              },
              { onConflict: "id" }
            );
          if (profileError) {
            setError("Profile setup failed. Please try again.");
          }
        }

        if (!data.session) {
          setNotice("Account created. Check your email to confirm before signing in.");
          setTimeout(() => {
            router.push(`/greenspot/login?redirect=${encodeURIComponent(redirectTarget)}`);
          }, 1400);
          return;
        }

        router.push(redirectTarget);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed.";
        setError(normalizeError(message));
      } finally {
        setLoading(false);
      }
    },
    [formData, isFormValid, normalizeError, redirectTarget, router]
  );

  return (
    <GreenspotAuthLayout
      eyebrow="Get Started"
      title="Create account"
      subtitle="Join GreenSpot and help build healthier cities."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href={`/greenspot/login?redirect=${encodeURIComponent(redirectTarget)}`}
            className="font-semibold text-emerald-700 dark:text-emerald-200 green:text-emerald-200"
          >
            Sign in
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

        <form className="space-y-5" onSubmit={handleSubmit}>
          <AuthField
            label="Full name"
            icon={<User className="h-4 w-4" />}
            type="text"
            name="fullName"
            placeholder="Jane Doe"
            value={formData.fullName}
            onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
            onInput={(event) =>
              setFormData({ ...formData, fullName: (event.target as HTMLInputElement).value })
            }
            autoComplete="name"
          />
          <AuthField
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            onInput={(event) =>
              setFormData({ ...formData, email: (event.target as HTMLInputElement).value })
            }
          />
          <AuthField
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            onInput={(event) =>
              setFormData({ ...formData, password: (event.target as HTMLInputElement).value })
            }
          />
          <AuthField
            label="Confirm password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
            onInput={(event) =>
              setFormData({
                ...formData,
                confirmPassword: (event.target as HTMLInputElement).value,
              })
            }
          />

          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <div className="text-xs text-rose-500 dark:text-rose-200 green:text-rose-200">Passwords do not match.</div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 green:border-rose-500/40 green:bg-rose-500/10 green:text-rose-200">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200 green:border-emerald-400/40 green:bg-emerald-500/10 green:text-emerald-200">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-300/40 transition hover:from-emerald-600 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-4 px-4 text-center text-xs leading-relaxed text-slate-500 dark:text-white/60 green:text-white/60">
            You can request verification after signing up to unlock academic features.
          </p>
        </form>
      </>
    </GreenspotAuthLayout>
  );
}



