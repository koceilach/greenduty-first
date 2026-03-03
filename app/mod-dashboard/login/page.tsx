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
      <main className="min-h-screen bg-[radial-gradient(120%_70%_at_10%_-10%,rgba(15,23,42,0.15),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(14,165,233,0.12),transparent_58%),#eef3f7]">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <p className="text-sm text-slate-600">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_70%_at_10%_-10%,rgba(15,23,42,0.15),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(14,165,233,0.12),transparent_58%),#eef3f7]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-xl">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Secure Area
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Moderator Access</h1>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with your email and your custom password from the admin.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="moderator@email.com"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Password
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter your password"
                />
              </div>
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Accessing..." : "Access Dashboard"}
              <Shield className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

