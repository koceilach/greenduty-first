import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Droplet,
  Globe,
  Home,
  Leaf,
  MessageCircle,
  PlusSquare,
  Search,
  Sprout,
  User,
  Users,
} from "lucide-react";

export type EduAIReport = {
  status: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
  accuracy: number;
  sourceCredibility: number;
  greenwashingRisk: "Low" | "Medium" | "High";
  flags: string[];
  notes: string;
  verifiedAt: string;
  sources: string[];
};

export type EduFeedPost = {
  id: string;
  creatorUserId?: string;
  creator: {
    name: string;
    handle: string;
    avatar: string;
    avatarUrl?: string | null;
    verified: boolean;
    role: "User" | "Expert";
  };
  category: {
    label: "Agronomy" | "Climate" | "Soil" | "Water";
    badgeClass: string;
  };
  media: {
    type: "image" | "video" | "carousel" | "infographic";
    label: string;
    description: string;
    icon?: LucideIcon;
    gradientClass: string;
    assetUrl?: string;
    assetUrls?: string[];
    posterUrl?: string;
  };
  caption: string;
  explanation: string;
  hashtags: string[];
  sources: string[];
  stats: {
    likes: string;
    comments: string;
  };
  saves?: string;
  aiReport: EduAIReport;
  comments: Array<{
    id: string;
    author: string;
    role: string;
    body: string;
    time: string;
    userId?: string;
    likeCount?: number;
    liked?: boolean;
  }>;
};

export const eduNavItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Home", href: "/education", icon: Home },
  { label: "Search", href: "/education/search", icon: Search },
  { label: "Create", href: "/education/create", icon: PlusSquare },
  { label: "People", href: "/education/people", icon: Users },
  { label: "Notifications", href: "/education/notifications", icon: Bell },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Profile", href: "/profile", icon: User },
];

export const eduSuggestedTopics = [
  "Regenerative farming",
  "Composting",
  "Soil microbiome",
  "Water harvesting",
  "Urban agriculture",
];

export const eduTrendingPosts = [
  "Drip irrigation savings",
  "Agroforestry yield gains",
  "Pollinator corridors",
];

export const eduProfile = {
  name: "Green Duty Learner",
  handle: "@greenduty.student",
  role: "User",
  avatar: "GD",
  stats: {
    posts: 8,
    likes: 124,
    saves: 42,
  },
  bio: "Learning agronomy and sustainability with AI-verified insights.",
};

