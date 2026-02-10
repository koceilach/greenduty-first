"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

export type AccountRole =
  | "basic_account"
  | "pro_account"
  | "impact_account"
  | "academic_verified_account"
  | "admin";

const resolveAccess = (
  roles: AccountRole[],
  profile: {
    role: "buyer" | "seller" | "admin";
    account_tier: "basic" | "pro" | "impact";
    verification_status: "unverified" | "pending" | "approved" | "rejected";
    verification_type?: "student" | "researcher" | null;
  }
) => {
  if (profile.role === "admin") return roles.includes("admin") || true;
  const tier = profile.account_tier ?? "basic";
  const verified = profile.verification_status === "approved";
  const vType = profile.verification_type ?? null;

  return roles.some((role) => {
    if (role === "basic_account") return true;
    if (role === "pro_account") {
      return tier === "pro" || (verified && vType === "student");
    }
    if (role === "impact_account") {
      return tier === "impact" || (verified && vType === "researcher");
    }
    if (role === "academic_verified_account") return verified;
    if (role === "admin") return false;
    return false;
  });
};

export function RequireRole({
  roles,
  children,
}: {
  roles: AccountRole[];
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  const allowed = useMemo(() => {
    if (!profile) return false;
    return resolveAccess(roles, profile);
  }, [roles, profile]);

  if (loading) return null;

  if (!user || !profile) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(239,68,68,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
        <section className="pt-28 pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <h1 className="text-2xl font-semibold">Sign in required</h1>
              <p className="mt-2 text-sm text-white/60">
                Please sign in to access this dashboard.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Link href="/login">Go to login</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(239,68,68,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
        <section className="pt-28 pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <h1 className="text-2xl font-semibold">Upgrade required</h1>
              <p className="mt-2 text-sm text-white/60">
                This dashboard is available to verified or upgraded accounts.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Link href="/pricing">View plans</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/account/verification">Request verification</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
