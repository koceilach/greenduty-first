import React from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  isVerified?: boolean | null;
  role?: "buyer" | "seller" | "admin" | string | null;
  className?: string;
  showLabel?: boolean;
};

export default function VerifiedBadge({
  isVerified,
  role,
  className,
  showLabel = true,
}: VerifiedBadgeProps) {
  const shouldShow = Boolean(isVerified) || role === "seller";
  if (!shouldShow) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700",
        className
      )}
      title="Verified seller"
      aria-label="Verified seller"
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {showLabel ? "Verified" : null}
    </span>
  );
}
