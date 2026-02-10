import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const normalized = query.replace(/\s+/g, " ").trim()
  const wikiCandidates = [
    normalized,
    normalized.replace(/\b(tree|plant|flower|vine)\b/gi, "").trim(),
  ].filter(Boolean)

  for (const candidate of wikiCandidates) {
    const wikiTitle = candidate.replace(/\s+/g, "_")
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
      )
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const wikiImage = wikiData?.originalimage?.source || wikiData?.thumbnail?.source
        if (wikiImage) {
          return NextResponse.json({
            imageUrl: wikiImage,
            source: "wikipedia",
            attribution: "Wikipedia",
            link: wikiData?.content_urls?.desktop?.page || "https://wikipedia.org",
          })
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (accessKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(normalized)}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${accessKey}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const result = data?.results?.[0]
        if (result?.urls?.regular) {
          return NextResponse.json({
            imageUrl: result.urls.regular,
            source: "unsplash",
            attribution: result.user?.name || "Unsplash",
            link: result.user?.links?.html || "https://unsplash.com",
            unsplashUrl: result.links?.html,
          })
        }
      }
    } catch {
      // ignore and fall through
    }
  }

  return NextResponse.json({
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(normalized)}/900/600`,
    source: "fallback",
    attribution: "Picsum",
    link: "https://picsum.photos",
  })
}
