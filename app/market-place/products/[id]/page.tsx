"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GD_getMarketplaceProductDetailsHref } from "@/lib/marketplace/routes";

export default function LegacyMarketplaceProductRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const itemId = Array.isArray(rawId) ? rawId[0] : rawId;

  useEffect(() => {
    router.replace(GD_getMarketplaceProductDetailsHref(itemId ?? ""));
  }, [router, itemId]);

  return (
    <div className="gd-mp-sub gd-mp-shell flex min-h-screen items-center justify-center bg-[#0b2b25] px-4 text-sm text-white/70">
      Opening listing details...
    </div>
  );
}
