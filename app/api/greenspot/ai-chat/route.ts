import { NextResponse } from "next/server";

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

const REPLY_SCHEMA = {
  name: "greenspot_ai_reply",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      inScope: { type: "boolean" },
      reply: { type: "string" },
      summary: { type: "string" },
      suggestedPlants: {
        type: "array",
        items: { type: "string" },
      },
      designPrompt: { type: "string" },
    },
    required: ["inScope", "reply", "summary", "suggestedPlants", "designPrompt"],
  },
} as const;

const isInScopePrompt = (prompt: string) => {
  const lower = prompt.toLowerCase();
  return PLANT_SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const getErrorMessage = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const maybeError = value as { error?: { message?: unknown } };
  if (typeof maybeError.error?.message === "string") return maybeError.error.message;
  return null;
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
    suggestedPlants: [
      "Olive Tree",
      "Jacaranda",
      "Lavender",
      "Rosemary",
      "Lantana",
    ],
    designPrompt:
      "A practical community garden with shade trees, flowering borders, and low-water aromatic plants.",
  };
};

const generateDesignImage = async (apiKey: string, prompt: string): Promise<string | null> => {
  const imageRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "low",
    }),
  });

  const imageData = (await imageRes.json().catch(() => null)) as
    | {
        data?: Array<{ b64_json?: string; url?: string }>;
      }
    | null;

  if (!imageRes.ok) {
    return null;
  }

  const first = imageData?.data?.[0];
  if (typeof first?.b64_json === "string" && first.b64_json.length > 0) {
    return `data:image/png;base64,${first.b64_json}`;
  }
  if (typeof first?.url === "string" && first.url.length > 0) {
    return first.url;
  }
  return null;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY on server. Add it to .env.local and restart.",
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
  const hasImage = imageDataUrl.startsWith("data:image/");

  if (!prompt && !hasImage) {
    return NextResponse.json({ error: "Provide text or an image." }, { status: 400 });
  }

  const scopedPrompt = prompt.length > 0 ? prompt : "Analyze this area image for planting.";
  const inScopeByKeyword = hasImage || isInScopePrompt(scopedPrompt);
  const fallback = buildFallbackReply(inScopeByKeyword);

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is HistoryMessage =>
            Boolean(item) &&
            (item.role === "assistant" || item.role === "user") &&
            typeof item.text === "string" &&
            item.text.trim().length > 0
        )
        .slice(-8)
    : [];

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((item) => ({
      role: item.role,
      content: item.text,
    })),
    {
      role: "user",
      content: hasImage
        ? [
            { type: "text", text: scopedPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ]
        : scopedPrompt,
    },
  ];

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.35,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: REPLY_SCHEMA,
      },
    }),
  });

  const aiData = (await aiRes.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      }
    | null;

  if (!aiRes.ok) {
    const fallbackStatus = aiRes.status >= 400 && aiRes.status < 600 ? aiRes.status : 502;
    return NextResponse.json(
      {
        error: getErrorMessage(aiData) ?? "OpenAI chat request failed.",
      },
      { status: fallbackStatus }
    );
  }

  const modelReply = parseStructuredReply(aiData?.choices?.[0]?.message?.content) ?? fallback;
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