export const eduMockPosts: EduFeedPost[] = [
  {
    id: "soil-verified-01",
    creator: {
      name: "Dr. Amina Cherif",
      handle: "@soil.amina",
      avatar: "AC",
      verified: true,
      role: "Expert",
    },
    category: {
      label: "Soil",
      badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    },
    media: {
      type: "infographic",
      label: "Infographic",
      description: "Soil organic matter boosts yield, water retention, and biodiversity.",
      icon: Leaf,
      gradientClass: "from-emerald-500/20 via-green-400/10 to-transparent",
      assetUrl: "/images/greenduty-nature.jpg",
    },
    caption:
      "Small gains in organic matter can raise water holding capacity and cut erosion risk.",
    explanation:
      "Start with compost + cover crops. Even a 1% rise in soil organic matter can improve infiltration and resilience during dry spells.",
    hashtags: ["#Agronomy", "#Soil", "#Sustainability"],
    sources: ["FAO Soils Portal", "USDA Soil Health Guide", "IPCC AR6 WGII"],
    stats: {
      likes: "2.4k",
      comments: "138",
    },
    saves: "842",
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.96,
      sourceCredibility: 0.94,
      greenwashingRisk: "Low",
      flags: [],
      notes: "Claims align with FAO and USDA soil health guidance.",
      verifiedAt: "2026-02-05",
      sources: ["FAO Soils Portal", "USDA Soil Health Guide", "IPCC AR6 WGII"],
    },
    comments: [
      {
        id: "c1",
        author: "Lina B.",
        role: "Student",
        body: "We started cover crops last season and saw less runoff.",
        time: "2h",
      },
      {
        id: "c2",
        author: "Eco Atlas",
        role: "Expert",
        body: "Agree. Pair with reduced till for best soil structure gains.",
        time: "1h",
      },
    ],
  },
  {
    id: "water-verified-02",
    creator: {
      name: "Nadia Benali",
      handle: "@water.nadia",
      avatar: "NB",
      verified: false,
      role: "User",
    },
    category: {
      label: "Water",
      badgeClass: "bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800",
    },
    media: {
      type: "video",
      label: "Short Video",
      description: "Micro-catchments increase infiltration and reduce runoff loss.",
      icon: Droplet,
      gradientClass: "from-sky-400/20 via-cyan-300/10 to-transparent",
      assetUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      posterUrl: "/student2.jpg",
    },
    caption:
      "Micro-catchments and contour bunds slow runoff and improve soil moisture.",
    explanation:
      "In semi-arid fields, simple earthworks can concentrate rainfall and reduce surface loss. Combine with mulch to limit evaporation.",
    hashtags: ["#Water", "#Climate", "#GreenDuty"],
    sources: ["UNEP Water Facts", "FAO Water in Ag", "World Bank CSA"],
    stats: {
      likes: "1.1k",
      comments: "72",
    },
    saves: "312",
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.91,
      sourceCredibility: 0.89,
      greenwashingRisk: "Low",
      flags: [],
      notes: "Evidence-based conservation practice with strong consensus.",
      verifiedAt: "2026-02-04",
      sources: ["UNEP Water Facts", "FAO Water in Ag", "World Bank CSA"],
    },
    comments: [
      {
        id: "c3",
        author: "Samir A.",
        role: "Student",
        body: "Any tips on spacing between basins?",
        time: "3h",
      },
    ],
  },
  {
    id: "climate-verified-03",
    creator: {
      name: "Prof. Karim Ali",
      handle: "@climate.karim",
      avatar: "KA",
      verified: true,
      role: "Expert",
    },
    category: {
      label: "Climate",
      badgeClass: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    },
    media: {
      type: "carousel",
      label: "Carousel",
      description: "Heat-tolerant crop varieties reduce yield loss in extreme seasons.",
      icon: Globe,
      gradientClass: "from-amber-400/20 via-lime-300/10 to-transparent",
      assetUrls: ["/Background.png", "/Background10.png", "/student1.png"],
    },
    caption:
      "Climate-smart varieties and shade trees stabilize yields during heatwaves.",
    explanation:
      "Diversify cultivars and add shelterbelts to reduce temperature stress. Mixed systems absorb shocks better than single-crop fields.",
    hashtags: ["#Climate", "#Agronomy", "#Resilience"],
    sources: ["CGIAR Research", "IPCC AR6 WGIII", "FAO Climate Smart Ag"],
    stats: {
      likes: "3.8k",
      comments: "209",
    },
    saves: "1.1k",
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.95,
      sourceCredibility: 0.92,
      greenwashingRisk: "Low",
      flags: [],
      notes: "Aligned with IPCC mitigation and adaptation guidance.",
      verifiedAt: "2026-02-03",
      sources: ["CGIAR Research", "IPCC AR6 WGIII", "FAO Climate Smart Ag"],
    },
    comments: [
      {
        id: "c4",
        author: "GreenLab Solar",
        role: "Expert",
        body: "We see better results when shade trees are planted early.",
        time: "5h",
      },
    ],
  },
  {
    id: "agronomy-verified-04",
    creator: {
      name: "Farid Nour",
      handle: "@agronomy.farid",
      avatar: "FN",
      verified: true,
      role: "Expert",
    },
    category: {
      label: "Agronomy",
      badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    },
    media: {
      type: "image",
      label: "Field Note",
      description: "Balanced crop rotation reduces pest pressure and fertilizer needs.",
      icon: Sprout,
      gradientClass: "from-emerald-400/20 via-teal-200/10 to-transparent",
      assetUrl: "/student1.png",
    },
    caption:
      "Rotations with legumes cut fertilizer demand while improving soil structure.",
    explanation:
      "Alternate cereals with legumes and cover crops to interrupt pest cycles, boost nitrogen fixation, and stabilize yields.",
    hashtags: ["#Agronomy", "#GreenDuty", "#Sustainability"],
    sources: ["FAO Crop Rotation", "Nature Food Review", "IFAD Soil Health"],
    stats: {
      likes: "1.9k",
      comments: "96",
    },
    saves: "640",
    aiReport: {
      status: "VERIFIED",
      accuracy: 0.93,
      sourceCredibility: 0.9,
      greenwashingRisk: "Low",
      flags: [],
      notes: "Rotation benefits are strongly supported by long-term trials.",
      verifiedAt: "2026-02-02",
      sources: ["FAO Crop Rotation", "Nature Food Review", "IFAD Soil Health"],
    },
    comments: [
      {
        id: "c5",
        author: "Amina H.",
        role: "User",
        body: "Would chickpeas work well after wheat in this cycle?",
        time: "6h",
      },
    ],
  },
];
