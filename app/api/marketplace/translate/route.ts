import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GD_TRANSLATE_TEXT_MAX_LENGTH = 260;

const GD_isValidTarget = (target: string): target is "en" | "fr" | "ar" =>
  target === "en" || target === "fr" || target === "ar";

export async function POST(request: NextRequest) {
  let body: { target?: string; text?: string } | null = null;
  try {
    body = (await request.json()) as { target?: string; text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const target = String(body?.target ?? "").trim().toLowerCase();
  const text = String(body?.text ?? "").trim();

  if (!GD_isValidTarget(target)) {
    return NextResponse.json({ error: "Unsupported target language." }, { status: 400 });
  }

  if (!text || text.length > GD_TRANSLATE_TEXT_MAX_LENGTH) {
    return NextResponse.json({ error: "Invalid text length." }, { status: 400 });
  }

  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}` +
    `&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ translation: text }, { status: 200 });
    }
    const payload = (await response.json()) as unknown;
    const translation = Array.isArray(payload)
      ? ((payload[0] as unknown[]) ?? [])
          .map((entry) =>
            Array.isArray(entry) && typeof entry[0] === "string" ? entry[0] : ""
          )
          .join("")
      : "";

    return NextResponse.json({ translation: translation || text }, { status: 200 });
  } catch {
    return NextResponse.json({ translation: text }, { status: 200 });
  }
}
