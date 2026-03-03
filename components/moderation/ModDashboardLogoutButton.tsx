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
      className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" />
      {pending ? "Logging Out..." : "Logout"}
    </button>
  );
}

