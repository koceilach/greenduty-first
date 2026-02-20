"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Select from "@radix-ui/react-select";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Clock3,
  Droplets,
  Gauge,
  Home,
  Leaf,
  LineChart,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Shield,
  ImagePlus,
  NotebookPen,
  PieChart,
  Play,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sprout,
  Star,
  Thermometer,
  TrendingUp,
  User,
  Users,
  Wind,
  X,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { GD_WILAYAS } from "@/lib/wilayas";

const GD_NAV_ITEMS = [
  "AI",
] as const;

const GD_HERO_STATS = [
  {
    label: "AI Match",
    value: "89.5%",
    icon: Sparkles,
  },
  {
    label: "Wilayas Covered",
    value: String(GD_WILAYAS.length - 1),
    icon: MapPin,
  },
  {
    label: "Verified Sellers",
    value: "250+",
    icon: BadgeCheck,
  },
] as const;

const GD_WILAYA_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "All Wilayas": { lat: 36.7538, lon: 3.0588 },
  Algiers: { lat: 36.7538, lon: 3.0588 },
  Oran: { lat: 35.6969, lon: -0.6331 },
  Constantine: { lat: 36.365, lon: 6.6147 },
  Setif: { lat: 36.1897, lon: 5.4137 },
};

const GD_WILAYA_OPTIONS = GD_WILAYAS;
const GD_formatWilayaLabel = (value?: string | null) => {
  if (!value) return "Algeria";
  return value === "All Wilayas" ? "All Algeria" : value;
};

const GD_AI_FILTERS = ["All", "High Match", "Best Price", "Near You"] as const;

const GD_FEATURED_FILTERS = [
  "All",
  "Vegetables",
  "Fruits",
  "Herbs",
  "Grains",
  "Flowers",
] as const;

const GD_LISTING_CATEGORIES = [
  "All Categories",
  "Seeds",
  "Plants",
  "Tools",
  "Fertilizers",
] as const;

const GD_PRODUCT_CATEGORIES = ["Seeds", "Plants", "Tools", "Fertilizers"] as const;
const GD_PRODUCT_TYPES = [
  "Vegetables",
  "Fruits",
  "Herbs",
  "Grains",
  "Flowers",
  "Agronomy Tools",
] as const;

const GD_CATEGORY_CARDS = [
  {
    title: "Vegetables",
    description: "Tomato, pepper, cucumber and more.",
    icon: Leaf,
    matchers: ["vegetable", "tomato", "pepper", "cucumber", "lettuce", "carrot"],
  },
  {
    title: "Fruits",
    description: "Berries, citrus, melons and orchard seeds.",
    icon: Sparkles,
    matchers: ["fruit", "citrus", "berry", "melon", "grape", "apple"],
  },
  {
    title: "Grains & Cereals",
    description: "Wheat, barley, corn and pulses.",
    icon: Sprout,
    matchers: ["grain", "cereal", "wheat", "barley", "corn", "rice"],
  },
  {
    title: "Herbs & Spices",
    description: "Basil, mint, thyme, coriander.",
    icon: NotebookPen,
    matchers: ["herb", "spice", "basil", "mint", "thyme", "coriander", "oregano"],
  },
  {
    title: "Legumes",
    description: "Beans, lentils, chickpeas.",
    icon: ShoppingBag,
    matchers: ["legume", "bean", "lentil", "chickpea", "pea", "fava"],
  },
  {
    title: "Flowers",
    description: "Ornamental and pollinator-friendly blooms.",
    icon: Award,
    matchers: ["flower", "ornamental", "rose", "jasmine", "lavender", "sunflower"],
  },
] as const;

const GD_WEATHER_FALLBACK = [
  {
    label: "Temperature",
    value: "--",
    detail: "Updating...",
    icon: Thermometer,
  },
  {
    label: "Humidity",
    value: "--",
    detail: "Awaiting data",
    icon: Droplets,
  },
  {
    label: "Wind",
    value: "--",
    detail: "Awaiting data",
    icon: Wind,
  },
  {
    label: "Soil Moisture",
    value: "--",
    detail: "Awaiting data",
    icon: CloudSun,
  },
] as const;

const GD_FEATURES = [
  {
    title: "AI Soil Analysis",
    description: "Scan soil and get planting recommendations instantly.",
    icon: Bot,
    cta: "Scan Now",
  },
  {
    title: "Visual Search",
    description: "Upload a crop image to find matching seeds.",
    icon: Search,
    cta: "Upload",
  },
  {
    title: "Yield Predictor",
    description: "Estimate harvest output based on local weather.",
    icon: TrendingUp,
    cta: "Predict",
  },
  {
    title: "Smart Alerts",
    description: "Get notified about price drops and weather risks.",
    icon: Bell,
    cta: "Enable",
  },
  {
    title: "Community Forum",
    description: "Ask other growers and share advice.",
    icon: Users,
    cta: "Join",
  },
];

const GD_FEATURES_LOCK_DURATION_MS = 96 * 60 * 60 * 1000;
const GD_FEATURES_UNLOCK_AT_STORAGE_KEY = "greenduty.marketplace.features.unlockAt";

const GD_ANALYTICS_STATS = [
  {
    label: "Total Orders",
    value: "45,230",
    icon: ShoppingBag,
  },
  {
    label: "AI Matches",
    value: "1,240",
    icon: Sparkles,
  },
  {
    label: "Active Farmers",
    value: "12,450",
    icon: Users,
  },
  {
    label: "Avg. Yield",
    value: "4.8/5",
    icon: Star,
  },
];

const GD_SELLERS = [
  {
    name: "Widad Seeds",
    role: "Premium Supplier",
    rating: "4.9",
    deals: "1.2k sales",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Yacine Farm",
    role: "Organic Grower",
    rating: "4.8",
    deals: "980 sales",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Sahara Seeds",
    role: "Desert Adapted",
    rating: "4.7",
    deals: "860 sales",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Green Bloom",
    role: "Hydroponic Lab",
    rating: "4.9",
    deals: "1.5k sales",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=300&q=80",
  },
];

type GDKnowledgeArticle = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  readTime: string;
  intro: string;
  keyActions: string[];
  sections: Array<{
    heading: string;
    body: string;
  }>;
};

