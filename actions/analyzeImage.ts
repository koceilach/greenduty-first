"use server";

import { unstable_noStore as noStore } from "next/cache";

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 2048;

type DetectionSource = "label" | "web" | "guess";

export type VisualDetectionItem = {
  id: string;
  label: string;
  confidence: number;
  confidencePercent: number;
  source: DetectionSource;
};

export type AnalyzeImageResult = {
  items: VisualDetectionItem[];
  analyzedAt: string;
};

type VisionLabel = {
  description?: string;
  score?: number;
};

type VisionWebEntity = {
  description?: string;
  score?: number;
};

type VisionGuessLabel = {
  label?: string;
};

type VisionResponse = {
  error?: {
    message?: string;
  };
  labelAnnotations?: VisionLabel[];
  webDetection?: {
    webEntities?: VisionWebEntity[];
    bestGuessLabels?: VisionGuessLabel[];
  };
};

type VisionApiPayload = {
  responses?: VisionResponse[];
};

const clampScore = (value: number | undefined, fallback = 0) => {
  const candidate = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(candidate)) return 0;
  return Math.max(0, Math.min(1, candidate));
};

const normalizeBase64 = (raw: string) => {
  const input = raw.trim();
  if (!input) {
    throw new Error("Image payload is empty.");
  }

  const content = input.startsWith("data:")
    ? (input.split(",")[1] ?? "")
    : input;
  const compact = content.replace(/\s+/g, "");

  if (!compact || compact.length > MAX_BASE64_LENGTH) {
    throw new Error("Image is too large for analysis.");
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) {
    throw new Error("Invalid image payload format.");
  }

  return compact;
};

const normalizeLabel = (value: string | undefined) => value?.trim() ?? "";

const rankSource = (source: DetectionSource) => {
  if (source === "label") return 3;
  if (source === "web") return 2;
  return 1;
};

const pushCandidate = (
  bucket: Map<string, VisualDetectionItem>,
  label: string,
  confidence: number,
  source: DetectionSource
) => {
  const normalized = normalizeLabel(label);
  if (!normalized) return;

  const key = normalized.toLowerCase();
  const score = clampScore(confidence);
  const existing = bucket.get(key);

  if (!existing) {
    bucket.set(key, {
      id: key,
      label: normalized,
      confidence: score,
      confidencePercent: Math.round(score * 100),
      source,
    });
    return;
  }

  const shouldReplace =
    score > existing.confidence ||
    (Math.abs(score - existing.confidence) < 0.0001 &&
      rankSource(source) > rankSource(existing.source));

  if (!shouldReplace) return;

  bucket.set(key, {
    ...existing,
    label: normalized,
    confidence: score,
    confidencePercent: Math.round(score * 100),
    source,
  });
};

export async function analyzeImage(imageBase64: string): Promise<AnalyzeImageResult> {
  noStore();

  const apiKey = process.env.GOOGLE_VISION_API_KEY ?? "";
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is missing on the server.");
  }

  const content = normalizeBase64(imageBase64);
  const endpoint = `${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      requests: [
        {
          image: { content },
          features: [
            { type: "LABEL_DETECTION", maxResults: 15 },
            { type: "WEB_DETECTION", maxResults: 15 },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Google Vision request failed. Please try again.");
  }

  const payload = (await response.json()) as VisionApiPayload;
  const primary = payload.responses?.[0];

  if (!primary) {
    throw new Error("No analysis response returned by Google Vision.");
  }

  if (primary.error?.message) {
    throw new Error(primary.error.message);
  }

  const detected = new Map<string, VisualDetectionItem>();

  for (const label of primary.labelAnnotations ?? []) {
    pushCandidate(detected, label.description ?? "", clampScore(label.score), "label");
  }

  for (const entity of primary.webDetection?.webEntities ?? []) {
    pushCandidate(detected, entity.description ?? "", clampScore(entity.score), "web");
  }

  for (const guess of primary.webDetection?.bestGuessLabels ?? []) {
    pushCandidate(detected, guess.label ?? "", 0.68, "guess");
  }

  const items = Array.from(detected.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);

  return {
    items,
    analyzedAt: new Date().toISOString(),
  };
}

