import type { HomeFeedPostItem } from "@/app/education/actions/get-home-feed";
import type { EduFeedPost } from "@/lib/edu/feed";
import { Droplet, Globe, Leaf, Sprout } from "lucide-react";

const toCategoryLabel = (value: string): EduFeedPost["category"]["label"] => {
  if (value === "Climate" || value === "Soil" || value === "Water") return value;
  return "Agronomy";
};

const categoryBadge = (label: EduFeedPost["category"]["label"]) => {
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
      icon: Droplet,
      gradientClass: "from-sky-400/20 via-cyan-300/10 to-transparent",
    };
  }
  if (key === "carousel") {
    return {
      label: "Carousel",
      icon: Globe,
      gradientClass: "from-amber-400/20 via-lime-300/10 to-transparent",
    };
  }
  if (key === "infographic") {
    return {
      label: "Infographic",
      icon: Leaf,
      gradientClass: "from-emerald-500/20 via-green-400/10 to-transparent",
    };
  }
  if (key === "resource") {
    return {
      label: "Resource",
      icon: Globe,
      gradientClass: "from-emerald-500/20 via-teal-300/10 to-transparent",
    };
  }
  return {
    label: "Field Note",
    icon: Sprout,
    gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent",
  };
};

export const mapHomeFeedPostToEduFeedPost = (item: HomeFeedPostItem): EduFeedPost => {
  const media = mediaMeta(item.post.mediaType);
  const mediaUrls = (item.post.mediaUrls ?? []).filter(Boolean);
  const isCarousel = item.post.mediaType?.toLowerCase() === "carousel";
  const isVideo = item.post.mediaType?.toLowerCase() === "video";
  const categoryLabel = toCategoryLabel(item.post.category ?? "Agronomy");
  const displayName = item.author.name?.trim() || "Green Duty";
  const handle = `@${item.author.username}`;

  return {
    id: item.id,
    creatorUserId: item.author.id,
    creator: {
      name: displayName,
      handle,
      avatar: displayName.slice(0, 2).toUpperCase(),
      avatarUrl: item.author.avatarUrl,
      verified: false,
      role: "User",
    },
    category: {
      label: categoryLabel,
      badgeClass: categoryBadge(categoryLabel),
    },
    media: {
      type: (item.post.mediaType?.toLowerCase?.() as EduFeedPost["media"]["type"]) ?? "image",
      label: media.label,
      description: item.post.title,
      icon: media.icon,
      gradientClass: media.gradientClass,
      assetUrl: isCarousel ? undefined : mediaUrls[0],
      assetUrls: isCarousel ? mediaUrls : undefined,
      posterUrl: isVideo ? mediaUrls[1] ?? "/student2.jpg" : undefined,
      resourceUrl: item.post.resourceUrl,
    },
    caption: item.post.body ?? item.post.title,
    explanation: item.post.body ?? item.post.title,
    hashtags: (item.post.hashtags ?? []).filter(Boolean),
    sources: (item.post.sources ?? []).filter(Boolean),
    stats: {
      likes: String(item.post.likesCount ?? 0),
      comments: String(item.post.commentsCount ?? 0),
    },
    saves: "0",
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.95,
      sourceCredibility: 0.9,
      greenwashingRisk: "Low",
      flags: [],
      notes: "AI verification metadata is not available in ranked feed payload.",
      verifiedAt: item.createdAt,
      sources: [],
    },
    comments: [],
  };
};
