import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ChatRole = "assistant" | "user";

type HistoryMessage = {
  role: ChatRole;
  text: string;
};

type AiChatRequest = {
  prompt?: string;
  imageDataUrl?: string;
  history?: HistoryMessage[];
};

type StructuredAiReply = {
  inScope: boolean;
  reply: string;
  summary: string;
  suggestedPlants: string[];
  designPrompt: string;
};

type GeminiInlineData = {
  mimeType?: string;
  data?: string;
};

type GeminiResponsePart = {
  text?: string;
  inlineData?: GeminiInlineData;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiUserPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiUserPart[];
};

const PLANT_SCOPE_KEYWORDS = [
  "tree",
  "trees",
  "plant",
  "plants",
  "flower",
  "flowers",
  "seed",
  "seeds",
  "agronomy",
  "agronomic",
  "soil",
  "garden",
  "irrigation",
  "compost",
  "fertilizer",
  "mulch",
  "pruning",
  "nursery",
  "orchard",
  "shrub",
  "hedge",
  "greenery",
  "botany",
  "horticulture",
  "watering",
  "landscaping",
];

const SYSTEM_PROMPT = [
  "You are GreenDuty AI Botanist for an environmental reporting platform.",
  "You only help with trees, plants, flowers, seeds, soil, agronomy, horticulture, and planting design.",
  "If the request is outside scope, set inScope=false and respond with one short refusal sentence only.",
  "If an image is provided, analyze the visible ground and propose a practical planting concept.",
  "Always include 4-8 suggested species/plants that match likely climate and maintenance constraints.",
  "Keep answers concise and actionable for a community user.",
  "Output valid JSON matching the requested schema.",
].join(" ");

const IMAGE_SYSTEM_PROMPT =
  "You generate realistic ecological landscaping concept images from concise prompts.";

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_CHARS = 1400;
const MAX_IMAGE_DATA_URL_CHARS = 3_000_000;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_TEXT_CHARS = 600;

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-1.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.0-flash-exp-image-generation";

const isSchemaMismatch = (message: string) =>
  /function .* does not exist|relation .* does not exist|schema cache|column .* does not exist/i.test(
    message
  );

