import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return NextResponse.json({ error: "Missing Unsplash key" }, { status: 500 })
  }

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Unsplash request failed" }, { status: 502 })
  }

  const data = await res.json()
  const result = data?.results?.[0]
  if (!result) {
    return NextResponse.json({ error: "No image found" }, { status: 404 })
  }

  return NextResponse.json({
    imageUrl: result.urls?.regular,
    photographer: result.user?.name,
    photographerUrl: result.user?.links?.html,
    unsplashUrl: result.links?.html,
  })
}
