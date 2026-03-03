"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { buildOAuthRedirect } from "@/lib/auth/build-oauth-redirect";

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

/* ── Keyframes injected once ── */
const animCSS = `
@keyframes gd-drift{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.05)}50%{transform:translate(-20px,15px) scale(.97)}75%{transform:translate(15px,25px) scale(1.03)}}
@keyframes gd-drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,20px) scale(1.04)}66%{transform:translate(20px,-15px) scale(.96)}}
@keyframes gd-pulse-ring{0%{box-shadow:0 0 0 0 rgba(52,211,153,.25)}70%{box-shadow:0 0 0 10px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
`;

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
    const redirectTo = buildOAuthRedirect("/market-place", {
      origin: window.location.origin,
      fallbackPath: "/market-place",
    });
    if (!redirectTo) {
      setGoogleLoading(false);
      setMessage("Google sign-in failed. Please try again.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setGoogleLoading(false);
      setMessage("Google sign-in failed. Please try again.");
    }
  }, [supabase]);

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#060e0b]">
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />

      {/* ══════ Ambient background canvas ══════ */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Mesh gradient blobs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[120px]" style={{ animation: "gd-drift 18s ease-in-out infinite" }} />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-teal-500/15 blur-[140px]" style={{ animation: "gd-drift2 22s ease-in-out infinite" }} />
        <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" style={{ animation: "gd-drift 15s ease-in-out infinite reverse" }} />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* ══════ Page grid ══════ */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">

        {/* ── Left: Branding cinematic column ── */}
        <div className="relative flex flex-col justify-between px-6 pb-8 pt-8 sm:px-10 lg:w-[50%] lg:px-14 lg:py-14">
          {/* Top nav */}
          <Link
            href="/"
            className="group inline-flex w-fit items-center gap-2 text-[11px] font-medium tracking-wide text-white/40 transition-colors duration-300 hover:text-emerald-400"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 transition-colors duration-300 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10">
              <Image src="/logo.png" alt="GreenDuty" width={28} height={28} className="h-full w-full object-cover" />
            </span>
            GreenDuty
          </Link>

          {/* Hero copy — hidden on mobile, star on desktop */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Trusted Marketplace
            </div>

            <h2 className="mt-8 text-[clamp(2rem,3.4vw,3.25rem)] font-extralight leading-[1.12] tracking-tight text-white">
              Where sustainable
              <br />
              commerce <span className="font-semibold text-emerald-400">thrives</span>
            </h2>

            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-white/35">
              Buy and sell with confidence through a marketplace built on privacy,
              identity verification, and transaction safety.
            </p>

            <div className="mt-12 flex flex-col gap-4">
              {[
                { icon: Lock, label: "End-to-end encrypted sessions" },
                { icon: ShieldCheck, label: "Verified seller ecosystem" },
                { icon: Leaf, label: "Climate-conscious by design" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                    <Icon className="h-3.5 w-3.5 text-emerald-400/70" />
                  </span>
                  <span className="text-[13px] text-white/40">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stamp */}
          <div className="hidden text-[10px] font-medium uppercase tracking-[0.3em] text-white/15 lg:block">
            &copy; {new Date().getFullYear()} GreenDuty
          </div>
        </div>

        {/* ── Right: Glass form column ── */}
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8 lg:px-14 lg:py-14">
          <div className="w-full max-w-[420px]">

            {/* Back to homepage */}
            <Link
              href="/"
              className="group mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-white/35 transition-colors duration-200 hover:text-emerald-400"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to GreenDuty
            </Link>

            {/* Glass card */}
            <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.04] p-7 shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:rounded-3xl sm:p-10">
              {/* Subtle top glow line */}
              <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

              {/* Card header */}
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                <Sparkles className="h-3 w-3" />
                Sign In
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                Welcome back
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">
                Sign in to manage orders, follow sellers, and track your eco impact.
              </p>

              {/* ── Form fields ── */}
              <div className="mt-8 space-y-6">
                {/* Email */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Email
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Mail className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@marketplace.com"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[10px] font-medium text-white/25 transition-colors hover:text-emerald-400"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Error */}
                {message && (
                  <div className="flex gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[12px] text-rose-300">
                    <span className="mt-px shrink-0 text-rose-400">!</span>
                    {message}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting || googleLoading}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {submitting ? "Signing in\u2026" : "Enter Marketplace"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-white/20">or</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || submitting}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <GoogleIcon className="h-4 w-4" />
                  {googleLoading ? "Connecting\u2026" : "Continue with Google"}
                </button>
              </div>

              {/* Footer */}
              <p className="mt-8 text-center text-[12px] text-white/30">
                New to the marketplace?{" "}
                <Link
                  href="/market-place/register"
                  className="font-semibold text-emerald-400/80 transition-colors hover:text-emerald-300"
                >
                  Create an account
                </Link>
              </p>
            </div>

            {/* Trust strip below card */}
            <div className="mt-6 flex items-center justify-center gap-5">
              <span className="flex items-center gap-1.5 text-[10px] text-white/20">
                <Lock className="h-3 w-3" style={{ animation: "gd-pulse-ring 3s infinite" }} />
                Encrypted
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5 text-[10px] text-white/20">
                <ShieldCheck className="h-3 w-3" />
                Secure
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5 text-[10px] text-white/20">
                <Leaf className="h-3 w-3" />
                Eco-first
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}




