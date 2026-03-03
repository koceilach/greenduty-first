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
    <main className="min-h-screen bg-[radial-gradient(130%_70%_at_10%_-10%,rgba(15,23,42,0.15),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(14,165,233,0.12),transparent_58%),#eef3f7] text-slate-900">
      <div className="mx-auto w-full max-w-[1520px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Global Moderation Center
          </p>

          <ModDashboardLogoutButton />
        </div>

        <GlobalModerationDashboard
          initialData={result.ok ? result.payload : null}
          initialError={result.ok ? null : result.error}
        />
      </div>
    </main>
  );
}
