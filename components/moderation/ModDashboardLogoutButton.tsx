"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ModDashboardLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onLogout = async () => {
    if (pending) return;
    setPending(true);

    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });

    router.replace("/mod-dashboard/login");
    router.refresh();
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/15 bg-rose-500/[0.07] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-400 transition-all hover:border-rose-500/25 hover:bg-rose-500/[0.12] hover:shadow-[0_0_16px_-4px_rgba(244,63,94,0.3)] disabled:opacity-60 light:border-rose-300/60 light:bg-rose-100 light:text-rose-700 light:hover:bg-rose-200 green:border-rose-400/30 green:bg-rose-500/10 green:text-rose-200"
    >
      <LogOut className="h-3.5 w-3.5" />
      {pending ? "Logging Out..." : "Logout"}
    </button>
  );
}
