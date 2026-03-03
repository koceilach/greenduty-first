"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ModDashboardLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "moderator" || profile?.role === "admin") {
        router.replace("/mod-dashboard");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      setCheckingSession(false);
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message ?? "Invalid credentials");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile || (profile.role !== "moderator" && profile.role !== "admin")) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Access denied: this account is not moderator/admin.");
      return;
    }

    setLoading(false);
    router.replace("/mod-dashboard");
    router.refresh();
  };

  if (checkingSession) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#060a13]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-600/[0.07] blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.05] blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
            <p className="text-sm text-slate-500">Verifying session...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060a13]">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-600/[0.07] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.05] blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-teal-500/[0.04] blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[440px] items-center px-4 py-8">
        <section className="w-full">
          {/* Shield emblem */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-600/20 to-teal-600/20 shadow-[0_0_40px_-8px_rgba(16,185,129,0.3)]">
                <Shield className="h-9 w-9 text-emerald-400" />
              </div>
            </div>
            <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">Moderation Portal</h1>
            <p className="mt-1.5 text-center text-sm text-slate-500">Authorized personnel only</p>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-2xl">
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/70">
                  Secure Authentication
                </p>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-400">
                Sign in with your credentials provided by the admin team.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email Address
                </span>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-emerald-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/30 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
                    placeholder="moderator@greenduty.com"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </span>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-emerald-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/30 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
                    placeholder="Enter your password"
                  />
                </div>
              </label>

              {error ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.07] px-3.5 py-2.5">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                  <p className="text-sm text-rose-400">{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)] transition-all hover:shadow-[0_0_36px_-6px_rgba(16,185,129,0.6)] hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.08] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {loading ? "Authenticating..." : "Access Dashboard"}
                <Shield className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Footer badge */}
          <p className="mt-6 text-center text-[11px] text-slate-600">
            GreenDuty Moderation System &middot; End-to-end encrypted
          </p>
        </section>
      </div>
    </main>
  );
}

