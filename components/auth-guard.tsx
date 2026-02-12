"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/auth/callback"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const isPublic = useMemo(() => {
    if (!pathname) return true;
    if (PUBLIC_ROUTES.includes(pathname)) return true;
    return PUBLIC_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (isPublic) {
        if (mounted) setChecking(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
      }
      if (mounted) setChecking(false);
    };

    checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isPublic && !session?.user) {
        const redirect = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${redirect}`);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [isPublic, pathname, router]);

  if (checking && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