const isInScopePrompt = (prompt: string) => {
  const lower = prompt.toLowerCase();
  return PLANT_SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ??
  process.env.GOOGLE_API_KEY ??
  process.env.GOOGLE_VISION_API_KEY ??
  null;

const cleanModelText = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/g, "").replace(/```$/g, "").trim();
  }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  return cleaned.trim();
};

const parseImageDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
};

const parseStructuredReply = (rawContent: unknown): StructuredAiReply | null => {
  if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent) as Partial<StructuredAiReply>;
    if (
      typeof parsed.inScope !== "boolean" ||
      typeof parsed.reply !== "string" ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.suggestedPlants) ||
      typeof parsed.designPrompt !== "string"
    ) {
      return null;
    }

    const suggestedPlants = parsed.suggestedPlants
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 8);

    return {
      inScope: parsed.inScope,
      reply: parsed.reply.trim(),
      summary: parsed.summary.trim(),
      suggestedPlants,
      designPrompt: parsed.designPrompt.trim(),
    };
  } catch {
    return null;
  }
};

const buildFallbackReply = (inScope: boolean): StructuredAiReply => {
  if (!inScope) {
    return {
      inScope: false,
      reply:
        "I can only help with trees, plants, flowers, seeds, agronomy, and garden planning topics.",
      summary: "",
      suggestedPlants: [],
      designPrompt: "",
    };
  }

  return {
    inScope: true,
    reply:
      "I can help with plant selection, soil prep, watering plans, and tree/flower layouts for this area.",
    summary: "Planting strategy focused on resilient trees, layered shrubs, and seasonal flowering.",
    suggestedPlants: ["Olive Tree", "Jacaranda", "Lavender", "Rosemary", "Lantana"],
    designPrompt:
      "A practical community garden with shade trees, flowering borders, and low-water aromatic plants.",
  };
};

const getFirstCandidateText = (value: GeminiGenerateResponse) => {
  const parts = value.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return "";
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
};

const callGemini = async ({
  apiKey,
  model,
  systemInstruction,
  contents,
  generationConfig,
}: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: GeminiContent[];
  generationConfig?: Record<string, unknown>;
}) => {
  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
  };
  if (generationConfig) {
    body.generationConfig = generationConfig;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = (await response.json().catch(() => null)) as GeminiGenerateResponse | null;
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      error: data?.error?.message ?? "Gemini request failed.",
    };
  }

  return { ok: true as const, data: data ?? {} };
};

const generateDesignImage = async (apiKey: string, prompt: string): Promise<string | null> => {
  const result = await callGemini({
    apiKey,
    model: IMAGE_MODEL,
    systemInstruction: IMAGE_SYSTEM_PROMPT,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  if (!result.ok) return null;

  const parts = result.data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (typeof data === "string" && data.length > 0) {
      const mimeType =
        typeof part.inlineData?.mimeType === "string" && part.inlineData.mimeType.length > 0
          ? part.inlineData.mimeType
          : "image/png";
      return `data:${mimeType};base64,${data}`;
    }
  }

  const text = getFirstCandidateText(result.data);
  const urlMatch = text.match(/https?:\/\/\S+/);
  return urlMatch ? urlMatch[0] : null;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request payload is too large." }, { status: 413 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY) on server. Add it to .env.local and restart.",
      },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as AiChatRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  const imageDataUrl = body.imageDataUrl?.trim() ?? "";

  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Prompt is too long. Maximum length is ${MAX_PROMPT_CHARS} characters.` },
      { status: 400 }
    );
  }

  if (imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
    return NextResponse.json(
      { error: "Image payload is too large. Please upload a smaller image." },
      { status: 413 }
    );
  }

  const imagePayload = imageDataUrl ? parseImageDataUrl(imageDataUrl) : null;
  if (imageDataUrl && !imagePayload) {
    return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
  }
  const hasImage = Boolean(imagePayload);

  if (!prompt && !hasImage) {
    return NextResponse.json({ error: "Provide text or an image." }, { status: 400 });
  }

  const scopedPrompt = prompt.length > 0 ? prompt : "Analyze this area image for planting.";
  const inScopeByKeyword = hasImage || isInScopePrompt(scopedPrompt);
  const fallback = buildFallbackReply(inScopeByKeyword);

  if (!inScopeByKeyword && !hasImage) {
    return NextResponse.json({
      inScope: false,
      reply: fallback.reply,
      summary: "",
      suggestedPlants: [],
      designImageUrl: null,
    });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is HistoryMessage =>
            Boolean(item) &&
            (item.role === "assistant" || item.role === "user") &&
            typeof item.text === "string" &&
            item.text.trim().length > 0 &&
            item.text.trim().length <= MAX_HISTORY_TEXT_CHARS
        )
        .slice(-MAX_HISTORY_ITEMS)
    : [];

  const quotaResult = await supabase.rpc("consume_ai_chat_quota", {
    p_per_minute: 6,
    p_per_hour: 40,
  });

  if (quotaResult.error && !isSchemaMismatch(quotaResult.error.message)) {
    return NextResponse.json({ error: quotaResult.error.message }, { status: 500 });
  }

  if (!quotaResult.error && quotaResult.data) {
    const quotaData = quotaResult.data as {
      ok?: boolean;
      reason?: string;
      retry_after_seconds?: number;
    };
    if (quotaData.ok === false) {
      return NextResponse.json(
        {
          error:
            quotaData.reason === "hour_limit"
              ? "Hourly AI limit reached. Please try again later."
              : "Too many AI requests. Please wait a minute and try again.",
          retryAfterSeconds: Number(quotaData.retry_after_seconds ?? 60),
        },
        { status: 429 }
      );
    }
  }

  const userParts: GeminiUserPart[] = [{ text: scopedPrompt }];
  if (imagePayload) {
    userParts.push({
      inlineData: {
        mimeType: imagePayload.mimeType,
        data: imagePayload.base64,
      },
    });
  }

  const contents: GeminiContent[] = [
    ...history.map((item) => ({
      role: item.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: item.text }],
    })),
    {
      role: "user",
      parts: userParts,
    },
  ];

  const aiResult = await callGemini({
    apiKey,
    model: TEXT_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    contents,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });

  if (!aiResult.ok) {
    return NextResponse.json(
      { error: aiResult.error ?? "Gemini chat request failed." },
      { status: aiResult.status }
    );
  }

  const rawText = cleanModelText(getFirstCandidateText(aiResult.data));
  const modelReply = parseStructuredReply(rawText) ?? fallback;
  const inScopeFinal = modelReply.inScope && inScopeByKeyword;
  const safeReply = inScopeFinal ? modelReply : buildFallbackReply(false);

  let designImageUrl: string | null = null;
  if (hasImage && inScopeFinal && safeReply.designPrompt) {
    const enhancedPrompt = [
      "Create a realistic, elegant ecological landscaping concept render.",
      "Preserve original land shape and orientation.",
      "Show where trees, flowers, and shrubs are planted with clear spatial layout.",
      "Natural daylight, high detail, no text, no watermark.",
      `Design brief: ${safeReply.designPrompt}`,
    ].join(" ");
    designImageUrl = await generateDesignImage(apiKey, enhancedPrompt);
  }

  return NextResponse.json({
    inScope: safeReply.inScope,
    reply: safeReply.reply,
    summary: safeReply.summary,
    suggestedPlants: safeReply.suggestedPlants,
    designImageUrl,
  });
}
