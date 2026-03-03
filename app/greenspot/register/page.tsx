"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { greenspotClient, supabaseClient } from "@/lib/supabase/client";
import { buildOAuthRedirect } from "@/lib/auth/build-oauth-redirect";

const greenspotSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/* ── Keyframes injected once ── */
const animCSS = `
@keyframes gd-drift{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.05)}50%{transform:translate(-20px,15px) scale(.97)}75%{transform:translate(15px,25px) scale(1.03)}}
@keyframes gd-drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,20px) scale(1.04)}66%{transform:translate(20px,-15px) scale(.96)}}
@keyframes gd-pulse-ring{0%{box-shadow:0 0 0 0 rgba(52,211,153,.25)}70%{box-shadow:0 0 0 10px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
`;

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
      const emailRedirectTo = buildOAuthRedirect(redirectTarget, {
        siteUrl: greenspotSiteUrl,
        origin:
          typeof window !== "undefined" ? window.location.origin : undefined,
        fallbackPath: "/greenspot/reported-green",
      });

      try {
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email: emailValue,
          password: formData.password,
          options: {
            emailRedirectTo,
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
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#060e0b]">
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />

      {/* ══════ Ambient background canvas ══════ */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[120px]" style={{ animation: "gd-drift 18s ease-in-out infinite" }} />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-teal-500/15 blur-[140px]" style={{ animation: "gd-drift2 22s ease-in-out infinite" }} />
        <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" style={{ animation: "gd-drift 15s ease-in-out infinite reverse" }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* ══════ Page grid ══════ */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">

        {/* ── Left: Branding cinematic column ── */}
        <div className="relative flex flex-col justify-between px-6 pb-8 pt-8 sm:px-10 lg:w-[50%] lg:px-14 lg:py-14">
          <Link href="/" className="group inline-flex w-fit items-center gap-2 text-[11px] font-medium tracking-wide text-white/40 transition-colors duration-300 hover:text-emerald-400">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 transition-colors duration-300 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10">
              <Image src="/logo.png" alt="GreenDuty" width={28} height={28} className="h-full w-full object-cover" />
            </span>
            GreenDuty
          </Link>

          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              GreenSpot
            </div>

            <h2 className="mt-8 text-[clamp(2rem,3.4vw,3.25rem)] font-extralight leading-[1.12] tracking-tight text-white">
              Build healthier
              <br />
              <span className="font-semibold text-emerald-400">cities</span> together
            </h2>

            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-white/35">
              Join GreenSpot and help build healthier communities through
              verified action, green missions, and transparent reporting.
            </p>

            <div className="mt-12 flex flex-col gap-4">
              {[
                { icon: Lock, label: "Encrypted sign-up flow" },
                { icon: ShieldCheck, label: "Verified green missions" },
                { icon: Leaf, label: "Community-driven impact" },
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

          <div className="hidden text-[10px] font-medium uppercase tracking-[0.3em] text-white/15 lg:block">
            &copy; {new Date().getFullYear()} GreenDuty
          </div>
        </div>

        {/* ── Right: Glass form column ── */}
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8 lg:px-14 lg:py-14">
          <div className="w-full max-w-[420px]">

            <Link href="/" className="group mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-white/35 transition-colors duration-200 hover:text-emerald-400">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to GreenDuty
            </Link>

            {/* Glass card */}
            <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.04] p-7 shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:rounded-3xl sm:p-10">
              <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                <Sparkles className="h-3 w-3" />
                Create Account
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                Join GreenSpot
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">
                Create your account and help build healthier cities.
              </p>

              {/* ── Form ── */}
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Full Name</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <User className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Jane Doe"
                      value={formData.fullName}
                      onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                      onInput={(event) => setFormData({ ...formData, fullName: (event.target as HTMLInputElement).value })}
                      autoComplete="name"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Email</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Mail className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      onInput={(event) => setFormData({ ...formData, email: (event.target as HTMLInputElement).value })}
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Password</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      onInput={(event) => setFormData({ ...formData, password: (event.target as HTMLInputElement).value })}
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Confirm Password</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                      onInput={(event) => setFormData({ ...formData, confirmPassword: (event.target as HTMLInputElement).value })}
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1.5 text-[11px] text-rose-400">Passwords do not match.</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[12px] text-rose-300">
                    <span className="mt-px shrink-0 text-rose-400">!</span>
                    {error}
                  </div>
                )}

                {/* Notice */}
                {notice && (
                  <div className="flex gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2.5 text-[12px] text-emerald-300">
                    <span className="mt-px shrink-0 text-emerald-400">&#10003;</span>
                    {notice}
                  </div>
                )}

                {/* Info */}
                <p className="text-[11px] leading-relaxed text-white/25">
                  You can request verification after signing up to unlock academic features.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {loading ? "Creating account\u2026" : "Create Account"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>

              {/* Footer */}
              <p className="mt-8 text-center text-[12px] text-white/30">
                Already have an account?{" "}
                <Link
                  href={`/greenspot/login?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="font-semibold text-emerald-400/80 transition-colors hover:text-emerald-300"
                >
                  Sign in
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
