export type GreenspotReportDraft = {
  title: string;
  description: string;
  category: string | null;
  expert: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  photoDataUrl: string | null;
  photoName: string | null;
  clientSubmissionId: string;
  updatedAt: string;
};

export type GreenspotRetryItem = GreenspotReportDraft & {
  id: string;
  attempts: number;
  queuedAt: string;
  lastError: string | null;
};

const DRAFT_KEY = "gd_greenspot_report_draft_v1";
const QUEUE_KEY = "gd_greenspot_report_retry_queue_v1";

const isBrowser = () => typeof window !== "undefined";

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const generateSubmissionId = () =>
  `gs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const loadReportDraft = (): GreenspotReportDraft | null => {
  if (!isBrowser()) return null;
  return safeParse<GreenspotReportDraft | null>(
    window.localStorage.getItem(DRAFT_KEY),
    null
  );
};

export const saveReportDraft = (draft: GreenspotReportDraft) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const clearReportDraft = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DRAFT_KEY);
};

export const loadRetryQueue = (): GreenspotRetryItem[] => {
  if (!isBrowser()) return [];
  const parsed = safeParse<GreenspotRetryItem[]>(
    window.localStorage.getItem(QUEUE_KEY),
    []
  );
  return Array.isArray(parsed) ? parsed : [];
};

export const saveRetryQueue = (queue: GreenspotRetryItem[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueRetryItem = (draft: GreenspotReportDraft, lastError: string) => {
  const queue = loadRetryQueue();
  const next: GreenspotRetryItem = {
    ...draft,
    id: `retry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    attempts: 0,
    queuedAt: new Date().toISOString(),
    lastError,
  };
  queue.push(next);
  saveRetryQueue(queue);
  return next;
};
