"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, Leaf, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
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

/* ── Password strength meter ── */

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–4
}

const strengthLabel = ["Weak", "Fair", "Good", "Strong"];
const strengthColor = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-emerald-400",
];

function PasswordStrength({ password }: { password: string }) {
  const score = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? strengthColor[score - 1] : "bg-white/[0.06]"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-white/30">{strengthLabel[score - 1] ?? "Too short"}</p>
    </div>
  );
}

/* ── Success screen after registration ── */

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
        <CheckCircle className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white">
        Check your inbox!
      </h2>
      <p className="mt-2 text-[13px] text-white/40">
        We&apos;ve sent a confirmation link to{" "}
        <span className="font-medium text-white/60">{email}</span>.
        <br />
        Click the link to activate your EDU account.
      </p>
      <Link
        href="/education/login"
        className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)]"
      >
        Go to Sign in
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/* ── Suspense Wrapper ── */

export default function EduRegisterWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <EduRegisterPage />
    </Suspense>
  );
}

/* ── Main Register Page ── */

function EduRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTarget = useMemo(() => {
    return searchParams.get("redirect") ?? "/education";
  }, [searchParams]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  /* auto-redirect if already logged in */
  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.push(redirectTarget);
    });
    return () => { mounted = false; };
  }, [router, redirectTarget]);

  /* auto-dismiss */
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const normalizeError = useCallback((msg?: string) => {
    if (!msg) return "Something went wrong. Please try again.";
    const m = msg.toLowerCase();
    if (m.includes("user already registered")) return "An account with this email already exists.";
    if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
    if (m.includes("provider is not enabled")) return "This sign-up method is not enabled.";
    if (m.includes("signup is not allowed")) return "Registration is currently disabled.";
    return msg;
  }, []);

  /* email/password register */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const emailRedirectTo = buildOAuthRedirect(redirectTarget, {
        siteUrl,
        origin: window.location.origin,
        fallbackPath: "/education",
      });
      const { error: signUpError } = await supabaseClient.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName, display_name: trimmedName },
          emailRedirectTo,
        },
      });
      if (signUpError) {
        setError(normalizeError(signUpError.message));
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(normalizeError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  };

  /* google oauth */
  const handleGoogle = async () => {
    setGoogleLoading(true);
    const redirectTo = buildOAuthRedirect(redirectTarget, {
      siteUrl,
      origin: window.location.origin,
      fallbackPath: "/education",
    });
    if (!redirectTo) {
      setGoogleLoading(false);
      setError("Google sign-in failed. Please try again.");
      return;
    }
    try {
      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
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
              Join EDU
            </div>

            <h2 className="mt-8 text-[clamp(2rem,3.4vw,3.25rem)] font-extralight leading-[1.12] tracking-tight text-white">
              Start your
              <br />
              <span className="font-semibold text-emerald-400">green</span> education
            </h2>

            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-white/35">
              Create your Green Duty Education account and access courses,
              community features, and sustainability-focused resources.
            </p>

            <div className="mt-12 flex flex-col gap-4">
              {[
                { icon: Lock, label: "Secure account creation" },
                { icon: ShieldCheck, label: "Verified learning community" },
                { icon: Leaf, label: "Sustainability curriculum" },
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

              {success ? (
                <SuccessScreen email={email.trim()} />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                    <Sparkles className="h-3 w-3" />
                    Create Account
                  </div>

                  <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                    Join EDU
                  </h1>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">
                    Create your Green Duty Education account.
                  </p>

                  {/* Error */}
                  {error && (
                    <div className="mt-5 flex gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-[12px] text-rose-300">
                      <span className="mt-px shrink-0 text-rose-400">!</span>
                      {error}
                    </div>
                  )}

                  {/* Google first for quick signup */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => void handleGoogle()}
                      disabled={googleLoading}
                      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      {googleLoading ? "Connecting\u2026" : "Sign up with Google"}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/20">or sign up with email</span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  {/* ── Form ── */}
                  <form className="space-y-5" onSubmit={handleRegister}>
                    {/* Full Name */}
                    <div className="group">
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Full Name</label>
                      <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                        <User className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
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
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
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
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          autoComplete="new-password"
                          className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-3.5 text-white/20 transition-colors hover:text-white/50">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={password} />
                    </div>

                    {/* Confirm Password */}
                    <div className="group">
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">Confirm Password</label>
                      <div className={`relative flex items-center rounded-xl border bg-white/[0.04] transition-colors duration-200 focus-within:bg-emerald-500/[0.04] ${
                        confirmPassword && confirmPassword !== password
                          ? "border-rose-500/40 focus-within:border-rose-500/40"
                          : "border-white/[0.08] focus-within:border-emerald-500/40"
                      }`}>
                        <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                        />
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="mt-1.5 text-[11px] text-rose-400">Passwords do not match</p>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {loading ? "Creating account\u2026" : "Create Account"}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  </form>

                  {/* Footer links */}
                  <div className="mt-6 space-y-3 text-center">
                    <p className="text-[12px] text-white/30">
                      Already have an account?{" "}
                      <Link
                        href={`/education/login?redirect=${encodeURIComponent(redirectTarget)}`}
                        className="font-semibold text-emerald-400/80 transition-colors hover:text-emerald-300"
                      >
                        Sign in
                      </Link>
                    </p>
                    <p className="text-[11px] text-white/20">
                      By creating an account you agree to our{" "}
                      <Link href="#" className="underline transition hover:text-white/40">Terms</Link>{" "}
                      &amp;{" "}
                      <Link href="#" className="underline transition hover:text-white/40">Privacy Policy</Link>
                    </p>
                  </div>
                </>
              )}
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
