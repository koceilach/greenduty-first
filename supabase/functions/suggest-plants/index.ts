import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_INSTRUCTION = "You are an expert agricultural botanist specializing in North African and Algerian ecosystems. Analyze the provided image of a potential planting site and its geographic coordinates. Based on the visible soil quality, sunlight exposure indications, surrounding vegetation type, and the climate of that exact location, suggest the top 3 most suitable native or highly adaptive tree/flower species that would thrive there with minimal intervention. Return ONLY a raw JSON array of objects, e.g., [{ \"plant_name\": \"Name\", \"reason\": \"Brief 1-sentence reason based on visual/location evidence.\" }, ...]. No other text.";

const MODEL_NAME = "gemini-1.5-flash";

const cleanModelText = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/g, "").replace(/```$/g, "").trim();
  }
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    cleaned = cleaned.slice(arrayStart, arrayEnd + 1);
  }
  return cleaned.trim();
};

const normalizeSuggestions = (value: unknown) => {
  const items = Array.isArray(value) ? value : [value];
  const normalized = items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const plantName =
        typeof record.plant_name === "string"
          ? record.plant_name
          : typeof record.name === "string"
          ? record.name
          : "";
      const reason =
        typeof record.reason === "string"
          ? record.reason
          : typeof record.rationale === "string"
          ? record.rationale
          : "";
      if (!plantName || !reason) return null;
      return { plant_name: plantName, reason };
    })
    .filter(Boolean);
  return normalized as Array<{ plant_name: string; reason: string }>;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Missing GOOGLE_API_KEY" }, 500);
  }

  let payload: {
    imageUrl?: string;
    imageDataUrl?: string;
    latitude?: number;
    longitude?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { imageUrl, imageDataUrl, latitude, longitude } = payload ?? {};

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return jsonResponse({ error: "latitude and longitude are required" }, 400);
  }

  let imageBase64 = "";
  let mimeType = "image/jpeg";

  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:")) {
    const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return jsonResponse({ error: "Invalid imageDataUrl format" }, 400);
    }
    mimeType = match[1] || mimeType;
    imageBase64 = match[2];
  } else if (typeof imageUrl === "string" && imageUrl) {
    let imageResponse: Response;
    try {
      imageResponse = await fetch(imageUrl);
    } catch {
      return jsonResponse({ error: "Unable to fetch image" }, 400);
    }

    if (!imageResponse.ok) {
      return jsonResponse({ error: "Unable to fetch image" }, 400);
    }

    mimeType = imageResponse.headers.get("content-type") ?? mimeType;
    const imageBuffer = await imageResponse.arrayBuffer();
    imageBase64 = arrayBufferToBase64(imageBuffer);
  } else {
    return jsonResponse(
      { error: "imageUrl or imageDataUrl is required" },
      400
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  let result;
  try {
    result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: `Coordinates: ${latitude}, ${longitude}` },
            { inlineData: { data: imageBase64, mimeType } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });
  } catch (error) {
    console.warn("Gemini request failed with JSON config:", error);
    try {
      result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: `Coordinates: ${latitude}, ${longitude}` },
              { inlineData: { data: imageBase64, mimeType } },
            ],
          },
        ],
      });
    } catch (fallbackError) {
      console.warn("Gemini request failed:", fallbackError);
      return jsonResponse({ error: "Gemini request failed" }, 502);
    }
  }

  const text = result.response.text().trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanModelText(text));
  } catch {
    return jsonResponse(
      { error: "Model output was not valid JSON", raw: text },
      502
    );
  }

  const suggestions = normalizeSuggestions(parsed);
  if (suggestions.length === 0) {
    return jsonResponse(
      { error: "Model output missing plant suggestions", raw: text },
      502
    );
  }

  return jsonResponse(suggestions);
});
