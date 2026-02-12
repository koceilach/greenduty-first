"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

export default function MarketplaceProfileRedirectPage() {
  const { user, loading } = useMarketplaceAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(`/market-place/profile/${user.id}`);
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="gd-mp-sub min-h-screen bg-[#0b2b25] text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-white/60">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-mp-sub relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            Please sign in to view your marketplace profile.{" "}
            <Link
              href="/market-place/login"
              className="font-semibold text-emerald-200 hover:text-emerald-100"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
