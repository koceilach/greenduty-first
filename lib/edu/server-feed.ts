import type { EduFeedPost } from "@/lib/edu/feed";

const PAGE_SIZE = 4;

type EduPostRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  media_type: string;
  media_urls: string[] | null;
  hashtags: string[] | null;
  sources: string[] | null;
  status: string;
  created_at: string;
  edu_creators?: {
    display_name: string;
    verified: boolean | null;
    avatar_url: string | null;
  } | null;
  edu_categories?: {
    name: string;
  } | null;
  edu_ai_verifications?:
    | {
        status: string | null;
        accuracy: number | null;
        source_credibility: number | null;
        greenwashing_risk: string | null;
        risk_flags: string[] | null;
        sources: string[] | null;
        notes: string | null;
        verified_at: string | null;
      }
    | Array<{
        status: string | null;
        accuracy: number | null;
        source_credibility: number | null;
        greenwashing_risk: string | null;
        risk_flags: string[] | null;
        sources: string[] | null;
        notes: string | null;
        verified_at: string | null;
      }>
    | null;
};

const categoryBadge = (label: string) => {
  switch (label) {
    case "Water":
      return "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800";
    case "Climate":
      return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
    case "Soil":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
    default:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
  }
};

const mediaMeta = (type: string) => {
  const key = type?.toLowerCase?.() ?? "image";
  if (key === "video") {
    return {
      label: "Short Video",
      gradientClass: "from-sky-400/20 via-cyan-300/10 to-transparent",
    };
  }
  if (key === "carousel") {
    return {
      label: "Carousel",
      gradientClass: "from-amber-400/20 via-lime-300/10 to-transparent",
    };
  }
  if (key === "infographic") {
    return {
      label: "Infographic",
      gradientClass: "from-emerald-500/20 via-green-400/10 to-transparent",
    };
  }
  return {
    label: "Field Note",
    gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent",
  };
};

const normalizeMediaUrls = (urls?: string[] | null) => (urls ?? []).filter(Boolean);

const buildPost = (row: EduPostRow): EduFeedPost => {
  const categoryLabel = row.edu_categories?.name ?? "Agronomy";
  const badgeClass = categoryBadge(categoryLabel);
  const meta = mediaMeta(row.media_type);
  const mediaUrls = normalizeMediaUrls(row.media_urls);
  const isCarousel = row.media_type?.toLowerCase?.() === "carousel";
  const isVideo = row.media_type?.toLowerCase?.() === "video";
  const aiData = Array.isArray(row.edu_ai_verifications)
    ? row.edu_ai_verifications[0]
    : row.edu_ai_verifications;

  return {
    id: row.id,
    creatorUserId: row.user_id,
    creator: {
      name: row.edu_creators?.display_name ?? "Green Duty",
      handle: row.edu_creators?.display_name
        ? `@${row.edu_creators.display_name.toLowerCase().replace(/\s+/g, ".")}`
        : "@greenduty",
      avatar: (row.edu_creators?.display_name ?? "GD").slice(0, 2).toUpperCase(),
      avatarUrl: row.edu_creators?.avatar_url ?? null,
      verified: Boolean(row.edu_creators?.verified),
      role: row.edu_creators?.verified ? "Expert" : "User",
    },
    category: {
      label: categoryLabel as EduFeedPost["category"]["label"],
      badgeClass,
    },
    media: {
      type: (row.media_type?.toLowerCase?.() as EduFeedPost["media"]["type"]) ?? "image",
      label: meta.label,
      description: row.title,
      gradientClass: meta.gradientClass,
      assetUrl: isCarousel ? undefined : mediaUrls[0],
      assetUrls: isCarousel ? mediaUrls : undefined,
      posterUrl: isVideo ? mediaUrls[1] ?? "/student2.jpg" : undefined,
    },
    caption: row.body ?? row.title,
    explanation: row.body ?? row.title,
    hashtags: (row.hashtags ?? []).length ? row.hashtags! : ["#GreenDuty"],
    sources: row.sources ?? aiData?.sources ?? [],
    stats: {
      likes: "0",
      comments: "0",
    },
    saves: "0",
    aiReport: {
      status: (aiData?.status?.toUpperCase?.() as EduFeedPost["aiReport"]["status"]) ?? "VERIFIED",
      accuracy: aiData?.accuracy ?? 0.95,
      sourceCredibility: aiData?.source_credibility ?? 0.9,
      greenwashingRisk: (aiData?.greenwashing_risk as "Low" | "Medium" | "High") ?? "Low",
      flags: aiData?.risk_flags ?? [],
      notes: aiData?.notes ?? "No risks detected by AI.",
      verifiedAt: aiData?.verified_at ?? new Date().toISOString(),
      sources: aiData?.sources ?? [],
    },
    comments: [],
  };
};

export async function getEduFeedPosts(): Promise<EduFeedPost[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];

  const params = new URLSearchParams({
    select:
      "id,user_id,title,body,media_type,media_urls,hashtags,sources,status,created_at,edu_creators(display_name,verified,avatar_url),edu_categories(name),edu_ai_verifications(status,accuracy,source_credibility,greenwashing_risk,risk_flags,sources,notes,verified_at)",
    status: "eq.published",
    order: "created_at.desc,id.desc",
    limit: PAGE_SIZE.toString(),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/edu_posts?${params.toString()}`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as EduPostRow[];
    return data.map(buildPost);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
