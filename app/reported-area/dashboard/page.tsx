import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

const getInitials = (name?: string | null) => {
  if (!name) return "GD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export default async function ReportedAreaDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?redirect=/reported-area/dashboard");
  }

  const user = session.user;
  const initials = getInitials(user.name);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#041b17] dark:text-slate-100 light:bg-slate-100 light:text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-emerald-400/20 dark:bg-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.38)] light:border-emerald-200/70 light:bg-white">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/90">
              Reported Area Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Welcome back, {user.name ?? "Eco Ranger"}
            </h1>
            <p className="mt-2 text-sm text-emerald-50/90">
              Your monitoring workspace is ready.
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[240px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-white/5 light:border-slate-200 light:bg-slate-50">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User profile"}
                  className="h-24 w-24 rounded-full border border-slate-200 object-cover dark:border-slate-600 light:border-slate-200"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 light:bg-emerald-100 light:text-emerald-700">
                  {initials}
                </div>
              )}
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 light:text-slate-500">
                Signed in with Google
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-white/5 light:border-slate-200 light:bg-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 light:text-slate-500">
                  Full Name
                </p>
                <p className="mt-2 text-lg font-semibold">{user.name ?? "Not provided"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-white/5 light:border-slate-200 light:bg-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 light:text-slate-500">
                  Email
                </p>
                <p className="mt-2 text-lg font-semibold">{user.email ?? "Not provided"}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
