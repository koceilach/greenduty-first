"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

type Notice = {
  tone: "success" | "error";
  message: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ tone: "error", message: "Please enter your email address." });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string; details?: string }
        | null;

      if (!response.ok) {
        const detailedError =
          payload?.error && payload?.details
            ? `${payload.error} (${payload.details})`
            : payload?.error;
        setNotice({
          tone: "error",
          message: detailedError ?? "Could not start password reset. Try again.",
        });
        return;
      }

      setNotice({
        tone: "success",
        message:
          payload?.message ??
          "If this email exists, a secure reset link has been sent.",
      });
      setEmail("");
    } catch {
      setNotice({
        tone: "error",
        message: "Network error while sending reset link. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#051a16] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -right-16 top-20 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
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
            <ShieldCheck className="h-3.5 w-3.5" />
            Account Recovery
          </div>

          <h1 className="mt-4 text-2xl font-semibold">Forgot your password?</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter your email and we will send a secure reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="forgot-email"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
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
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-xs text-white/55">
            For security, this page always returns a generic response.
          </p>
        </div>
      </div>
    </div>
  );
}