const GD_KNOWLEDGE: GDKnowledgeArticle[] = [
  {
    id: "compost-basics",
    title: "Compost Basics: Feeding the Soil",
    description: "Step-by-step guide to building rich compost in 30 days.",
    category: "Soil Health",
    readTime: "7 min read",
    intro:
      "Compost turns kitchen and farm waste into nutrient-rich soil food. A balanced pile improves moisture retention, root strength, and long-term crop resilience.",
    keyActions: [
      "Build with a 3:1 ratio of dry browns to fresh greens.",
      "Keep moisture like a squeezed sponge, not wet mud.",
      "Turn the pile every 5-7 days for oxygen flow.",
      "Use mature compost when color is dark and smell is earthy.",
    ],
    sections: [
      {
        heading: "Layering Method",
        body:
          "Start with coarse dry material at the base for airflow, then alternate green and brown layers. Thin layers break down faster and reduce odor issues.",
      },
      {
        heading: "Moisture and Heat Control",
        body:
          "If the pile is too dry, decomposition slows. If it is too wet, it turns anaerobic. Keep it lightly moist and monitor heat in the center for active breakdown.",
      },
      {
        heading: "Field Application",
        body:
          "Apply finished compost before planting or around established crops as a top dressing. This improves soil structure and reduces dependence on chemical inputs.",
      },
    ],
    image:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "seasonal-calendar",
    title: "Seasonal Planting Calendar for Algeria",
    description: "Know what to plant each month with smart reminders.",
    category: "Planning",
    readTime: "8 min read",
    intro:
      "Planting at the right time is often the difference between average and excellent yields. This calendar framework helps align crop cycles with Algerian climate windows.",
    keyActions: [
      "Match crop families to local temperature bands.",
      "Reserve protected sowing for unstable weather weeks.",
      "Plan irrigation peaks before hot-season stress begins.",
      "Stagger planting dates to reduce harvest risk.",
    ],
    sections: [
      {
        heading: "Early Season Strategy",
        body:
          "Use nurseries and protected trays for sensitive seedlings. Start hardy vegetables first, then move to heat-sensitive crops after stable night temperatures.",
      },
      {
        heading: "Mid-Season Adjustments",
        body:
          "During hotter weeks, prioritize mulching and morning irrigation. Adjust spacing to improve airflow and reduce fungal pressure in humid zones.",
      },
      {
        heading: "Late Season Rotation",
        body:
          "Transition plots with legumes and soil-cover crops to maintain fertility. Rotation breaks pest cycles and prepares cleaner beds for the next season.",
      },
    ],
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "greenhouse-hacks",
    title: "Greenhouse Setup: 3 Low-Cost Hacks",
    description: "Boost humidity and temperature for winter seedlings.",
    category: "Smart Farming",
    readTime: "6 min read",
    intro:
      "You can improve greenhouse performance without expensive systems. A few low-cost interventions can stabilize temperature, airflow, and seedling survival rates.",
    keyActions: [
      "Seal heat leaks along doors and side seams.",
      "Install simple thermal mass like dark water barrels.",
      "Create cross-vent openings to prevent humidity spikes.",
      "Use shade cloth timing to protect midday growth.",
    ],
    sections: [
      {
        heading: "Thermal Retention on Budget",
        body:
          "Thermal mass absorbs heat by day and releases it at night. Even basic water drums can soften cold swings and reduce seedling shock.",
      },
      {
        heading: "Ventilation for Disease Prevention",
        body:
          "Stagnant moist air promotes fungal outbreaks. Cross-vent paths and periodic vent cycles keep leaves dry and stems stronger.",
      },
      {
        heading: "Micro-Zone Layout",
        body:
          "Group plants by heat and humidity needs. Creating micro-zones allows better growth control and avoids overwatering sensitive varieties.",
      },
    ],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
];

const GD_TESTIMONIALS = [
  {
    quote:
      "The AI recommendations helped me pick the right seeds for my dry land.",
    name: "Rania D.",
    role: "Farmer, Laghouat",
  },
  {
    quote:
      "I love the weather dashboard. It saved my crop from unexpected wind.",
    name: "Sofiane B.",
    role: "Urban Grower, Algiers",
  },
  {
    quote:
      "Marketplace analytics made it easy to track my seed sales.",
    name: "Meriem K.",
    role: "Seller, Oran",
  },
];

const GD_FOOTER_LINKS = [
  {
    title: "Marketplace",
    links: ["Seeds", "Plants", "Tools", "Sellers"],
  },
  {
    title: "Resources",
    links: ["Knowledge Hub", "Weather AI", "Guides", "Support"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Privacy", "Terms"],
  },
];

const GD_CARD_BASE =
  "rounded-2xl border border-white/10 bg-white/5 shadow-[0_12px_30px_rgba(0,0,0,0.25)]";
const GD_WEATHER_REFRESH_MS = 5 * 60 * 1000;
const GD_SPOTLIGHT_LIMIT = 6;
const GD_PUBLISH_TIMEOUT_MS = 12000;
const GD_PUBLISH_WATCHDOG_MS = 18000;
const GD_BOTTOM_NAV_ITEM =
  "gd-bottom-nav-item group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-center text-[11px] font-medium text-gray-500 transition-colors duration-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 max-[360px]:gap-0.5 max-[360px]:px-1 max-[360px]:text-[9px] sm:text-[12px]";
const GD_BOTTOM_NAV_ICON =
  "gd-bottom-nav-icon h-4 w-4 text-gray-500 transition-colors duration-200 max-[360px]:h-3.5 max-[360px]:w-3.5 sm:h-5 sm:w-5";

const GD_COUPON_MAX_DISCOUNT = 50;

const GD_parseCouponDiscount = (code: string) => {
  const match = code.trim().match(/(\d{1,2})/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(GD_COUPON_MAX_DISCOUNT, value);
};

const GD_withTimeout = async <T,>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const GD_formatCountdown = (timeLeftMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function GDMarketplaceFeaturesSection() {
  const [isLocked, setIsLocked] = useState(true);
  const [timeLeftMs, setTimeLeftMs] = useState(GD_FEATURES_LOCK_DURATION_MS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUnlockAt = Number(window.localStorage.getItem(GD_FEATURES_UNLOCK_AT_STORAGE_KEY));
    const unlockAt =
      Number.isFinite(savedUnlockAt) && savedUnlockAt > 0
        ? savedUnlockAt
        : Date.now() + GD_FEATURES_LOCK_DURATION_MS;

    if (!Number.isFinite(savedUnlockAt) || savedUnlockAt <= 0) {
      window.localStorage.setItem(GD_FEATURES_UNLOCK_AT_STORAGE_KEY, String(unlockAt));
    }

    const updateCountdown = () => {
      const remaining = unlockAt - Date.now();

      if (remaining <= 0) {
        setIsLocked(false);
        setTimeLeftMs(0);
        return true;
      }

      setIsLocked(true);
      setTimeLeftMs(remaining);
      return false;
    };

    if (updateCountdown()) return;

    const intervalId = window.setInterval(() => {
      if (updateCountdown()) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const countdownLabel = useMemo(() => GD_formatCountdown(timeLeftMs), [timeLeftMs]);

  return (
    <section id="marketplace-features" className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">
          Intelligent Marketplace Features
        </h2>
        <p className="text-sm text-gray-500">
          {isLocked
            ? "A premium intelligence pack is in final launch prep."
            : "Elevate planning with precision insights and intelligent automation."}
        </p>
      </div>

      {isLocked ? (
        <div className="space-y-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              <Lock className="h-3.5 w-3.5" />
              Coming soon
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              <Clock3 className="h-3.5 w-3.5" />
              {countdownLabel}
            </span>
          </div>
          <p className="text-center text-xs text-emerald-700">
            96-hour vault mode is active. Feature internals are hidden until auto-unlock.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {GD_FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="rounded-xl border border-emerald-100 bg-white/90 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                    Module {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Locked
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{feature.title}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-medium text-emerald-700">
            Stay ready. All modules unlock automatically when the timer ends.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {GD_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 flex-1 space-y-3 pb-4">
                  <div className="text-sm font-semibold text-gray-900">{feature.title}</div>
                  <p className="text-xs leading-relaxed text-gray-500">
                    {feature.description}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-auto inline-flex w-max self-start items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-medium text-green-700 transition group-hover:bg-green-100"
                >
                  {feature.cta}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

type MarketplaceItem = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_dzd: number;
  image_url: string | null;
  stock_quantity: number;
  category: string | null;
  plant_type: string | null;
  wilaya: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  seller_profile?: MarketplaceSellerProfile | null;
};

type MarketplaceSellerProfile = {
  id: string;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

type GDWeatherData = {
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    wind: number;
    soilMoisture: number | null;
  };
  temperatureSeries: number[];
  rainfallSeries: number[];
  dailyDates: string[];
  updatedAt: string;
};

const GD_LISTING_CATEGORY_MATCHERS: Record<string, string[]> = {
  Seeds: ["seed", "grain", "cereal", "legume"],
  Plants: ["plant", "tree", "flower", "herb"],
  Tools: ["tool", "equipment", "irrigation", "agronomy"],
  Fertilizers: ["fertilizer", "compost", "manure", "nutrient", "soil"],
};

const GD_FEATURED_FILTER_MATCHERS: Record<string, string[]> = {
  Vegetables: ["vegetable", "tomato", "pepper", "cucumber", "lettuce", "carrot"],
  Fruits: ["fruit", "citrus", "berry", "melon", "grape", "apple"],
  Herbs: ["herb", "spice", "basil", "mint", "thyme", "coriander"],
  Grains: ["grain", "cereal", "wheat", "barley", "corn", "rice"],
  Flowers: ["flower", "ornamental", "rose", "jasmine", "lavender", "sunflower"],
};

type GDMarketFilterOptions = {
  selectedWilaya: string;
  selectedListingCategory: string;
  activeFeaturedFilter: string;
  minPrice: string;
  maxPrice: string;
};

const GD_itemText = (item: MarketplaceItem) =>
  `${item.category ?? ""} ${item.plant_type ?? ""} ${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();

const GD_first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const GD_normalizeSellerProfile = (
  value: MarketplaceSellerProfile | MarketplaceSellerProfile[] | null | undefined
): MarketplaceSellerProfile | null => {
  const raw = GD_first(value);
  if (!raw) return null;
  return {
    id: raw.id,
    username: raw.username ?? null,
    store_name: raw.store_name ?? null,
    avatar_url: raw.avatar_url ?? null,
    location: raw.location ?? null,
  };
};

const GD_sellerDisplayName = (profile?: MarketplaceSellerProfile | null) => {
  if (!profile) return "Marketplace Seller";
  if (profile.store_name && profile.store_name.trim().length > 0) {
    return profile.store_name;
  }
  if (profile.username && profile.username.trim().length > 0) {
    return profile.username;
  }
  return "Marketplace Seller";
};

const GD_sellerInitials = (profile?: MarketplaceSellerProfile | null) => {
  const name = GD_sellerDisplayName(profile).trim();
  if (!name) return "MS";
  return name.slice(0, 2).toUpperCase();
};

const GD_matchesAnyTerm = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

const GD_filterMarketplaceItems = (
  items: MarketplaceItem[],
  options: GDMarketFilterOptions
) => {
  const {
    selectedWilaya,
    selectedListingCategory,
    activeFeaturedFilter,
    minPrice,
    maxPrice,
  } = options;

  const minNumeric = Number(minPrice);
  const maxNumeric = Number(maxPrice);
  const hasMin = Number.isFinite(minNumeric);
  const hasMax = Number.isFinite(maxNumeric);
  const lowerBound =
    hasMin && hasMax ? Math.min(minNumeric, maxNumeric) : minNumeric;
  const upperBound =
    hasMin && hasMax ? Math.max(minNumeric, maxNumeric) : maxNumeric;

  return items.filter((item) => {
    const text = GD_itemText(item);

    if (selectedWilaya !== "All Wilayas") {
      const wilaya = item.wilaya ?? "";
      if (wilaya !== selectedWilaya && wilaya !== "All Wilayas") {
        return false;
      }
    }

    if (selectedListingCategory !== "All Categories") {
      const categoryTerms =
        GD_LISTING_CATEGORY_MATCHERS[selectedListingCategory] ?? [
          selectedListingCategory.toLowerCase(),
        ];
      if (!GD_matchesAnyTerm(text, categoryTerms)) {
        return false;
      }
    }

    if (activeFeaturedFilter !== "All") {
      const featuredTerms =
        GD_FEATURED_FILTER_MATCHERS[activeFeaturedFilter] ?? [
          activeFeaturedFilter.toLowerCase(),
        ];
      if (!GD_matchesAnyTerm(text, featuredTerms)) {
        return false;
      }
    }

    const price = Number(item.price_dzd);
    if (hasMin && Number.isFinite(price) && price < lowerBound) {
      return false;
    }
    if (hasMax && Number.isFinite(price) && price > upperBound) {
      return false;
    }

    return true;
  });
};

export default function MarketPlacePage() {
  const { supabase, user, profile, loading: authLoading, signOut } = useMarketplaceAuth();
  const router = useRouter();
  const [activeAiFilter, setActiveAiFilter] = useState("All");
  const [activeFeaturedFilter, setActiveFeaturedFilter] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const [searchValue, setSearchValue] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("All Wilayas");
  const [wilayaQuery, setWilayaQuery] = useState("");
  const [productWilayaQuery, setProductWilayaQuery] = useState("");
  const [selectedListingCategory, setSelectedListingCategory] =
    useState("All Categories");
  const [showAllAi, setShowAllAi] = useState(false);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);
  const [weatherData, setWeatherData] = useState<GDWeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("10000");
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const marketLoadRequestRef = useRef(0);
  const [toast, setToast] = useState<string | null>(null);
  const [activeKnowledgeArticle, setActiveKnowledgeArticle] =
    useState<GDKnowledgeArticle | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null
  );
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    category: "Seeds",
    plantType: "Vegetables",
    color: "",
    size: "",
    price: "",
    coupon: "",
    stock: "10",
    wilaya: "Algiers",
  });
  const [marketMode, setMarketMode] = useState<"buyer" | "seller">(
    profile?.role === "seller" ? "seller" : "buyer"
  );
  const isSeller = marketMode === "seller";
  const canSwitchModes = profile?.role === "seller" || profile?.role === "admin";

  const filteredWilayas = useMemo(() => {
    const query = wilayaQuery.trim().toLowerCase();
    const list = GD_WILAYAS.filter((item) => item !== "All Wilayas");
    if (!query) return GD_WILAYAS;
    const matches = list.filter((item) => item.toLowerCase().includes(query));
    const merged = ["All Wilayas", selectedWilaya, ...matches].filter(Boolean);
    return Array.from(new Set(merged));
  }, [wilayaQuery, selectedWilaya]);

  const filteredProductWilayas = useMemo(() => {
    const query = productWilayaQuery.trim().toLowerCase();
    const list = GD_WILAYA_OPTIONS.filter((item) => item !== "All Wilayas");
    if (!query) return GD_WILAYA_OPTIONS;
    const matches = list.filter((item) => item.toLowerCase().includes(query));
    const merged = ["All Wilayas", productForm.wilaya, ...matches].filter(Boolean);
    return Array.from(new Set(merged));
  }, [productWilayaQuery, productForm.wilaya]);

  const scrollToSection = (id: string) => {
    if (typeof window === "undefined") return;
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!user || !profile?.role) return;
    setMarketMode(profile.role === "seller" ? "seller" : "buyer");
  }, [user, profile?.role]);

  useEffect(() => {
    if (!activeKnowledgeArticle) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveKnowledgeArticle(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeKnowledgeArticle]);

  const filteredMarketItems = useMemo(() => {
    return GD_filterMarketplaceItems(marketItems, {
      selectedWilaya,
      selectedListingCategory,
      activeFeaturedFilter,
      minPrice,
      maxPrice,
    });
  }, [
    marketItems,
    selectedWilaya,
    selectedListingCategory,
    activeFeaturedFilter,
    minPrice,
    maxPrice,
  ]);

  const aiRecommendationsSource = useMemo(() => {
    if (!supabase || filteredMarketItems.length === 0) return [];
    const priceValues = filteredMarketItems
      .map((item) => item.price_dzd)
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);
    const medianPrice =
      priceValues.length > 0
        ? priceValues[Math.floor(priceValues.length / 2)]
        : null;

    return filteredMarketItems.map((item) => {
      const seed = `${item.id ?? ""}${item.title ?? ""}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 997;
      }
      const match = 75 + (hash % 21);
      let tag: (typeof GD_AI_FILTERS)[number] = "High Match";
      if (
        selectedWilaya !== "All Wilayas" &&
        item.wilaya &&
        item.wilaya === selectedWilaya
      ) {
        tag = "Near You";
      } else if (
        typeof item.price_dzd === "number" &&
        medianPrice !== null &&
        item.price_dzd <= medianPrice
      ) {
        tag = "Best Price";
      }

      const description =
        item.description?.trim() ||
        "Fresh marketplace listing from a verified seller.";

      return {
        id: item.id,
        name: item.title ?? "Marketplace Item",
        description:
          description.length > 92 ? `${description.slice(0, 92)}…` : description,
        match,
        price:
          typeof item.price_dzd === "number"
            ? `${item.price_dzd.toLocaleString()} DZD`
            : "Price on request",
        location: GD_formatWilayaLabel(item.wilaya),
        tag,
        sellerId: item.seller_id,
        sellerName: GD_sellerDisplayName(item.seller_profile),
        sellerAvatar: item.seller_profile?.avatar_url ?? null,
        image:
          item.image_url ??
          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80",
      };
    });
  }, [supabase, filteredMarketItems, selectedWilaya]);

  const filteredAi = useMemo(() => {
    if (activeAiFilter === "All") return aiRecommendationsSource;
    return aiRecommendationsSource.filter((item) => item.tag === activeAiFilter);
  }, [activeAiFilter, aiRecommendationsSource]);

  const loadMarketplaceItems = useCallback(async () => {
    if (!supabase) {
      setMarketLoading(false);
      return;
    }
    const requestId = marketLoadRequestRef.current + 1;
    marketLoadRequestRef.current = requestId;

    setMarketLoading(true);
    setMarketError(null);

    try {
      let query = supabase
        .from("marketplace_items")
        .select(
          "id, seller_id, title, description, price_dzd, image_url, stock_quantity, category, plant_type, wilaya, latitude, longitude, created_at, marketplace_profiles:seller_id ( id, username, store_name, avatar_url, location )"
        )
        .order("created_at", { ascending: false });

      const searchQuery = searchValue.trim();
      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (requestId !== marketLoadRequestRef.current) return;

      if (error) {
        setMarketItems([]);
        setMarketError("Unable to load marketplace items.");
        return;
      }

      const normalized =
        ((data ?? []) as any[]).map((row) => ({
          id: row.id,
          seller_id: row.seller_id,
          title: row.title,
          description: row.description ?? null,
          price_dzd: row.price_dzd,
          image_url: row.image_url ?? null,
          stock_quantity: row.stock_quantity,
          category: row.category ?? null,
          plant_type: row.plant_type ?? null,
          wilaya: row.wilaya ?? null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          created_at: row.created_at,
          seller_profile: GD_normalizeSellerProfile(
            row.marketplace_profiles as
              | MarketplaceSellerProfile
              | MarketplaceSellerProfile[]
              | null
              | undefined
          ),
        })) ?? [];

      setMarketItems(normalized as MarketplaceItem[]);
    } catch (error) {
      if (requestId !== marketLoadRequestRef.current) return;
      setMarketItems([]);
      setMarketError("Unable to load marketplace items.");
    } finally {
      if (requestId === marketLoadRequestRef.current) {
        setMarketLoading(false);
      }
    }
  }, [supabase, searchValue]);

  useEffect(() => {
    loadMarketplaceItems();
  }, [loadMarketplaceItems]);

  useEffect(() => {
    let active = true;
    const coords =
      GD_WILAYA_COORDINATES[selectedWilaya] ??
      GD_WILAYA_COORDINATES["All Wilayas"];

    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        setWeatherError(null);
        const params = new URLSearchParams({
          latitude: String(coords.lat),
          longitude: String(coords.lon),
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m",
          daily: "temperature_2m_max,precipitation_sum",
          hourly: "soil_moisture_0_to_1cm",
          forecast_days: String(forecastDays),
          timezone: "auto",
        });
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Weather data unavailable.");
        }
        const data = await response.json();
        if (!active) return;

        const current = data?.current ?? {};
        const dailyTemps: number[] = data?.daily?.temperature_2m_max ?? [];
        const rainfall: number[] = data?.daily?.precipitation_sum ?? [];
        const dailyDates: string[] = data?.daily?.time ?? [];
        const soilSeries: number[] = data?.hourly?.soil_moisture_0_to_1cm ?? [];
        const hourlyTimes: string[] = data?.hourly?.time ?? [];

        let soilMoisture: number | null = null;
        if (soilSeries.length > 0) {
          let index = soilSeries.length - 1;
          if (current?.time && hourlyTimes.length > 0) {
            const matchIndex = hourlyTimes.indexOf(current.time);
            if (matchIndex >= 0) index = matchIndex;
          }
          const soilValue = soilSeries[index];
          if (typeof soilValue === "number") {
            soilMoisture =
              soilValue > 1 ? Math.round(soilValue) : Math.round(soilValue * 100);
          }
        }

        setWeatherData({
          current: {
            temperature: Number(current.temperature_2m ?? 0),
            apparentTemperature: Number(
              current.apparent_temperature ?? current.temperature_2m ?? 0
            ),
            humidity: Number(current.relative_humidity_2m ?? 0),
            wind: Number(current.wind_speed_10m ?? 0),
            soilMoisture,
          },
          temperatureSeries: dailyTemps,
          rainfallSeries: rainfall,
          dailyDates,
          updatedAt: current.time ?? new Date().toISOString(),
        });
      } catch (error) {
        if (!active) return;
        const errorName = (error as Error)?.name ?? "";
        const errorMessage = (error as Error)?.message?.toLowerCase?.() ?? "";
        if (errorName === "AbortError" || errorMessage.includes("aborted")) return;
        setWeatherData(null);
        setWeatherError("Unable to load live weather data.");
      } finally {
        if (active) setWeatherLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(() => {
      fetchWeather();
    }, GD_WEATHER_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedWilaya, forecastDays]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSaveRecommendation = useCallback(
    async (itemId?: string) => {
      if (!supabase) return;
      if (!itemId) {
        setToast("This listing is unavailable.");
        return;
      }
      if (!user) {
        setToast("Please sign in to save items.");
        router.push("/market-place/login");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_saved_items")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("item_id", itemId)
        .maybeSingle();

      if (existingError) {
        const message = existingError.message ?? "";
        if (message.toLowerCase().includes("marketplace_saved_items")) {
          setToast(
            "Saved items table is missing. Run migration 20260206120000_marketplace_buyer_lists.sql in Supabase."
          );
          return;
        }
        if (
          message.toLowerCase().includes("row-level security") ||
          message.toLowerCase().includes("permission")
        ) {
          setToast(
            "Save blocked by database policy. Apply the marketplace buyer lists migration in Supabase."
          );
          return;
        }
        setToast("Unable to save this item.");
        return;
      }

      if (existing?.id) {
        setToast("Already saved in your buyer dashboard.");
        return;
      }

      const { error } = await supabase
        .from("marketplace_saved_items")
        .insert([
          {
            buyer_id: user.id,
            item_id: itemId,
          },
        ]);

      if (error) {
        setToast("Unable to save this item.");
        return;
      }

      setToast("Saved to your buyer dashboard.");
    },
    [supabase, user]
  );

  const handleAddToCart = useCallback(
    async (item: MarketplaceItem) => {
      if (!supabase) return;
      if (!user) {
        setToast("Please sign in to add to cart.");
        router.push("/market-place/login");
        return;
      }
      if (item.stock_quantity <= 0) {
        setToast("This item is out of stock.");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_cart_items")
        .select("id, quantity")
        .eq("buyer_id", user.id)
        .eq("item_id", item.id)
        .maybeSingle();

      if (existingError) {
        const message = existingError.message ?? "";
        if (message.toLowerCase().includes("marketplace_cart_items")) {
          setToast(
            "Cart table is missing. Run migration 20260206120000_marketplace_buyer_lists.sql in Supabase."
          );
          return;
        }
        if (
          message.toLowerCase().includes("row-level security") ||
          message.toLowerCase().includes("permission")
        ) {
          setToast(
            "Cart blocked by database policy. Apply the marketplace buyer lists migration in Supabase."
          );
          return;
        }
        setToast("Unable to update your cart.");
        return;
      }

      const nextQuantity = (existing?.quantity ?? 0) + 1;
      if (nextQuantity > item.stock_quantity) {
        setToast("Not enough stock for that quantity.");
        return;
      }

      const { error } = existing?.id
        ? await supabase
            .from("marketplace_cart_items")
            .update({ quantity: nextQuantity })
            .eq("id", existing.id)
        : await supabase.from("marketplace_cart_items").insert([
            {
              buyer_id: user.id,
              item_id: item.id,
              quantity: nextQuantity,
            },
          ]);

      if (error) {
        setToast("Unable to update your cart.");
        return;
      }

      setToast("Added to cart. View it in your buyer dashboard.");
    },
    [supabase, user]
  );

  const handleViewDetails = useCallback(
    (itemId: string) => {
      router.push(`/market-place/product/${itemId}`);
    },
    [router]
  );

  const handleProfileClick = useCallback(() => {
    if (authLoading) {
      setToast("Loading your account...");
      return;
    }
    if (!user?.id) {
      setToast("Please sign in to view your profile.");
      router.push("/market-place/login");
      return;
    }
    router.push("/market-place/profile");
  }, [authLoading, router, user?.id]);

  const handleLogout = useCallback(async () => {
    if (signOutPending) return;
    setSignOutPending(true);
    try {
      await signOut();
    } catch (error) {
      console.warn("[Marketplace] Logout action failed:", error);
    } finally {
      router.replace("/market-place/login");
      router.refresh();
      setSignOutPending(false);
    }
  }, [signOutPending, signOut, router]);

  const handleSwitchRole = useCallback(
    async (role: "buyer" | "seller") => {
      if (!user) {
        setToast("Sign in to access marketplace features.");
        router.push("/market-place/login");
        return;
      }
      // Only sellers/admins can switch to seller mode
      if (role === "seller" && profile?.role !== "seller" && profile?.role !== "admin") {
        setToast("Apply to become a seller first.");
        router.push("/market-place/seller-onboarding");
        return;
      }
      setMarketMode(role);
      setToast(role === "seller" ? "Seller mode enabled." : "Buyer mode enabled.");
    },
    [user, profile?.role, router]
  );

  const discountPercent = useMemo(
    () => GD_parseCouponDiscount(productForm.coupon),
    [productForm.coupon]
  );

  const basePriceValue = useMemo(() => {
    const value = Number(productForm.price);
    return Number.isFinite(value) ? value : 0;
  }, [productForm.price]);

  const discountedPriceValue = useMemo(() => {
    if (!basePriceValue) return 0;
    return Math.max(0, basePriceValue * (1 - discountPercent / 100));
  }, [basePriceValue, discountPercent]);

  const handleProductImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        setProductImageFile(null);
        setProductImagePreview(null);
        return;
      }
      setProductImageFile(file);
      setProductImagePreview(URL.createObjectURL(file));
    },
    []
  );

  const uploadProductImage = useCallback(async (file?: File | null) => {
    const targetFile = file ?? productImageFile;
    if (!supabase || !user || !targetFile) return null;
    const extension = targetFile.name.split(".").pop() ?? "jpg";
    const filePath = `marketplace/${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, targetFile, {
        contentType: targetFile.type || "image/jpeg",
        upsert: true,
      });
    if (error) {
      setToast("Image upload failed.");
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data?.publicUrl ?? null;
  }, [supabase, user, productImageFile]);

  const resetProductForm = useCallback(() => {
    setProductForm({
      title: "",
      description: "",
      category: "Seeds",
      plantType: "Vegetables",
      color: "",
      size: "",
      price: "",
      coupon: "",
      stock: "10",
      wilaya: "Algiers",
    });
    setProductImageFile(null);
    setProductImagePreview(null);
  }, []);

  const handleCreateProduct = useCallback(async () => {
    if (productSubmitting) return;
    if (!supabase) {
      setToast("Supabase is not configured.");
      return;
    }
    if (!user) {
      setToast("Please sign in to add a product.");
      return;
    }
    if (!isSeller) {
      setToast("Switch to seller mode to list products.");
      return;
    }
    if (profile?.role !== "seller" && profile?.role !== "admin") {
      setToast("You must be an approved seller to list products.");
      return;
    }
    if (!productForm.title.trim() || !productForm.description.trim()) {
      setToast("Please add a title and description.");
      return;
    }
    if (!basePriceValue) {
      setToast("Add a valid price.");
      return;
    }

    setProductSubmitting(true);
    const imageFileSnapshot = productImageFile;
    const watchdog = setTimeout(() => {
      setProductSubmitting(false);
      setToast("Publishing is taking too long. Please retry.");
    }, GD_PUBLISH_WATCHDOG_MS);
    try {
      const stockValue = Number(productForm.stock);
      const coords =
        GD_WILAYA_COORDINATES[productForm.wilaya] ??
        GD_WILAYA_COORDINATES["All Wilayas"];
      const extraDetails: string[] = [];
      if (productForm.color.trim()) {
        extraDetails.push(`Color: ${productForm.color.trim()}`);
      }
      if (productForm.size.trim()) {
        extraDetails.push(`Size: ${productForm.size.trim()}`);
      }
      const fullDescription =
        extraDetails.length > 0
          ? `${productForm.description.trim()}\n\nDetails: ${extraDetails.join(
              " | "
            )}`
          : productForm.description.trim();

      const payload = {
        seller_id: user.id,
        title: productForm.title.trim(),
        description: fullDescription,
        price_dzd: Number(discountedPriceValue.toFixed(2)),
        image_url: null,
        stock_quantity: Number.isFinite(stockValue) ? stockValue : 0,
        category: productForm.category,
        plant_type: productForm.plantType,
        wilaya: productForm.wilaya,
        latitude: coords.lat,
        longitude: coords.lon,
      };

      const result = await GD_withTimeout<{
        data: { id: string } | null;
        error: { message?: string } | null;
      }>(
        (async () => {
          const { data, error } = await supabase
            .from("marketplace_items")
            .insert([payload])
            .select("id")
            .single();
          return {
            data: data ? ({ id: String((data as { id?: string }).id ?? "") }) : null,
            error: error ? { message: error.message } : null,
          };
        })(),
        GD_PUBLISH_TIMEOUT_MS,
        "Publishing timed out. Please retry."
      );

      if (result.error) {
        if (/row level|permission|policy/i.test(result.error.message || "")) {
          setToast("You need to be an approved seller to list products.");
        } else {
          setToast(`Product creation failed: ${result.error.message}`);
        }
        return;
      }

      setToast("Product listed successfully.");
      const insertedId = result.data?.id ?? null;
      resetProductForm();
      setProductModalOpen(false);
      loadMarketplaceItems();

      if (imageFileSnapshot && insertedId) {
        void (async () => {
          try {
            const imageUrl = await GD_withTimeout(
              uploadProductImage(imageFileSnapshot),
              GD_PUBLISH_TIMEOUT_MS,
              "Image upload timed out after publish."
            );
            if (!imageUrl) return;
            await supabase
              .from("marketplace_items")
              .update({ image_url: imageUrl })
              .eq("id", insertedId)
              .eq("seller_id", user.id);
          } catch {
            setToast("Product saved, but image upload is still pending.");
          }
        })();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Publishing failed. Please try again.";
      setToast(message);
    } finally {
      clearTimeout(watchdog);
      setProductSubmitting(false);
    }
  }, [
    productSubmitting,
    supabase,
    user,
    profile?.role,
    isSeller,
    productImageFile,
    productForm,
    basePriceValue,
    discountedPriceValue,
    uploadProductImage,
    resetProductForm,
    loadMarketplaceItems,
  ]);

  const aiCards = showAllAi ? filteredAi : filteredAi.slice(0, 4);

  const featuredSource = useMemo(() => {
    if (!supabase) return [] as any[];
    return filteredMarketItems;
  }, [supabase, filteredMarketItems]);

  const featuredCards = showAllFeatured
    ? featuredSource
    : featuredSource.slice(0, 8);

  const spotlightSections = useMemo(() => {
    const normalize = (value?: string | null) => (value ?? "").toLowerCase();
    const isIn = (value: string | null | undefined, options: string[]) =>
      options.includes(normalize(value));
    const pickItems = (predicate: (item: MarketplaceItem) => boolean) =>
      filteredMarketItems.filter(predicate).slice(0, GD_SPOTLIGHT_LIMIT);

    return [
      {
        id: "marketplace-fruit-veg",
        title: "Fruits & Vegetables",
        subtitle: "Seasonal harvest picks and fresh produce varieties.",
        items: pickItems((item) =>
          isIn(item.plant_type, ["fruits", "vegetables"])
        ),
        empty: "No fruit or vegetable listings yet.",
      },
      {
        id: "marketplace-seeds",
        title: "Seeds & Grains",
        subtitle: "Seed packs and grain varieties ready to plant.",
        items: pickItems((item) => isIn(item.category, ["seeds"])),
        empty: "No seed listings yet.",
      },
      {
        id: "marketplace-plants",
        title: "Plants & Trees",
        subtitle: "Live plants and young trees from local growers.",
        items: pickItems((item) => isIn(item.category, ["plants", "trees"])),
        empty: "No plant listings yet.",
      },
      {
        id: "marketplace-tools",
        title: "Agronomy Tools",
        subtitle: "Equipment, fertilizers, and field-ready essentials.",
        items: pickItems((item) => isIn(item.category, ["tools", "fertilizers"])),
        empty: "No agronomy tools listed yet.",
      },
    ];
  }, [filteredMarketItems]);

  const heroStats = useMemo(() => {
    if (!supabase || filteredMarketItems.length === 0) return GD_HERO_STATS;
    const total = filteredMarketItems.length;
    const inStock = filteredMarketItems.filter((item) => item.stock_quantity > 0).length;
    const wilayas = new Set(
      filteredMarketItems.map((item) => item.wilaya).filter(Boolean)
    ).size;
    const sellers = new Set(filteredMarketItems.map((item) => item.seller_id)).size;
    const match = total ? Math.round((inStock / total) * 100) : 0;
    return [
      { label: "AI Match", value: `${match}%`, icon: Sparkles },
      { label: "Wilayas Covered", value: String(wilayas), icon: MapPin },
      { label: "Verified Sellers", value: String(sellers), icon: BadgeCheck },
    ];
  }, [supabase, filteredMarketItems]);

  const categoryCards = useMemo(() => {
    return GD_CATEGORY_CARDS.map((card) => {
      const count = filteredMarketItems.reduce((total, item) => {
        const haystack = `${item.plant_type ?? ""} ${item.category ?? ""} ${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
        const matches = card.matchers.some((term) => haystack.includes(term));
        return total + (matches ? 1 : 0);
      }, 0);
      return {
        title: card.title,
        description: card.description,
        icon: card.icon,
        count,
      };
    });
  }, [filteredMarketItems]);

  const categoryMaxCount = useMemo(() => {
    return Math.max(1, ...categoryCards.map((card) => card.count));
  }, [categoryCards]);

  const fallbackTemperatureSeries = [35, 48, 42, 55, 46, 60, 50];
  const fallbackRainfallSeries = [28, 40, 55, 32, 62, 48, 70];

  const temperatureSeries =
    weatherData?.temperatureSeries?.length
      ? weatherData.temperatureSeries
      : fallbackTemperatureSeries;
  const rainfallSeries =
    weatherData?.rainfallSeries?.length
      ? weatherData.rainfallSeries
      : fallbackRainfallSeries;

  const temperaturePath = useMemo(() => {
    const values = temperatureSeries.length
      ? temperatureSeries
      : fallbackTemperatureSeries;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 0;
        const normalized = (value - min) / range;
        const y = 90 - normalized * 60;
        return `${x},${y}`;
      })
      .join(" ");
  }, [temperatureSeries]);

  const rainfallBars = useMemo(() => {
    const values = rainfallSeries.length
      ? rainfallSeries
      : fallbackRainfallSeries;
    const max = Math.max(...values, 1);
    return values.map((value) => Math.max(14, Math.round((value / max) * 100)));
  }, [rainfallSeries]);

  const rainfallDayLabels = useMemo(() => {
    const dates = weatherData?.dailyDates ?? [];
    const fallbackBase = new Date();
    const targetLength = rainfallSeries.length || fallbackRainfallSeries.length;
    return Array.from({ length: targetLength }).map((_, index) => {
      const rawDate = dates[index];
      const date = rawDate ? new Date(rawDate) : new Date(fallbackBase);
      if (!rawDate) {
        date.setDate(fallbackBase.getDate() + index);
      }
      if (Number.isNaN(date.getTime())) return `Day ${index + 1}`;
      return date.toLocaleDateString([], { weekday: "short" });
    });
  }, [weatherData?.dailyDates, rainfallSeries.length]);

  const weatherStats = useMemo(() => {
    if (!weatherData) return GD_WEATHER_FALLBACK;
    const humidity = Math.round(weatherData.current.humidity);
    const wind = Math.round(weatherData.current.wind);
    const soilMoisture =
      typeof weatherData.current.soilMoisture === "number"
        ? Math.round(weatherData.current.soilMoisture)
        : null;
    const humidityDetail =
      humidity >= 70
        ? "High moisture"
        : humidity >= 45
        ? "Optimal for seedlings"
        : "Dry air";
    const windDetail =
      wind >= 20 ? "Windy conditions" : wind >= 10 ? "Moderate breeze" : "Low stress";
    const soilDetail =
      soilMoisture === null
        ? "Sensor unavailable"
        : soilMoisture >= 60
        ? "Moist soil"
        : "Irrigation suggested";
    return [
      {
        label: "Temperature",
        value: `${Math.round(weatherData.current.temperature)}°C`,
        detail: `Feels like ${Math.round(
          weatherData.current.apparentTemperature
        )}°C`,
        icon: Thermometer,
      },
      {
        label: "Humidity",
        value: `${humidity}%`,
        detail: humidityDetail,
        icon: Droplets,
      },
      {
        label: "Wind",
        value: `${wind} km/h`,
        detail: windDetail,
        icon: Wind,
      },
      {
        label: "Soil Moisture",
        value: soilMoisture === null ? "--" : `${soilMoisture}%`,
        detail: soilDetail,
        icon: CloudSun,
      },
    ];
  }, [weatherData]);

  const weatherUpdatedLabel = useMemo(() => {
    if (!weatherData?.updatedAt) return null;
    const date = new Date(weatherData.updatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [weatherData?.updatedAt]);
  const donutGradient =
    "conic-gradient(#2dd4bf 0deg 140deg, #22c55e 140deg 220deg, #facc15 220deg 290deg, #38bdf8 290deg 360deg)";
  const heroMatch = heroStats.find((stat) => stat.label === "AI Match")?.value ?? "89%";
  const heroCoverage =
    heroStats.find((stat) => stat.label === "Wilayas Covered")?.value ??
    String(GD_WILAYAS.length - 1);
  const heroSellers =
    heroStats.find((stat) => stat.label === "Verified Sellers")?.value ?? "250+";
  const heroLocation = GD_formatWilayaLabel(selectedWilaya);

  return (
    <div className="gd-marketplace-page gd-mp-shell gd-mp-has-bottom-nav relative min-h-screen bg-[#f7f8fa] text-gray-900">
      {/* ── Top accent bar ── */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />

      {/* ── Sticky Header / Navbar ── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="gd-mp-container mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
          {/* Brand */}
          <Link href="/market-place" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              GD
            </div>
            <span className="hidden text-lg font-bold text-gray-900 sm:block">
              GreenDuty
            </span>
          </Link>

          {/* Search bar */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchValue.trim();
              if (query) {
                router.push(`/market-place/search?q=${encodeURIComponent(query)}`);
                return;
              }
              loadMarketplaceItems();
            }}
            className="relative mx-4 hidden flex-1 md:flex"
          >
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search for any product, seed, or seller..."
              className="h-10 w-full rounded-full border border-gray-300 bg-gray-50 pl-11 pr-28 text-sm text-gray-800 placeholder:text-gray-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 rounded-full bg-emerald-600 px-5 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Search
            </button>
          </form>

          {/* Location (wilaya) pill */}
          <div className="hidden items-center gap-1.5 text-xs text-gray-500 lg:flex">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>{GD_formatWilayaLabel(selectedWilaya)}</span>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Mode pills — seller pill only visible to approved sellers/admins */}
            {canSwitchModes && (
              <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchRole("buyer")}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 ${
                    !isSeller
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Switch to buyer mode"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Buyer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole("seller")}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 ${
                    isSeller
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Switch to seller mode"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Seller</span>
                </button>
              </div>
            )}

            {isSeller ? (
              <Link
                href="/market-place/vendor"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-full lg:px-3 lg:py-1.5 lg:text-xs lg:font-semibold"
                title="Vendor Studio"
              >
                <ShoppingBag className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                <span className="hidden lg:inline">Vendor Studio</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/market-place/buyer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-full lg:px-3 lg:py-1.5 lg:text-xs lg:font-semibold"
                  title="Buyer Dashboard"
                >
                  <Gauge className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                  <span className="hidden lg:inline">Dashboard</span>
                </Link>
                <Link
                  href="/market-place/orders"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-full lg:px-3 lg:py-1.5 lg:text-xs lg:font-semibold"
                  title="My Orders"
                >
                  <CalendarCheck className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                  <span className="hidden lg:inline">Orders</span>
                </Link>
              </>
            )}

            {profile?.role === "admin" && (
              <Link
                href="/market-place/admin"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-full lg:px-3 lg:py-1.5 lg:text-xs lg:font-semibold"
                title="Admin Dashboard"
              >
                <Shield className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                <span className="hidden lg:inline">Admin</span>
              </Link>
            )}

            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleProfileClick}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              <User className="h-4 w-4" />
            </button>
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={signOutPending}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                title={signOutPending ? "Signing out..." : "Log out"}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category navbar */}
        <div className="border-t border-gray-100 bg-white">
          <div className="gd-mp-container mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 text-[13px] lg:px-8">
            {GD_NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition ${
                  item === "AI"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                {item}
              </button>
            ))}
            <div className="mx-2 h-4 w-px bg-gray-200" />
            {GD_FEATURED_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFeaturedFilter(filter)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition ${
                  activeFeaturedFilter === filter
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="gd-mp-container mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-32 pt-6 lg:px-8">
        {/* ═══════ HERO BANNER ═══════ */}
        <section id="marketplace-home" className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-emerald-200/70 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6 shadow-[0_18px_45px_rgba(16,185,129,0.35)] sm:p-8 lg:min-h-[360px] lg:p-10">
            <div className="pointer-events-none absolute -left-12 top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-teal-200/25 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Agronomique AI Store
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {heroLocation}
                </span>
              </div>

              <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.95rem]">
                Grow Healthier Crops With A Marketplace Built For Real Fields
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-[15px]">
                Handpicked seeds, farming tools, and trusted local sellers in one agronomic storefront. Every listing is tuned with live climate context and practical field needs.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection("featured-marketplace")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 shadow-[0_8px_22px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Shop Best Deals
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("ai-recommendations")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-white/12 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white/70 hover:bg-white/20"
                >
                  Ask Agronomy AI
                  <Bot className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {heroStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/25 bg-black/10 px-3 py-2 text-white backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
                        <Icon className="h-3.5 w-3.5 text-white/90" />
                        {stat.label}
                      </div>
                      <div className="mt-1 text-lg font-black leading-none">{stat.value}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-white/85">
                <div className="flex -space-x-2">
                  {GD_SELLERS.slice(0, 3).map((seller) => (
                    <img
                      key={seller.name}
                      src={seller.avatar}
                      alt={seller.name}
                      className="h-8 w-8 rounded-full border-2 border-white/75 object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
                <p className="text-xs font-medium">
                  Trusted by growers across Algeria for practical, farm-ready sourcing.
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-amber-200 bg-gradient-to-br from-[#fff4d8] via-[#ffe8be] to-[#ffd8a3] p-6 shadow-[0_14px_40px_rgba(180,83,9,0.18)] sm:p-7">
            <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-amber-300/35 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-200/50 blur-2xl" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-white/65 px-3 py-1 text-[11px] font-semibold text-[#7c3f0b]">
                  <Leaf className="h-3.5 w-3.5" />
                  Today&apos;s Field Pulse
                </span>
                <h2 className="mt-4 text-2xl font-black leading-tight text-[#2e1d09] sm:text-[2rem]">
                  Marketplace Confidence Index
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6d3f14]">
                  Live listing quality, seller activity, and location coverage in one quick snapshot.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200/80 bg-white/70 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a4b15]">
                      AI Match Today
                    </p>
                    <p className="mt-1 text-4xl font-black leading-none text-[#1f2a10]">
                      {heroMatch}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7a4320]">
                    {heroLocation}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(0, Number.parseInt(heroMatch, 10) || 0))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-amber-200/70 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a4b15]">
                    Coverage
                  </p>
                  <p className="mt-1 text-xl font-black text-[#1f2a10]">{heroCoverage}</p>
                  <p className="text-[11px] text-[#74421b]">Wilayas</p>
                </div>
                <div className="rounded-xl border border-amber-200/70 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a4b15]">
                    Active Sellers
                  </p>
                  <p className="mt-1 text-xl font-black text-[#1f2a10]">{heroSellers}</p>
                  <p className="text-[11px] text-[#74421b]">Verified</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => scrollToSection("featured-marketplace")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8a35c] bg-[#fff1d3] px-4 py-2 text-sm font-bold text-[#6b3d12] transition hover:bg-[#ffe7be]"
              >
                Explore Today&apos;s Deals
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ═══════ FILTER BAR ═══════ */}
        <section className="relative overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/35 to-sky-50/45 p-3.5 shadow-[0_14px_36px_rgba(16,185,129,0.14)] sm:p-4">
          <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-emerald-200/35 blur-2xl" />
          <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-sky-200/35 blur-2xl" />

          <div className="relative z-10 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/70">
                  Smart Filters
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-gray-900 sm:text-[15px]">
                  Tune listings for your farm context
                </h3>
              </div>
              <div className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[170px] truncate sm:max-w-none">{heroLocation}</span>
              </div>
            </div>

            <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
              {/* Wilaya select */}
              <Select.Root
                value={selectedWilaya}
                onValueChange={setSelectedWilaya}
                onOpenChange={(open) => {
                  if (open) setWilayaQuery("");
                }}
              >
                <Select.Trigger className="flex h-11 w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white/90 px-3 text-[13px] font-medium text-gray-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <Select.Value placeholder="All Wilayas" />
                  <Select.Icon className="ml-auto text-gray-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={8}
                    className="z-50 min-w-[220px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-xl"
                  >
                    <div className="px-2 pb-2 pt-1">
                      <input
                        value={wilayaQuery}
                        onChange={(event) => setWilayaQuery(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        placeholder="Search wilaya..."
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <Select.Viewport className="max-h-52 overflow-y-auto p-1">
                      {filteredWilayas.map((option) => (
                        <Select.Item
                          key={option}
                          value={option}
                          className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-gray-600 outline-none transition-colors data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-700"
                        >
                          <Select.ItemText>{option}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                      {wilayaQuery.trim().length > 0 && filteredWilayas.length <= 1 && (
                        <div className="px-3 py-2 text-xs text-gray-400">No matches found.</div>
                      )}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* Category select */}
              <Select.Root
                value={selectedListingCategory}
                onValueChange={setSelectedListingCategory}
              >
                <Select.Trigger className="flex h-11 w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white/90 px-3 text-[13px] font-medium text-gray-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                  <Select.Value placeholder="All Categories" />
                  <Select.Icon className="ml-auto text-gray-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={8}
                    className="z-50 min-w-[220px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-xl"
                  >
                    <Select.Viewport className="max-h-52 overflow-y-auto p-1">
                      {GD_LISTING_CATEGORIES.map((option) => (
                        <Select.Item
                          key={option}
                          value={option}
                          className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-gray-600 outline-none transition-colors data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-700"
                        >
                          <Select.ItemText>{option}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* Price range */}
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2 shadow-[0_6px_16px_rgba(15,23,42,0.06)] md:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  <span>Price Range</span>
                  <span>DZD</span>
                </div>

                <div className="mt-2 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                  <div className="flex items-center justify-between gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase text-gray-400">Min</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMinPrice((prev) => String(Math.max(0, Number(prev) - 100)))}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-500 transition hover:bg-gray-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value)}
                        className="w-16 bg-transparent text-center text-[11px] font-semibold text-gray-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMinPrice((prev) => String(Number(prev) + 100))}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-500 transition hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="hidden text-center text-[11px] text-gray-300 sm:block">to</span>

                  <div className="flex items-center justify-between gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase text-gray-400">Max</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMaxPrice((prev) => String(Math.max(0, Number(prev) - 100)))}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-500 transition hover:bg-gray-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        className="w-16 bg-transparent text-center text-[11px] font-semibold text-gray-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMaxPrice((prev) => String(Number(prev) + 100))}
                        className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-gray-500 transition hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white/75 px-2.5 py-1 font-semibold text-emerald-700">
                <Sparkles className="h-3 w-3" />
                {filteredMarketItems.length} live listings
              </span>
              {marketLoading && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Updating...
                </span>
              )}
              {marketError && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  {marketError}
                </span>
              )}
            </div>
          </div>
        </section>
        <section id="ai-recommendations" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Recommendations For You</h2>
              <p className="mt-1 text-sm text-gray-500">Curated seed matches tailored to your climate</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {GD_AI_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveAiFilter(filter)}
                  className={`rounded-full border px-3 py-1.5 font-medium transition ${
                    activeAiFilter === filter
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:text-emerald-600"
                  }`}
                >
                  {filter}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllAi((prev) => !prev)}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                {showAllAi ? "Show less" : "View All"}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {aiCards.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No AI recommendations yet. Publish products to see them appear here.
              </div>
            ) : (
              aiCards.map((item) => (
                <article
                  key={item.id ?? item.name}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row">
                    <div className="relative h-24 w-full overflow-hidden rounded-xl sm:h-28 sm:w-36">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.match}% Match
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                        {item.sellerId && (
                          <button
                            type="button"
                            onClick={() => router.push(`/market-place/profile/${item.sellerId}`)}
                            className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-white">
                              {item.sellerAvatar ? (
                                <img
                                  src={item.sellerAvatar}
                                  alt={item.sellerName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                            </span>
                            {item.sellerName}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-emerald-700">{item.price}</span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                        {!isSeller && (
                          <button
                            type="button"
                            onClick={() => handleSaveRecommendation(item.id)}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        {/* ═══════ FEATURED MARKETPLACE ═══════ */}
        <section id="featured-marketplace" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Today&apos;s Best Deals For You!</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {isSeller && (
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Publish
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAllFeatured((prev) => !prev)}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                {showAllFeatured ? "Show less" : "View All"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {marketLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`market-skeleton-${index}`} className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
              ))}
            </div>
          ) : featuredCards.length === 0 && supabase ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              No marketplace listings yet. Sellers can add items in Vendor Studio.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {featuredCards.map((item: any) => {
                const isLive = "price_dzd" in item;
                const title = isLive ? item.title : item.name;
                const category = isLive ? item.plant_type ?? item.category ?? "Seeds" : item.category;
                const price = isLive ? `${Number(item.price_dzd).toLocaleString()} DZD` : item.price;
                const location = isLive ? GD_formatWilayaLabel(item.wilaya) : item.location;
                const stockLabel = isLive ? (item.stock_quantity > 0 ? "In Stock" : "Out of Stock") : item.stock;
                const sellerProfile = (item as MarketplaceItem).seller_profile;
                const sellerName = GD_sellerDisplayName(sellerProfile);

                return (
                  <article
                    key={isLive ? item.id : `${item.name}-${item.location}`}
                    role={isLive ? "button" : undefined}
                    tabIndex={isLive ? 0 : undefined}
                    onClick={() => isLive && handleViewDetails(item.id)}
                    onKeyDown={(event) => {
                      if (!isLive) return;
                      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleViewDetails(item.id); }
                    }}
                    className={`group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition ${
                      isLive ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : ""
                    }`}
                    aria-label={isLive ? `View ${title}` : undefined}
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gray-50 p-4">
                      <img
                        src={item.image_url ?? item.image ?? "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"}
                        alt={title}
                        className="h-full max-h-32 w-auto object-contain transition group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        stockLabel === "In Stock" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                      }`}>
                        {stockLabel}
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      <span className="text-[10px] font-medium uppercase text-gray-400">{category}</span>
                      <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{title}</h3>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={`${title}-star-${i}`} className={`h-3 w-3 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                        <span className="ml-1 text-[10px] text-gray-400">({Math.floor(Math.random() * 200 + 20)})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{price}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <MapPin className="h-2.5 w-2.5" />{location}
                        </span>
                      </div>
                      {isLive && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-2 py-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/market-place/profile/${item.seller_id}`);
                            }}
                            className="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold text-emerald-700 transition hover:text-emerald-800"
                          >
                            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-white text-[10px] uppercase">
                              {sellerProfile?.avatar_url ? (
                                <img
                                  src={sellerProfile.avatar_url}
                                  alt={sellerName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                GD_sellerInitials(sellerProfile)
                              )}
                            </span>
                            <span className="truncate">{sellerName}</span>
                          </button>
                          <span className="text-[10px] text-emerald-700/70">View store</span>
                        </div>
                      )}
                      {isSeller ? (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); if (isLive) handleViewDetails(item.id); }}
                          className="w-full rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          View listing
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); if (isLive) handleAddToCart(item as MarketplaceItem); }}
                          disabled={!isLive || item.stock_quantity <= 0}
                          className="w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════ SPOTLIGHT SECTIONS ═══════ */}
        {spotlightSections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{section.subtitle}</p>
              </div>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
                {section.items.length} items
              </span>
            </div>

            {section.items.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                {section.empty}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => {
                  const price = typeof item.price_dzd === "number" ? `${item.price_dzd.toLocaleString()} DZD` : "Price on request";
                  const tag = item.plant_type ?? item.category ?? "Seeds";
                  const stockLabel = item.stock_quantity > 0 ? "In Stock" : "Out of Stock";
                  const sellerName = GD_sellerDisplayName(item.seller_profile);
                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewDetails(item.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleViewDetails(item.id); } }}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      aria-label={`View ${item.title}`}
                    >
                      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gray-50 p-4">
                        <img
                          src={item.image_url ?? "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"}
                          alt={item.title ?? "Marketplace item"}
                          className="h-full max-h-32 w-auto object-contain transition group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          stockLabel === "In Stock" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        }`}>{stockLabel}</span>
                      </div>
                      <div className="space-y-2 p-4">
                        <span className="text-[10px] font-medium uppercase text-gray-400">{tag}</span>
                        <h3 className="text-sm font-bold text-gray-900">{item.title ?? "Marketplace Item"}</h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-700">{price}</span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {GD_formatWilayaLabel(item.wilaya)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/market-place/profile/${item.seller_id}`);
                          }}
                          className="inline-flex min-w-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-white text-[10px] uppercase">
                            {item.seller_profile?.avatar_url ? (
                              <img
                                src={item.seller_profile.avatar_url}
                                alt={sellerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              GD_sellerInitials(item.seller_profile)
                            )}
                          </span>
                          <span className="truncate">{sellerName}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); handleViewDetails(item.id); }}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                          View details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* ═══════ PROMOTIONAL BANNER ═══════ */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 shadow-lg">
          <div className="relative flex flex-col items-center gap-6 px-6 py-8 md:flex-row md:px-10 md:py-6">
            {/* Decorative arch shape */}
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[280px] -translate-x-1/2 md:block">
              <svg viewBox="0 0 280 200" fill="none" className="h-full w-full opacity-10" preserveAspectRatio="none">
                <path d="M140 0C62.7 0 0 62.7 0 140v60h280v-60C280 62.7 217.3 0 140 0z" fill="white"/>
              </svg>
            </div>

            {/* Left: product collage image */}
            <div className="relative z-10 flex-shrink-0 md:w-[40%]">
              <div className="relative mx-auto w-full max-w-[300px]">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
                  alt="Fresh seasonal produce"
                  className="h-44 w-full rounded-xl object-cover shadow-md md:h-48"
                  loading="lazy"
                />
                <div className="absolute -bottom-3 -right-3 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-lg">
                  Fresh & Local
                </div>
              </div>
            </div>

            {/* Right: text content */}
            <div className="relative z-10 flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-white md:text-2xl lg:text-3xl">
                Seasonal Offers
              </h2>
              <h3 className="mt-1 text-lg font-bold text-white/90 md:text-xl">
                Limited Time Deals
              </h3>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                Up to <span className="text-xl font-extrabold text-yellow-300">50%</span> off
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => scrollToSection("featured-marketplace")}
                  className="rounded-full border-2 border-white bg-white px-6 py-2.5 text-sm font-bold text-emerald-700 shadow-md transition hover:bg-emerald-50"
                >
                  Shop Now
                </button>
              </div>
              <p className="mt-3 text-[11px] text-white/70">
                No minimum order required. Explore fresh produce and farm essentials at unbeatable prices.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════ SELLER SHOWCASE ═══════ */}
        <section id="seller-showcase" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Latest From Sellers</h2>
            {isSeller && (
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Post
              </button>
            )}
          </div>

          {filteredMarketItems.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              No products shared yet. Seller posts will appear here.
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 pb-2">
              <div className="flex min-w-full gap-4">
                {filteredMarketItems.map((item) => {
                  const title = item.title ?? "Marketplace Item";
                  const price = typeof item.price_dzd === "number" ? `${item.price_dzd.toLocaleString()} DZD` : "Price on request";
                  const sellerName = GD_sellerDisplayName(item.seller_profile);
                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewDetails(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleViewDetails(item.id);
                        }
                      }}
                      className="group flex min-w-[220px] flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-bold text-gray-900">{title}</div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          {item.plant_type ?? item.category ?? "Seed"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {item.description?.trim() || "Fresh listing from a verified seller."}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">{price}</span>
                        <span className="text-gray-400">{GD_formatWilayaLabel(item.wilaya)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/market-place/profile/${item.seller_id}`);
                          }}
                          className="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold text-emerald-700 transition hover:text-emerald-800"
                        >
                          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50 text-[10px] uppercase">
                            {item.seller_profile?.avatar_url ? (
                              <img
                                src={item.seller_profile.avatar_url}
                                alt={sellerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              GD_sellerInitials(item.seller_profile)
                            )}
                          </span>
                          <span className="truncate">{sellerName}</span>
                        </button>
                        <span className="text-[10px] text-gray-400">Seller profile</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        {/* ═══════ EXPLORE CATEGORIES (circular icons) ═══════ */}
        <section id="marketplace-categories" className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Explore Popular Categories</h2>
            <button
              type="button"
              onClick={() => scrollToSection("featured-marketplace")}
              className="flex items-center gap-1 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {categoryCards.map((card) => {
              const Icon = card.icon;
              const isActive = selectedCategory === card.title;
              const popularity = card.count / categoryMaxCount;
              const hasItems = card.count > 0;
              const countLabel = `${card.count} ${card.count === 1 ? "item" : "items"}`;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => setSelectedCategory(card.title)}
                  className="group flex shrink-0 flex-col items-center gap-2"
                  title={`${card.title}: ${countLabel}`}
                >
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-200 group-hover:border-emerald-500 group-hover:bg-emerald-50 group-hover:shadow-md ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : hasItems
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-gray-200 bg-gray-50"
                  }`}>
                    <Icon
                      className={`h-8 w-8 transition ${
                        isActive
                          ? "text-emerald-600"
                          : hasItems
                          ? "text-emerald-500 group-hover:text-emerald-600"
                          : "text-gray-500 group-hover:text-emerald-600"
                      }`}
                      style={{ opacity: hasItems ? 0.65 + popularity * 0.35 : 0.55 }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-emerald-700" : "text-gray-600"}`}>
                    {card.title}
                  </span>
                  <span className={`text-[10px] ${hasItems ? "text-emerald-600" : "text-gray-400"}`}>
                    {countLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        {/* ═══════ WEATHER DASHBOARD ═══════ */}
        <section id="weather-dashboard" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Weather AI Dashboard</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {GD_formatWilayaLabel(selectedWilaya)}
                </span>
                {weatherLoading && <span className="text-emerald-600">Updating...</span>}
                {!weatherLoading && weatherError && <span className="text-amber-600">{weatherError}</span>}
                {!weatherLoading && !weatherError && weatherUpdatedLabel && (
                  <span>Updated {weatherUpdatedLabel}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForecastDays((prev) => (prev === 7 ? 14 : 7))}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {forecastDays} day forecast
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {weatherStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-gray-400">{stat.label}</span>
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-[11px] text-gray-500">{stat.detail}</div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-gray-400">Temperature Trends</div>
                  <div className="text-sm font-bold text-gray-900">Last 7 Days</div>
                </div>
                <LineChart className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-4 h-32 w-full">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <polyline
                    fill="none"
                    stroke="var(--gd-mp-chart-line, #10b981)"
                    strokeWidth="3"
                    points={temperaturePath}
                  />
                  <polyline
                    fill="none"
                    stroke="var(--gd-mp-chart-baseline, #e5e7eb)"
                    strokeWidth="1"
                    points="0,100 100,100"
                  />
                </svg>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-gray-400">Rainfall Forecast</div>
                  <div className="text-sm font-bold text-gray-900">Next 7 Days</div>
                </div>
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-4 flex h-32 items-end gap-2">
                {rainfallBars.map((value, index) => (
                  <div key={`rain-${value}-${index}`} className="flex-1 rounded-t-md bg-emerald-500" style={{ height: `${value}%` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                {rainfallDayLabels.map((label, index) => (
                  <span key={`rain-day-${label}-${index}`} className="flex-1 text-center">{label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <GDMarketplaceFeaturesSection />
        {isSeller && (
          <section id="marketplace-analytics" className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">
                Marketplace Analytics
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Track performance across your supply chain
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Popular Seeds by Category
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Weekly Trend</div>
                  </div>
                  <PieChart className="h-5 w-5 text-green-500" />
                </div>
                <div className="mt-4 flex h-36 items-end gap-2">
                  {[65, 42, 35, 58, 28, 75].map((value, index) => (
                    <div
                      key={`cat-${value}-${index}`}
                      className="flex-1 rounded-full bg-green-400"
                      style={{ height: `${value}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Supply Mix by Type
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Current Inventory</div>
                  </div>
                  <Gauge className="h-5 w-5 text-green-500" />
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <div
                    className="relative h-36 w-36 rounded-full"
                    style={{ background: donutGradient }}
                  >
                    <div className="absolute inset-4 rounded-full bg-white" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    Vegetables
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Fruits
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    Grains
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Herbs
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {GD_ANALYTICS_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                      <Icon className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-green-600">
                      {stat.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section id="marketplace-sellers" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Top Verified Sellers
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Trusted partners across Algeria
              </p>
            </div>
            {isSeller ? (
              <Link
                href="/market-place/vendor"
                className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-700"
              >
                Manage listings
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                href="/market-place/seller-onboarding"
                className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-green-400 hover:text-green-700"
              >
                Become a seller
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {GD_SELLERS.map((seller) => (
              <article
                key={seller.name}
                className="group relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/35 to-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-200/35 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={seller.avatar}
                      alt={seller.name}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-100"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{seller.name}</div>
                      <div className="truncate text-[11px] text-gray-500">{seller.role}</div>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">Rating</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {seller.rating}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">Sales</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{seller.deals}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="marketplace-knowledge" className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">
              Agricultural Knowledge Hub
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Learn from experts and grow smarter
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {GD_KNOWLEDGE.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/45 via-transparent to-transparent" />
                </div>
                <div className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600">
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock3 className="h-3 w-3 text-emerald-600" />
                      {item.readTime}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.description}</p>
                  <button
                    type="button"
                    onClick={() => setActiveKnowledgeArticle(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700"
                  >
                    Read article
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {activeKnowledgeArticle && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-6">
            <button
              type="button"
              aria-label="Close article"
              className="absolute inset-0"
              onClick={() => setActiveKnowledgeArticle(null)}
            />

            <div className="relative flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-emerald-100 bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
              <div className="relative h-52 sm:h-60">
                <img
                  src={activeKnowledgeArticle.image}
                  alt={activeKnowledgeArticle.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/25 to-transparent" />

                <div className="absolute left-4 right-16 top-4 flex flex-wrap items-center gap-2 sm:left-6 sm:right-20">
                  <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    {activeKnowledgeArticle.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <Clock3 className="h-3.5 w-3.5" />
                    {activeKnowledgeArticle.readTime}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6">
                  <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl">
                    {activeKnowledgeArticle.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-white/85">
                    {activeKnowledgeArticle.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveKnowledgeArticle(null)}
                  className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 sm:right-6"
                  aria-label="Close article"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4">
                  <p className="text-sm leading-relaxed text-emerald-900">
                    {activeKnowledgeArticle.intro}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Action Checklist
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {activeKnowledgeArticle.keyActions.map((action) => (
                      <p
                        key={action}
                        className="inline-flex items-start gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-gray-700"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {action}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {activeKnowledgeArticle.sections.map((section) => (
                    <article
                      key={section.heading}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <h4 className="text-sm font-semibold text-gray-900">{section.heading}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {section.body}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <section id="marketplace-testimonials" className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">What Our Farmers Say</h2>
            <p className="mt-1 text-sm text-gray-500">Community voices</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {GD_TESTIMONIALS.map((item) => (
              <div key={item.name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`${item.name}-star-${index}`} className="h-3.5 w-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-600 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-4 text-sm font-semibold text-gray-900">
                  {item.name}
                </div>
                <div className="text-[11px] text-gray-400">{item.role}</div>
              </div>
            ))}
          </div>
        </section>
        <section
          id="marketplace-cta"
          className="overflow-hidden rounded-2xl shadow-lg"
        >
          <div
            className="relative"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 via-green-800/85 to-green-900/90" />
            <div className="relative z-10 space-y-4 px-6 py-10 md:px-10">
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Start Your Farming Journey Today
              </h2>
              <p className="text-sm text-white/80">
                Join thousands of farmers using GreenDuty to grow smarter. Submit your requirements, get AI recommendations, and order seeds from trusted sellers.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-green-700 shadow-md transition hover:bg-green-50"
                >
                  Get Started
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Watch Demo
                  <Play className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-white/80">
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <Check className="h-3.5 w-3.5 text-green-300" />
                  98.5% AI Match Accuracy
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <Users className="h-3.5 w-3.5 text-green-300" />
                  24/7 Expert Support
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <CalendarCheck className="h-3.5 w-3.5 text-green-300" />
                  Seasonal Planting Plans
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer
          id="marketplace-footer"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                <Sprout className="h-4 w-4" />
                GreenDuty
              </div>
              <p className="text-sm text-gray-500">
                Empowering Algerian farmers with AI, trusted sellers, and data-driven
                insights that boost yields and sustainability.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  AI seed matching
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  Verified sellers
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  Regional insights
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MessageCircle className="h-4 w-4 text-green-500" />
                support@greenduty.org
              </div>
            </div>

            {GD_FOOTER_LINKS.map((section) => (
              <div key={section.title} className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  {section.links.map((link) => (
                    <button
                      key={link}
                      type="button"
                      className="block text-left transition hover:text-green-600"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-400">
            <span>GreenDuty 2026. All rights reserved.</span>
            <span>Built for smarter agriculture in Algeria.</span>
          </div>
        </footer>
      </div>

      {toast && (
        <div
          className="fixed z-40 rounded-full border border-green-200 bg-white px-4 py-2 text-xs font-medium text-green-700 shadow-lg"
          style={{
            right: "max(env(safe-area-inset-right), 24px)",
            bottom: "calc(env(safe-area-inset-bottom) + 78px)",
          }}
        >
          {toast}
        </div>
      )}

      {!isSeller && (
        <Link
          href="/market-place/seller-onboarding"
          className="fixed z-40 flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700"
          style={{
            right: "max(env(safe-area-inset-right), 24px)",
            bottom: "calc(env(safe-area-inset-bottom) + 12px)",
          }}
          aria-label="Become a seller"
        >
          <ShoppingBag className="h-4 w-4" />
        </Link>
      )}

      {productModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-green-600">
                  Seller Studio
                </div>
                <div className="text-xl font-bold text-gray-900">Share a Product</div>
                <div className="text-xs text-gray-500">
                  Publish your listing to the marketplace in seconds.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-green-600">
                      Live Preview
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {productImagePreview ? (
                        <img
                          src={productImagePreview}
                          alt="Preview"
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-xs text-gray-400">
                          Product image preview
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase text-green-700">
                          {productForm.category || "Category"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase text-gray-500">
                          {productForm.plantType || "Type"}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {productForm.title || "Product title"}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-3">
                        {productForm.description ||
                          "A short product description will appear here."}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Price
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {discountedPriceValue
                            ? `${discountedPriceValue.toLocaleString()} DZD`
                            : "--"}
                        </div>
                      </div>
                      {discountPercent > 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      {productForm.color.trim() && (
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                          Color: {productForm.color.trim()}
                        </span>
                      )}
                      {productForm.size.trim() && (
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                          Size: {productForm.size.trim()}
                        </span>
                      )}
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                        Stock: {productForm.stock || "0"}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                    Listings appear instantly in Featured Marketplace and Seller
                    Showcase after publishing.
                  </div>
                </div>

                <div className="space-y-5">
                  {!isSeller && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      {profile?.role === "seller" || profile?.role === "admin"
                        ? "Switch to seller mode to publish products."
                        : "You need to be an approved seller to publish products."}
                      {profile?.role === "seller" || profile?.role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleSwitchRole("seller")}
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-300"
                        >
                          Enable Seller Mode
                        </button>
                      ) : (
                        <Link
                          href="/market-place/seller-onboarding"
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-300"
                        >
                          Apply to Become a Seller
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Product Name *
                    </label>
                    <input
                      value={productForm.title}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Organic Tomato Seeds"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Description *
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Describe the product, growing conditions, and quality."
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Category *
                      </label>
                      <Select.Root
                        value={productForm.category}
                        onValueChange={(value) =>
                          setProductForm((prev) => ({
                            ...prev,
                            category: value,
                          }))
                        }
                      >
                        <Select.Trigger className="flex h-11 w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-700 transition hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100">
                          <Sprout className="h-4 w-4 text-gray-400" />
                          <Select.Value placeholder="Category" />
                          <Select.Icon className="ml-auto text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={8}
                            className="z-50 min-w-[200px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-lg"
                          >
                            <Select.Viewport className="max-h-52 overflow-y-auto p-1">
                              {GD_PRODUCT_CATEGORIES.map((category) => (
                                <Select.Item
                                  key={category}
                                  value={category}
                                  className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-600 outline-none data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700 data-[state=checked]:bg-green-50"
                                >
                                  <Select.ItemText>{category}</Select.ItemText>
                                  <Select.ItemIndicator>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Type *
                      </label>
                      <Select.Root
                        value={productForm.plantType}
                        onValueChange={(value) =>
                          setProductForm((prev) => ({
                            ...prev,
                            plantType: value,
                          }))
                        }
                      >
                        <Select.Trigger className="flex h-11 w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-700 transition hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100">
                          <Leaf className="h-4 w-4 text-gray-400" />
                          <Select.Value placeholder="Type" />
                          <Select.Icon className="ml-auto text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={8}
                            className="z-50 min-w-[200px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-lg"
                          >
                            <Select.Viewport className="max-h-52 overflow-y-auto p-1">
                              {GD_PRODUCT_TYPES.map((item) => (
                                <Select.Item
                                  key={item}
                                  value={item}
                                  className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-600 outline-none data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700 data-[state=checked]:bg-green-50"
                                >
                                  <Select.ItemText>{item}</Select.ItemText>
                                  <Select.ItemIndicator>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Color
                      </label>
                      <input
                        value={productForm.color}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Size
                      </label>
                      <input
                        value={productForm.size}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            size: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Price (DZD) *
                      </label>
                      <input
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            price: event.target.value,
                          }))
                        }
                        type="number"
                        placeholder="2500"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Coupon Code
                      </label>
                      <input
                        value={productForm.coupon}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            coupon: event.target.value,
                          }))
                        }
                        placeholder="GREEN10"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Final price after discount</span>
                      <span className="font-bold text-green-600">
                        {discountedPriceValue
                          ? `${discountedPriceValue.toLocaleString()} DZD`
                          : "--"}
                      </span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-green-600">
                        Coupon applied: -{discountPercent}%
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Stock Quantity
                      </label>
                      <input
                        value={productForm.stock}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            stock: event.target.value,
                          }))
                        }
                        type="number"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">
                        Delivery Coverage
                      </label>
                      <Select.Root
                        value={productForm.wilaya}
                        onValueChange={(value) =>
                          setProductForm((prev) => ({
                            ...prev,
                            wilaya: value,
                          }))
                        }
                        onOpenChange={(open) => {
                          if (open) setProductWilayaQuery("");
                        }}
                      >
                        <Select.Trigger className="flex h-11 w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-700 transition hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <Select.Value placeholder="All Algeria" />
                          <Select.Icon className="ml-auto text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={8}
                            className="z-50 min-w-[220px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-lg"
                          >
                            <div className="px-2 pb-2 pt-1">
                              <input
                                value={productWilayaQuery}
                                onChange={(event) =>
                                  setProductWilayaQuery(event.target.value)
                                }
                                onKeyDown={(event) => event.stopPropagation()}
                                placeholder="Search wilaya..."
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-green-400"
                              />
                            </div>
                            <Select.Viewport className="max-h-56 overflow-y-auto p-1">
                              {filteredProductWilayas.map((option) => (
                                <Select.Item
                                  key={option}
                                  value={option}
                                  className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-600 outline-none data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700 data-[state=checked]:bg-green-50"
                                >
                                  <Select.ItemText>
                                    {option === "All Wilayas"
                                      ? "All Algeria"
                                      : option}
                                  </Select.ItemText>
                                  <Select.ItemIndicator>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                              {productWilayaQuery.trim().length > 0 &&
                                filteredProductWilayas.length <= 1 && (
                                  <div className="px-3 py-2 text-xs text-gray-400">
                                    No matches found.
                                  </div>
                                )}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                      <p className="text-[11px] text-gray-400">
                        Choose &quot;All Algeria&quot; to offer delivery to every wilaya.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Product Image
                    </label>
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                      <label className="flex cursor-pointer items-center gap-3 text-xs text-gray-600">
                        <ImagePlus className="h-4 w-4 text-green-500" />
                        Upload product image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageChange}
                          className="hidden"
                        />
                      </label>
                      {productImagePreview ? (
                        <img
                          src={productImagePreview}
                          alt="Preview"
                          className="mt-4 h-32 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-white text-xs text-gray-400">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
              <div className="text-xs text-gray-500">
                Your listing goes live instantly after submission.
              </div>
              <button
                type="button"
                onClick={handleCreateProduct}
                disabled={productSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {productSubmitting ? "Publishing..." : "Publish Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="gd-bottom-nav fixed left-1/2 z-30 flex w-[min(96vw,560px)] -translate-x-1/2 items-center gap-1 rounded-[999px] px-2 py-2 max-[360px]:w-[min(98vw,380px)] max-[360px]:gap-0.5 max-[360px]:px-1.5 sm:w-[min(94vw,620px)] sm:gap-1.5 sm:px-3 sm:py-2.5"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        aria-label="Marketplace quick actions"
      >
        <button
          type="button"
          onClick={() => scrollToSection("marketplace-home")}
          className={GD_BOTTOM_NAV_ITEM}
        >
          <Home className={GD_BOTTOM_NAV_ICON} />
          <span className="block w-full truncate">Home</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToSection("marketplace-categories")}
          className={GD_BOTTOM_NAV_ITEM}
        >
          <Sprout className={GD_BOTTOM_NAV_ICON} />
          <span className="block w-full truncate">My Seeds</span>
        </button>
        {isSeller && (
          <button
            type="button"
            onClick={() => setProductModalOpen(true)}
            className="gd-bottom-nav-add relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_10px_28px_rgba(16,185,129,0.4)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(16,185,129,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 max-[360px]:h-10 max-[360px]:w-10"
            aria-label="Add product"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        {isSeller ? (
          <button
            type="button"
            onClick={() => scrollToSection("featured-marketplace")}
            className={GD_BOTTOM_NAV_ITEM}
          >
            <ShoppingCart className={GD_BOTTOM_NAV_ICON} />
            <span className="block w-full truncate">Market</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/market-place/buyer")}
            className={GD_BOTTOM_NAV_ITEM}
          >
            <Gauge className={GD_BOTTOM_NAV_ICON} />
            <span className="block w-full truncate">Dashboard</span>
          </button>
        )}
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={signOutPending}
            className={GD_BOTTOM_NAV_ITEM}
          >
            <LogOut className={GD_BOTTOM_NAV_ICON} />
            <span className="block w-full truncate">
              {signOutPending ? "Signing out" : "Logout"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/market-place/login")}
            className={GD_BOTTOM_NAV_ITEM}
          >
            <User className={GD_BOTTOM_NAV_ICON} />
            <span className="block w-full truncate">Login</span>
          </button>
        )}
      </nav>
    </div>
  );
}
