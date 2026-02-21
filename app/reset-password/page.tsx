"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";

type ResetNotice = {
  tone: "success" | "error";
  message: string;
};

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#071d18] text-white">
          Loading reset form...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const hasToken = token.length > 0;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<ResetNotice | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasToken) {
      setNotice({ tone: "error", message: "Reset token is missing from this link." });
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setNotice({
        tone: "error",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({ tone: "error", message: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        setNotice({
          tone: "error",
          message: payload?.error ?? "Could not reset password. Please try again.",
        });
        return;
      }

      setNotice({
        tone: "success",
        message:
          payload?.message ??
          "Password updated successfully. You can now sign in.",
      });
      setPassword("");
      setConfirmPassword("");
    } catch {
      setNotice({
        tone: "error",
        message: "Network error while resetting password. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071d18] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-16 top-16 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/35 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>

        <div className="rounded-[30px] border border-white/12 bg-white/8 p-7 shadow-[0_28px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/85">
            <KeyRound className="h-3.5 w-3.5" />
            Set New Password
          </div>

          <h1 className="mt-4 text-2xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-white/70">
            Create a strong password to secure your account.
          </p>

          {!hasToken && (
            <div className="mt-5 rounded-2xl border border-amber-200/35 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
              This link is missing a token. Request a new reset link first.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="new-password"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/12 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/12 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/25"
                />
              </div>
            </div>

            {notice && (
              <div
                className={`rounded-2xl border px-4 py-3 text-xs ${
                  notice.tone === "success"
                    ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-100"
                    : "border-rose-200/35 bg-rose-300/10 text-rose-100"
                }`}
              >
                {notice.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !hasToken}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitting ? "Updating..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-xs text-white/55">
            This page only handles token + new password submission.
          </p>
        </div>
      </div>
    </div>
  );
}
