import {
  Droplets,
  Factory,
  Flame,
  Leaf,
  Skull,
  Trash2,
} from "lucide-react";

export const GD_REPORTED_AREA_WASTE_TYPES = [
  { id: "plastic", label: "Plastic Dump", icon: Trash2 },
  { id: "toxic", label: "Toxic Spill", icon: Skull },
  { id: "forest_fire", label: "Forest Fire", icon: Flame },
  { id: "chemical", label: "Chemical Leak", icon: Droplets },
  { id: "logging", label: "Illegal Logging", icon: Leaf },
  { id: "industrial", label: "Industrial Smoke", icon: Factory },
] as const;

export const GD_REPORTED_AREA_RECOVERY_WEIGHTS: Record<string, number> = {
  "Plastic Dump": 180,
  "Toxic Spill": 120,
  "Forest Fire": 45,
  "Chemical Leak": 90,
  "Illegal Logging": 70,
  "Industrial Smoke": 110,
};

export const GD_REPORTED_AREA_LEGEND_ITEMS = [
  { label: "Organic", detail: "Illegal Logging", color: "#31f2b2" },
  { label: "Toxic", detail: "Spill / Chemical", color: "#ff5f6d" },
  { label: "Recyclable", detail: "Plastic Dump", color: "#4cc9f0" },
] as const;

export const GD_isLowPowerPhone = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const userAgent = nav.userAgent ?? "";
  const isLikelyPhone =
    /android|iphone|mobile/i.test(userAgent) ||
    Math.min(window.innerWidth, window.innerHeight) <= 900;

  if (!isLikelyPhone) {
    return false;
  }

  const weakMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const weakCpu =
    typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 6;
  const saveData = Boolean(nav.connection?.saveData);
  const slowNetwork = ["slow-2g", "2g", "3g"].includes(
    nav.connection?.effectiveType ?? ""
  );
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const explicitLowTierUA = /(condor|android go|itel|tecno)/i.test(userAgent);

  return weakMemory || weakCpu || saveData || slowNetwork || reducedMotion || explicitLowTierUA;
};
