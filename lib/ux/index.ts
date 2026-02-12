/* ──────────────────────────────────────────────────────────────
   GreenDuty UX Performance Kit — barrel export
   ──────────────────────────────────────────────────────────────
   Import everything from "@/lib/ux":
     import { usePrefetch, Ghost, StaggerContainer, ... } from "@/lib/ux";
   ────────────────────────────────────────────────────────────── */

// 1. Predictive Navigation & Pre-fetching
export { usePrefetch, useViewportPrefetch } from "./use-prefetch";

// 2. Non-Blocking UI (Transitions & Deferred Values)
export {
  useNonBlockingState,
  useDeferredFilter,
  useTransitionAsync,
  useNonBlockingTransition,
} from "./use-non-blocking";

// 3. Ghost Loading Architecture (Skeletons)
export {
  Skeleton,
  SkeletonLine,
  SkeletonCard,
  SkeletonRow,
  SkeletonGrid,
  SkeletonStat,
  SkeletonPage,
  Ghost,
} from "./skeletons";

// 4. Optimistic Action Handlers
export { useOptimisticMutation, useOptimisticToggle } from "./use-optimistic";

// 5. Fluid Motion Orchestration
export {
  springPresets,
  StaggerContainer,
  StaggerItem,
  FadeSlide,
  FluidPresence,
} from "./motion";
