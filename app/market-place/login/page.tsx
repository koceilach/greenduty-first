"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf, Lock, Mail } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

export default function MarketplaceLoginPage() {
  const { user, profile, signIn, loading } = useMarketplaceAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    const result = await signIn({ email: email.trim(), password });
    if (result.error) {
      setMessage(result.error);
      setSubmitting(false);
      return;
    }
    setMessage(null);
    router.replace("/market-place");
  }, [canSubmit, submitting, signIn, email, password, router]);

  return (
    <div className="gd-mp-sub relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
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
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              {message && (
                <div className="rounded-2xl border border-rose-200/20 bg-rose-200/10 px-4 py-3 text-xs text-rose-100">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Enter Marketplace"}
                <ArrowRight className="h-4 w-4" />
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
