"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

/* ── Keyframes injected once ── */
const animCSS = `
@keyframes gd-drift{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.05)}50%{transform:translate(-20px,15px) scale(.97)}75%{transform:translate(15px,25px) scale(1.03)}}
@keyframes gd-drift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,20px) scale(1.04)}66%{transform:translate(20px,-15px) scale(.96)}}
@keyframes gd-pulse-ring{0%{box-shadow:0 0 0 0 rgba(52,211,153,.25)}70%{box-shadow:0 0 0 10px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
`;

export default function MarketplaceRegisterPage() {
  const { signUp, signIn, signOut } = useMarketplaceAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "info">("error");

  const canSubmit = useMemo(
    () =>
      email.trim().length > 0 &&
      username.trim().length > 1 &&
      password.trim().length >= 6,
    [email, username, password]
  );


  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await signUp({
      email: email.trim(),
      password,
      username: username.trim(),
    });
    if (result.error) {
      // If user already exists in auth (e.g. from Reported Area), try signing in
      if (
        result.error.toLowerCase().includes("already registered") ||
        result.error.toLowerCase().includes("already been registered")
      ) {
        const signInResult = await signIn({
          email: email.trim(),
          password,
        });
        if (!signInResult.error) {
          // Signed in successfully; marketplace profile is auto-created.
          setMessage("Welcome! Your marketplace profile has been set up.");
          setMessageType("info");
          setSubmitting(false);
          router.replace("/market-place");
          return;
        }
        // Sign-in also failed, likely due to an incorrect password.
        setMessage(
          "This email already has a GreenDuty account. Please go to the login page and use your existing GreenDuty password."
        );
        setMessageType("error");
        setSubmitting(false);
        return;
      }
      setMessage(result.error);
      setMessageType("error");
      setSubmitting(false);
      return;
    }
    setMessage("Marketplace account created. Please log in.");
    await signOut();
    setSubmitting(false);
    router.replace("/market-place/login");
  }, [canSubmit, submitting, signUp, signOut, email, password, username, router]);

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

          {/* Hero copy — desktop only */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Secure Onboarding
            </div>

            <h2 className="mt-8 text-[clamp(2rem,3.4vw,3.25rem)] font-extralight leading-[1.12] tracking-tight text-white">
              Start your journey
              <br />
              in a <span className="font-semibold text-emerald-400">greener</span> market
            </h2>

            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-white/35">
              Your buyer profile gives you a secure foundation for verified orders,
              trusted sellers, and protected marketplace transactions.
            </p>

            <div className="mt-12 flex flex-col gap-4">
              {[
                { icon: Lock, label: "Encrypted sign-up flow" },
                { icon: ShieldCheck, label: "Full security checks on every action" },
                { icon: Leaf, label: "Smooth path from buyer to seller" },
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
                Create Account
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                Create your buyer profile
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">
                New marketplace accounts start as buyers. You can apply to become a
                seller after registration.
              </p>

              {/* ── Form fields ── */}
              <div className="mt-8 space-y-5">
                {/* Display name */}
                <div className="group">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Display Name
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <User className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Green grower"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

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
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Password
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.04]">
                    <Lock className="ml-3.5 h-4 w-4 shrink-0 text-white/20 transition-colors duration-200 group-focus-within:text-emerald-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full border-none bg-transparent px-3 py-3 text-[13px] text-white shadow-[0_0_0_1000px_transparent_inset] outline-none placeholder:text-white/20 [-webkit-text-fill-color:inherit]"
                    />
                  </div>
                </div>

                {/* Password strength indicator */}
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        password.length >= (i + 1) * 2
                          ? password.length >= 8
                            ? "bg-emerald-400"
                            : password.length >= 6
                            ? "bg-amber-400"
                            : "bg-white/20"
                          : "bg-white/[0.06]"
                      }`}
                    />
                  ))}
                </div>

                {/* Message */}
                {message && (
                  <div className={`flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-[12px] ${
                    messageType === "info"
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
                      : "border-rose-500/20 bg-rose-500/[0.06] text-rose-300"
                  }`}>
                    <span className={`mt-px shrink-0 ${messageType === "info" ? "text-emerald-400" : "text-rose-400"}`}>
                      {messageType === "info" ? "\u2713" : "!"}
                    </span>
                    {message}
                  </div>
                )}

                {/* Info notice */}
                <p className="text-[11px] leading-relaxed text-white/25">
                  Marketplace logins are separate from the Reported Area. Use a
                  dedicated account to keep commerce secure.
                </p>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="group relative mt-1 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {submitting ? "Creating account\u2026" : "Create Marketplace Account"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </div>

              {/* Footer */}
              <p className="mt-8 text-center text-[12px] text-white/30">
                Already have a marketplace account?{" "}
                <Link
                  href="/market-place/login"
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




