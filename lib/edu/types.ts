export type EduCategory = {
  id: string
  name: string
  description?: string | null
}

export type EduCreator = {
  id: string
  display_name: string
  expertise?: string | null
  verified?: boolean
  total_posts?: number
  total_likes?: number
  avatar_url?: string | null
  cover_url?: string | null
  about_media_urls?: string[] | null
}

export type EduPost = {
  id: string
  title: string
  body?: string | null
  category: string
  creator: EduCreator
  media_type: "video" | "carousel" | "image" | "infographic" | "text"
  media_urls: string[]
  status: "verified" | "needs_review" | "rejected"
  created_at: string
  likes: number
  saves: number
  comments: number
}
