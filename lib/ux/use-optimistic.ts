"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/* ──────────────────────────────────────────────────────────────
   4. Optimistic Action Handlers — Fire-and-Forget
   ──────────────────────────────────────────────────────────────
   Update UI state immediately, sync in the background, and only
   surface a toast if the retry is needed. The user never waits.
   ────────────────────────────────────────────────────────────── */

interface UseOptimisticMutationOptions<TData, TInput> {
  /** The current data (before mutation) — used for rollback */
  current: TData;
  /** Apply the optimistic change to the current data */
  applyOptimistic: (current: TData, input: TInput) => TData;
  /** Set the data in the parent state */
  onUpdate: (next: TData) => void;
  /** The actual async operation (API call, Supabase insert, etc.) */
  mutationFn: (input: TInput) => Promise<void>;
  /** Number of automatic retries before showing a toast (default 2) */
  maxRetries?: number;
  /** Delay between retries in ms (default 1500) */
  retryDelay?: number;
  /** Toast message shown on final failure */
  errorMessage?: string;
  /** Toast message shown after successful retry */
  retrySuccessMessage?: string;
}

/**
 * Returns a `mutate(input)` function that:
 * 1. Applies the change to UI instantly (optimistic)
 * 2. Runs the real mutation in the background
 * 3. On failure, retries silently up to `maxRetries`
 * 4. On final failure, rolls back UI + shows a toast
 *
 * ```tsx
 * const { mutate, isMutating } = useOptimisticMutation({
 *   current: reports,
 *   applyOptimistic: (reports, newReport) => [newReport, ...reports],
 *   onUpdate: setReports,
 *   mutationFn: (report) => supabase.from("reports").insert(report),
 * });
 *
 * <button onClick={() => mutate(newReport)}>Report</button>
 * ```
 */
export function useOptimisticMutation<TData, TInput>({
  current,
  applyOptimistic,
  onUpdate,
  mutationFn,
  maxRetries = 2,
  retryDelay = 1500,
  errorMessage = "Action failed. Please try again.",
  retrySuccessMessage,
}: UseOptimisticMutationOptions<TData, TInput>) {
  const [isMutating, setIsMutating] = useState(false);
  const snapshotRef = useRef<TData>(current);

  // Keep snapshot in sync with latest data
  snapshotRef.current = current;

  const mutate = useCallback(
    async (input: TInput) => {
      const snapshot = snapshotRef.current;

      /* ① Optimistic UI update */
      onUpdate(applyOptimistic(snapshot, input));
      setIsMutating(true);

      /* ② Background sync with silent retry */
      let attempt = 0;
      let lastError: unknown;

      while (attempt <= maxRetries) {
        try {
          await mutationFn(input);
          setIsMutating(false);
          if (attempt > 0 && retrySuccessMessage) {
            toast.success(retrySuccessMessage);
          }
          return; // success
        } catch (err) {
          lastError = err;
          attempt++;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, retryDelay));
          }
        }
      }

      /* ③ Final failure — rollback + toast */
      onUpdate(snapshot);
      setIsMutating(false);
      toast.error(errorMessage, {
        action: {
          label: "Retry",
          onClick: () => mutate(input),
        },
      });
      console.error("Optimistic mutation failed after retries:", lastError);
    },
    [
      applyOptimistic,
      onUpdate,
      mutationFn,
      maxRetries,
      retryDelay,
      errorMessage,
      retrySuccessMessage,
    ],
  );

  return { mutate, isMutating } as const;
}

/* ──────────────────────────────────────────────────────────────
   Simpler variant for toggling a boolean / incrementing a number
   (likes, upvotes, bookmarks, verification counts).
   ────────────────────────────────────────────────────────────── */

interface UseOptimisticToggleOptions {
  /** Current value */
  value: boolean;
  /** Setter */
  onChange: (next: boolean) => void;
  /** Async action when toggling ON */
  onActivate: () => Promise<void>;
  /** Async action when toggling OFF */
  onDeactivate: () => Promise<void>;
  /** Max silent retries (default 2) */
  maxRetries?: number;
}

export function useOptimisticToggle({
  value,
  onChange,
  onActivate,
  onDeactivate,
  maxRetries = 2,
}: UseOptimisticToggleOptions) {
  const [isMutating, setIsMutating] = useState(false);

  const toggle = useCallback(async () => {
    const prev = value;
    const next = !prev;
    onChange(next); // optimistic
    setIsMutating(true);

    const action = next ? onActivate : onDeactivate;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        await action();
        setIsMutating(false);
        return;
      } catch {
        attempt++;
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // rollback
    onChange(prev);
    setIsMutating(false);
    toast.error("Action failed. Please try again.", {
      action: {
        label: "Retry",
        onClick: toggle,
      },
    });
  }, [value, onChange, onActivate, onDeactivate, maxRetries]);

  return { toggle, isMutating } as const;
}
