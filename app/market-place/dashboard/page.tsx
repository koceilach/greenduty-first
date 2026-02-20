import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

const getInitials = (name?: string | null) => {
  if (!name) return "MP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export default async function MarketPlaceDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/market-place/login");
  }

  const user = session.user;
  const initials = getInitials(user.name);

  return (
    <main className="gd-mp-sub min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#0b2b25] dark:text-white light:bg-slate-100 light:text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-[28px] border border-emerald-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-emerald-300/30 dark:bg-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.42)] light:border-emerald-200/70 light:bg-white sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200 light:text-emerald-700">
              Market-Place Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Commerce Control Center</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70 light:text-slate-600">
              Connected through Google authentication.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/15 dark:bg-white/5 light:border-slate-200 light:bg-slate-50">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User profile"}
                  className="h-20 w-20 rounded-full border border-slate-200 object-cover dark:border-white/20 light:border-slate-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700 dark:bg-emerald-300/20 dark:text-emerald-100 light:bg-emerald-100 light:text-emerald-700">
                  {initials}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/15 dark:bg-white/5 light:border-slate-200 light:bg-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/60 light:text-slate-500">
                  Name
                </p>
                <p className="mt-2 text-lg font-semibold">{user.name ?? "Not provided"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/15 dark:bg-white/5 light:border-slate-200 light:bg-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/60 light:text-slate-500">
                  Email
                </p>
                <p className="mt-2 text-lg font-semibold">{user.email ?? "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
