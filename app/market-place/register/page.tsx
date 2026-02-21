"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf, Mail, ShieldCheck, User } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

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
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="gd-mp-container relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-200/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-200/20"
            >
              Back to Home
            </Link>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              <Leaf className="h-4 w-4" />
              Join Marketplace
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Create your buyer profile</h1>
            <p className="mt-2 text-sm text-white/60">
              New marketplace accounts start as buyers. You can apply to become a seller after registration.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Display name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Green grower"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40"
                  />
                </div>
              </div>

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
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40"
                />
              </div>

              {message && (
                <div className={`rounded-2xl border px-4 py-3 text-xs ${
                  messageType === "info"
                    ? "border-emerald-200/20 bg-emerald-200/10 text-emerald-100"
                    : "border-red-200/20 bg-red-200/10 text-red-200"
                }`}>
                  {message}
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                  <ShieldCheck className="h-4 w-4" />
                  Marketplace trust
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Marketplace logins are separate from the Reported Area. Use a
                  dedicated account to keep commerce secure.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create Marketplace Account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-white/60">
              Already have a marketplace account?{" "}
              <Link
                href="/market-place/login"
                className="font-semibold text-emerald-200 transition hover:text-emerald-100"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-5 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
            GreenDuty Marketplace Register
          </div>
        </div>
      </div>
    </div>
  );
}




