import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getDashboardData } from "@/actions/moderation";
import GlobalModerationDashboard from "@/components/moderation/GlobalModerationDashboard";
import ModDashboardLogoutButton from "@/components/moderation/ModDashboardLogoutButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ModerationDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mod-dashboard/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "").toLowerCase();
  if (profileError || (role !== "moderator" && role !== "admin")) {
    redirect("/mod-dashboard/login");
  }

  const result = await getDashboardData();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060a13] text-slate-200">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-emerald-600/[0.06] blur-[140px]" />
        <div className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-cyan-600/[0.04] blur-[120px]" />
        <div className="absolute left-1/2 top-1/4 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-teal-500/[0.03] blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 mx-auto w-full max-w-[1520px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/80 to-teal-600/80 shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)]">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">GreenDuty</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">Moderation Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="text-[11px] font-medium text-slate-400">System Online</span>
            </div>
            <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
            <ModDashboardLogoutButton />
          </div>
        </header>

        <GlobalModerationDashboard
          initialData={result.ok ? result.payload : null}
          initialError={result.ok ? null : result.error}
        />
      </div>
    </main>
  );
}
