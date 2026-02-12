"use client";

import {
  useTransition,
  useDeferredValue,
  useState,
  useCallback,
  useRef,
  type TransitionStartFunction,
} from "react";

/* ──────────────────────────────────────────────────────────────
   2. Non-Blocking UI — The 'ChatGPT' Effect
   ──────────────────────────────────────────────────────────────
   Wraps heavy state updates in React Transitions so the main
   thread is never blocked. The UI stays interactive, scrollable,
   and tappable while data-heavy renders happen in the background.
   ────────────────────────────────────────────────────────────── */

/**
 * Wraps any setter in `startTransition` so it never blocks UI.
 *
 * ```tsx
 * const { value, setValue, isPending } = useNonBlockingState(initialItems);
 * // setValue(heavyFilteredList)  ← UI stays responsive
 * ```
 */
export function useNonBlockingState<T>(initialValue: T) {
  const [value, setRaw] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      startTransition(() => {
        setRaw(next);
      });
    },
    [startTransition],
  );

  return { value, setValue, isPending } as const;
}

/**
 * Deferred search / filter pattern.
 * `inputValue` tracks keystrokes instantly.
 * `deferredValue` lags behind so expensive renders don't block typing.
 *
 * ```tsx
 * const { inputValue, setInputValue, deferredValue, isStale } = useDeferredFilter("");
 * <input value={inputValue} onChange={e => setInputValue(e.target.value)} />
 * <HeavyList filter={deferredValue} style={{ opacity: isStale ? 0.7 : 1 }} />
 * ```
 */
export function useDeferredFilter<T>(initialValue: T) {
  const [inputValue, setInputValue] = useState(initialValue);
  const deferredValue = useDeferredValue(inputValue);
  const isStale = inputValue !== deferredValue;

  return { inputValue, setInputValue, deferredValue, isStale } as const;
}

/**
 * Wraps an async callback so the result is applied inside a transition.
 * The fetcher runs immediately; only the state-update is deferred.
 *
 * ```tsx
 * const { execute, data, isPending, error } = useTransitionAsync(
 *   () => fetch("/api/plants").then(r => r.json())
 * );
 * useEffect(() => { execute(); }, []);
 * ```
 */
export function useTransitionAsync<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeRef = useRef(0);

  const execute = useCallback(async () => {
    const id = ++activeRef.current;
    setError(null);
    try {
      const result = await fetcher();
      if (id !== activeRef.current) return; // stale
      startTransition(() => {
        setData(result);
      });
    } catch (err) {
      if (id !== activeRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [fetcher, startTransition]);

  return { execute, data, isPending, error } as const;
}

/**
 * Raw transition starter for ad-hoc wrapping.
 *
 * ```tsx
 * const { isPending, startTransition } = useNonBlockingTransition();
 * onClick={() => startTransition(() => setHeavyState(x))}
 * ```
 */
export function useNonBlockingTransition(): {
  isPending: boolean;
  startTransition: TransitionStartFunction;
} {
  const [isPending, startTransition] = useTransition();
  return { isPending, startTransition };
}
