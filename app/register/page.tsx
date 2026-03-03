"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Leaf, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { buildOAuthRedirect } from "@/lib/auth/build-oauth-redirect";

const GDutyRegisterSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/* ── SVG brand icons ── */

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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/* ── Keyframes injected once ── */
const animCSS = `
@keyframes gd-drift{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.05)}50%{transform:translate(-20px,15px) scale(.97)}75%{transform:translate(15px,25px) scale(1.03)}}
@keyframes gd-drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,20px) scale(1.04)}66%{transform:translate(20px,-15px) scale(.96)}}
@keyframes gd-pulse-ring{0%{box-shadow:0 0 0 0 rgba(52,211,153,.25)}70%{box-shadow:0 0 0 10px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(400px) rotate(720deg) scale(0);opacity:0}}
`;

/* ── Success Overlay ── */

function SuccessOverlay({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 500),
      setTimeout(() => setStage(3), 1000),
      setTimeout(onComplete, 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060e0b]/95 backdrop-blur-sm transition-opacity duration-500 ${stage >= 1 ? "opacity-100" : "opacity-0"}`}>
      {stage >= 2 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 md:h-3 md:w-3"
              style={{
                left: `${50 + (Math.random() - 0.5) * 60}%`,
                top: "50%",
                backgroundColor: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857"][i % 5],
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                animation: `confetti ${1.5 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="px-4 text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/30 transition-all duration-500 md:h-24 md:w-24 ${stage >= 1 ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
          <Check className={`h-10 w-10 text-white transition-all duration-300 delay-200 md:h-12 md:w-12 ${stage >= 2 ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
        </div>
        <h2 className={`mt-6 text-2xl font-bold text-white transition-all duration-500 md:text-3xl ${stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          Welcome to GreenDuty!
        </h2>
        <p className={`mt-2 text-white/60 transition-all delay-100 duration-500 ${stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          Your account has been created successfully
        </p>
      </div>
    </div>
  );
}

/* ── Toast ── */

function GDutyRegisterToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300 shadow-lg backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium">{message}</div>
        <button onClick={onClose} className="rounded-full border border-emerald-500/20 bg-white/5 px-2 py-0.5 text-[10px] text-emerald-400 transition hover:bg-white/10">
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Suspense Wrapper ── */

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <RegisterPage />
    </Suspense>
  );
}

/* ── Main Register Page ── */

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const GDutyAuthSearchParams = useSearchParams();

  const GDutyAuthRedirectTarget = useMemo(() => {
    const raw = GDutyAuthSearchParams.get("redirect") ?? "/reported-area";
    if (raw.startsWith("/GreenSport")) return "/GreenSport";
    if (raw.startsWith("/reported-area")) return "/reported-area";
    return "/reported-area";
  }, [GDutyAuthSearchParams]);

  const supabase = supabaseClient;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!supabase) return;
    let mountedFlag = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mountedFlag) return;
      if (data.session) {
        router.push(GDutyAuthRedirectTarget);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.push(GDutyAuthRedirectTarget);
        }
      }
    );
    return () => {
      mountedFlag = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router, GDutyAuthRedirectTarget]);

  const isFormValid =
    formData.fullName.length > 0 &&
    formData.email.length > 0 &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword &&
    agreeTerms;

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const normalizeAuthError = useCallback((message?: string) => {
    if (!message) return "Something went wrong. Please try again.";
    const normalized = message.toLowerCase();
    if (
      normalized.includes("already registered") ||
      normalized.includes("user already registered") ||
      normalized.includes("duplicate key value")
    ) {
      return "This email is already registered.";
    }
    if (normalized.includes("invalid email")) {
      return "Please enter a valid email address.";
    }
    if (normalized.includes("password")) {
      return "Password should be at least 6 characters.";
    }
    if (normalized.includes("provider is not enabled")) {
      return "This social provider is not enabled yet.";
    }
    return message;
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid) return;
      setIsLoading(true);
      const fullName = formData.fullName.trim();
      const emailValue = formData.email.trim();
      const emailRedirectTo = buildOAuthRedirect(GDutyAuthRedirectTarget, {
        siteUrl: GDutyRegisterSiteUrl,
        origin:
          typeof window !== "undefined" ? window.location.origin : undefined,
        fallbackPath: "/reported-area",
      });
      try {
        const { data, error } = await supabase.auth.signUp({
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

        if (error) {
          showError(normalizeAuthError(error.message));
          return;
        }

        const user = data.user;
        if (user) {
          const fallbackUsername = fullName || user.email?.split("@")[0] || "Eco Ranger";
          const { error: profileError } = await supabase
            .from("marketplace_profiles")
            .upsert(
              {
                id: user.id,
                email: user.email ?? emailValue,
                username: fallbackUsername,
                full_name: fullName || null,
                avatar_url:
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)
                    ?.avatar_url ??
                  (user.user_metadata as { avatar_url?: string; picture?: string } | null)
                    ?.picture ??
                  null,
                role: "buyer",
                account_tier: "basic",
                verification_status: "unverified",
              },
              { onConflict: "id" }
            );
          if (profileError) {
            showError("Profile setup failed. Please try again.");
          }
        }

        if (!data.session) {
          showError("Account created. Check your email to confirm before signing in.");
          setTimeout(() => {
            router.push(`/login?redirect=${encodeURIComponent(GDutyAuthRedirectTarget)}`);
          }, 1200);
          return;
        }

        setShowSuccess(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed.";
        showError(normalizeAuthError(message));
      } finally {
        setIsLoading(false);
      }
    },
    [
      isFormValid,
      formData,
      supabase,
      showError,
      normalizeAuthError,
      router,
      GDutyAuthRedirectTarget,
    ]
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "apple") => {
      if (typeof window === "undefined") return;
      if (provider === "google") {
        setIsGoogleLoading(true);
      } else {
        setIsAppleLoading(true);
      }
      const redirectTo = buildOAuthRedirect(GDutyAuthRedirectTarget, {
        siteUrl: GDutyRegisterSiteUrl,
        origin: window.location.origin,
        fallbackPath: "/reported-area",
      });
      if (!redirectTo) {
        showError("Unable to start social login right now.");
        setIsGoogleLoading(false);
        setIsAppleLoading(false);
        return;
      }
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });
        if (error) {
          showError(normalizeAuthError(error.message));
          setIsGoogleLoading(false);
          setIsAppleLoading(false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Social login failed.";
        showError(normalizeAuthError(message));
        setIsGoogleLoading(false);
        setIsAppleLoading(false);
      }
    },
    [supabase, showError, normalizeAuthError, GDutyAuthRedirectTarget]
  );

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#060e0b]">
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />

      {showSuccess && (
        <SuccessOverlay
          onComplete={() => {
            setShowSuccess(false);
            router.push(GDutyAuthRedirectTarget);
          }}
        />
      )}

      {errorMessage && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full -translate-x-1/2 px-4">
          <div className="pointer-events-auto mx-auto flex w-full max-w-sm justify-center">
            <GDutyRegisterToast message={errorMessage} onClose={() => setErrorMessage("")} />
          </div>
        </div>
      )}

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
              Join the Movement
            </div>

            <h2 className="mt-8 text-[clamp(2rem,3.4vw,3.25rem)] font-extralight leading-[1.12] tracking-tight text-white">
              Create your account
              <br />
              Go <span className="font-semibold text-emerald-400">green</span> today
            </h2>

            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-white/35">
              Join a community dedicated to reporting, protecting, and making our planet a better place for future generations.
            </p>

            <div className="mt-12 flex flex-col gap-4">
              {[
                { icon: Lock, label: "Secure encrypted sign-up" },
                { icon: ShieldCheck, label: "Verified community reporting" },
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
                Join GreenDuty
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">
                Create your account and start making a difference for our planet.
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
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      onInput={(e) => setFormData({ ...formData, fullName: (e.target as HTMLInputElement).value })}
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                      required
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
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onInput={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })}
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      name="email"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Password</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onInput={(e) => setFormData({ ...formData, password: (e.target as HTMLInputElement).value })}
                      autoComplete="new-password"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-3.5 text-white/20 transition-colors hover:text-white/50">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength */}
                  <div className="mt-2 flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          formData.password.length >= (i + 1) * 2
                            ? formData.password.length >= 8
                              ? "bg-emerald-400"
                              : formData.password.length >= 6
                              ? "bg-amber-400"
                              : "bg-white/20"
                            : "bg-white/[0.06]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Confirm Password</label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      onInput={(e) => setFormData({ ...formData, confirmPassword: (e.target as HTMLInputElement).value })}
                      autoComplete="new-password"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-3.5 text-white/20 transition-colors hover:text-white/50">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1.5 text-[11px] text-rose-400">Passwords do not match</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <label className="flex cursor-pointer items-start gap-3">
                  <div className="relative mt-0.5">
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="sr-only peer" />
                    <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-white/15 bg-white/[0.04] transition-all duration-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-500">
                      <Check className={`h-3 w-3 text-white transition-all duration-200 ${agreeTerms ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                    </div>
                  </div>
                  <span className="text-[12px] leading-relaxed text-white/35">
                    I agree to the{" "}
                    <Link href="/terms" className="font-medium text-emerald-400/80 transition-colors hover:text-emerald-300">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-medium text-emerald-400/80 transition-colors hover:text-emerald-300">Privacy Policy</Link>
                  </span>
                </label>

                {/* Error inline */}
                {errorMessage && (
                  <div className="flex gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[12px] text-rose-300">
                    <span className="mt-px shrink-0 text-rose-400">!</span>
                    {errorMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {isLoading ? "Creating account\u2026" : "Create Account"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/20">or</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* Social Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleOAuth("google")}
                  disabled={isGoogleLoading}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <GoogleIcon className="h-4 w-4" />
                  {isGoogleLoading ? "Connecting\u2026" : "Continue with Google"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOAuth("apple")}
                  disabled={isAppleLoading}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <AppleIcon className="h-4 w-4" />
                  {isAppleLoading ? "Connecting\u2026" : "Continue with Apple"}
                </button>
              </div>

              {/* Footer */}
              <p className="mt-8 text-center text-[12px] text-white/30">
                Already have an account?{" "}
                <Link
                  href={`/login?redirect=${encodeURIComponent(GDutyAuthRedirectTarget)}`}
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
