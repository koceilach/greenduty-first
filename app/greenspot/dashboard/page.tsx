import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

const getInitials = (name?: string | null) => {
  if (!name) return "GS";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export default async function GreenspotDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/greenspot/login?redirect=/greenspot/dashboard");
  }

  const user = session.user;
  const initials = getInitials(user.name);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#062019] dark:text-slate-100 light:bg-slate-100 light:text-slate-900">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-emerald-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-emerald-400/20 dark:bg-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] light:border-emerald-200/70 light:bg-white sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200 light:text-emerald-700">
              GreenSpot Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Mission Control</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 light:text-slate-600">
              Your GreenSpot account is authenticated and ready.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/10 light:border-emerald-200/70 light:bg-emerald-50/80">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-200 light:text-emerald-700">
              Google Profile
            </p>
            <div className="mt-4 flex items-center gap-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User profile"}
                  className="h-16 w-16 rounded-full border border-emerald-200 object-cover dark:border-emerald-400/30 light:border-emerald-200"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-200 text-lg font-semibold text-emerald-800 dark:bg-emerald-400/25 dark:text-emerald-100 light:bg-emerald-200 light:text-emerald-800">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-base font-semibold">{user.name ?? "Not provided"}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 light:text-slate-600">
                  {user.email ?? "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-white/5 light:border-slate-200 light:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 light:text-slate-500">
              Session Status
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 light:text-slate-600">
              Protected route active with `getServerSession`. If your session ends, you will be sent back to GreenSpot login.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
