import { EduPost } from "@/lib/edu/types"

export type EduSignals = {
  categoryFollows: Record<string, boolean>
  creatorFollows: Record<string, boolean>
  likes: Record<string, number>
  saves: Record<string, boolean>
  comments: Record<string, number>
  views: Record<string, number>
  replays: Record<string, number>
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export const rankEduPosts = (posts: EduPost[], signals: EduSignals) => {
  const now = Date.now()
  const scored = posts.map((post) => {
    const interest = signals.categoryFollows[post.category] ? 0.25 : 0
    const creatorAffinity = signals.creatorFollows[post.creator.id] ? 0.2 : 0
    const engagement =
      clamp((signals.likes[post.id] ?? 0) / 20) * 0.15 +
      (signals.saves[post.id] ? 0.15 : 0) +
      clamp((signals.comments[post.id] ?? 0) / 10) * 0.1
    const views = clamp((signals.views[post.id] ?? 0) / 8) * 0.1
    const replays = clamp((signals.replays[post.id] ?? 0) / 3) * 0.05
    const freshness = clamp(1 - (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 48)) * 0.1
    const credibility = post.creator.verified ? 0.1 : 0
    const qualityPenalty = post.status === "rejected" ? -0.5 : post.status === "needs_review" ? -0.1 : 0
    const score = interest + creatorAffinity + engagement + views + replays + freshness + credibility + qualityPenalty
    return { post, score }
  })

  return scored.sort((a, b) => b.score - a.score).map((item) => item.post)
}
