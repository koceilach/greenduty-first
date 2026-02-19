
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Edit3,
  Leaf,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

type MarketplaceItem = {
  id: string;
  title: string;
  description: string | null;
  price_dzd: number;
  image_url: string | null;
  plant_type: string | null;
  category: string | null;
  wilaya: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type MarketplaceOrder = {
  id: string;
  total_price_dzd: number;
  status: string;
  escrow_status: string | null;
  marketplace_items: {
    id: string;
    seller_id: string;
    category: string | null;
    plant_type: string | null;
  }[];
};

const GD_avatarInitials = (name?: string | null) => {
  if (!name) return "GD";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "GD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const GD_formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString();
};

const GD_isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const GD_toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const GD_toFiniteNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const GD_normalizeOrderItems = (value: unknown): MarketplaceOrder["marketplace_items"] => {
  const rows = Array.isArray(value) ? value : GD_isRecord(value) ? [value] : [];
  return rows
    .map((row) => {
      if (!GD_isRecord(row)) return null;
      if (typeof row.id !== "string" || typeof row.seller_id !== "string") {
        return null;
      }
      return {
        id: row.id,
        seller_id: row.seller_id,
        category: GD_toNullableString(row.category),
        plant_type: GD_toNullableString(row.plant_type),
      };
    })
    .filter((row): row is MarketplaceOrder["marketplace_items"][number] => row !== null);
};

const GD_normalizeOrders = (value: unknown): MarketplaceOrder[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!GD_isRecord(row) || typeof row.id !== "string") return null;
      return {
        id: row.id,
        total_price_dzd: GD_toFiniteNumber(row.total_price_dzd),
        status: GD_toNullableString(row.status) ?? "unknown",
        escrow_status: GD_toNullableString(row.escrow_status),
        marketplace_items: GD_normalizeOrderItems(row.marketplace_items),
      };
    })
    .filter((row): row is MarketplaceOrder => row !== null);
};

export default function MarketplaceProfilePage() {
  const params = useParams();
  const profileId = Array.isArray(params?.id)
    ? params?.id[0]
    : (params?.id as string | undefined);
  const { supabase, user, profile, loading: authLoading, updateProfile } = useMarketplaceAuth();
  const [viewProfile, setViewProfile] = useState<typeof profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [sellerStats, setSellerStats] = useState({
    releasedCount: 0,
    totalSales: 0,
  });
  const [buyerStats, setBuyerStats] = useState({
    totalOrders: 0,
    totalSpend: 0,
    seedOrders: 0,
    ecoScore: 0,
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStoreName, setEditStoreName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const cardBase =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl";

  const isSelf = Boolean(user?.id && profileId && user.id === profileId);

  useEffect(() => {
    if (authLoading) return;
    if (!supabase || !profileId) {
      setLoadingProfile(false);
      setViewProfile(null);
      return;
    }
    let active = true;
    const loadProfile = async () => {
      setLoadingProfile(true);

      // For own profile: use context profile (ensureProfile already ran)
      if (isSelf && profile) {
        if (active) {
          setViewProfile(profile);
          setLoadingProfile(false);
        }
        return;
      }

      // For other profiles or if context profile not ready: fetch from DB
      const { data, error } = await supabase
        .from("marketplace_profiles")
        .select(
          "id, email, username, role, bio, store_name, avatar_url, location, store_latitude, store_longitude, created_at, updated_at"
        )
        .eq("id", profileId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setToast("Unable to load marketplace profile.");
        setViewProfile(null);
      } else if (data) {
        setViewProfile(data as typeof profile);
      } else if (isSelf && user) {
        // Row might not exist yet — create a synthetic profile for own view
        setViewProfile({
          id: user.id,
          email: user.email ?? null,
          username: user.email?.split("@")[0] ?? "User",
          role: "buyer",
          bio: null,
          store_name: null,
          avatar_url: null,
          location: null,
          store_latitude: null,
          store_longitude: null,
          created_at: null,
          updated_at: null,
        });
      } else {
        setViewProfile(null);
      }
      setLoadingProfile(false);
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [supabase, profileId, isSelf, profile, user, authLoading]);

  useEffect(() => {
    if (!isSelf || !profile) return;
    setViewProfile(profile);
  }, [isSelf, profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const isSeller = viewProfile?.role === "seller";
  useEffect(() => {
    if (!supabase || !viewProfile?.id) return;
    if (!isSeller) {
      setItems([]);
      return;
    }
    let active = true;
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .select(
          "id, title, description, price_dzd, image_url, plant_type, category, wilaya, latitude, longitude, created_at"
        )
        .eq("seller_id", viewProfile.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setToast("Unable to load store collection.");
        setItems([]);
        return;
      }
      setItems((data ?? []) as MarketplaceItem[]);
    };
    fetchItems();
    return () => {
      active = false;
    };
  }, [supabase, viewProfile?.id, isSeller]);

  useEffect(() => {
    if (!supabase || !viewProfile?.id) return;
    let active = true;
    const fetchOrders = async () => {
      if (isSeller) {
        const { data, error } = await supabase
          .from("marketplace_orders")
          .select(
            "id, total_price_dzd, status, escrow_status, marketplace_items ( id, seller_id )"
          )
          .eq("marketplace_items.seller_id", viewProfile.id);
        if (!active) return;
        if (error) {
          setToast("Unable to load seller stats.");
          setOrders([]);
          return;
        }
        const list = GD_normalizeOrders(data);
        setOrders(list);
        const released = list.filter(
          (order) =>
            (order.escrow_status ?? "").toLowerCase() === "released_to_seller"
        );
        const totalSales = released.reduce(
          (sum, order) => sum + (order.total_price_dzd ?? 0),
          0
        );
        setSellerStats({ releasedCount: released.length, totalSales });
      } else {
        const { data, error } = await supabase
          .from("marketplace_orders")
          .select(
            "id, total_price_dzd, status, escrow_status, marketplace_items ( id, seller_id, category, plant_type )"
          )
          .eq("buyer_id", viewProfile.id);
        if (!active) return;
        if (error) {
          setToast("Unable to load buyer stats.");
          setOrders([]);
          return;
        }
        const list = GD_normalizeOrders(data);
        setOrders(list);
        const totalSpend = list.reduce(
          (sum, order) => sum + (order.total_price_dzd ?? 0),
          0
        );
        const seedOrders = list.filter((order) => {
          const firstItem = order.marketplace_items[0];
          const category = firstItem?.category ?? firstItem?.plant_type;
          return (category ?? "").toLowerCase().includes("seed");
        }).length;
        const ecoScore = Math.round(list.length * 8 + seedOrders * 12);
        setBuyerStats({
          totalOrders: list.length,
          totalSpend,
          seedOrders,
          ecoScore,
        });
      }
    };
    fetchOrders();
    return () => {
      active = false;
    };
  }, [supabase, viewProfile?.id, isSeller]);

  useEffect(() => {
    if (!supabase || !viewProfile?.id || !isSeller) return;
    let active = true;
    const fetchFollowers = async () => {
      const { count, error } = await supabase
        .from("marketplace_follows")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", viewProfile.id);
      if (!active) return;
      if (error) {
        setFollowerCount(0);
        return;
      }
      setFollowerCount(count ?? 0);
    };
    fetchFollowers();
    return () => {
      active = false;
    };
  }, [supabase, viewProfile?.id, isSeller]);

  useEffect(() => {
    if (!supabase || !viewProfile?.id || !user || !isSeller || isSelf) return;
    let active = true;
    const fetchFollowStatus = async () => {
      const { data } = await supabase
        .from("marketplace_follows")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", viewProfile.id)
        .maybeSingle();
      if (!active) return;
      setFollowing(Boolean(data));
    };
    fetchFollowStatus();
    return () => {
      active = false;
    };
  }, [supabase, viewProfile?.id, user, isSeller, isSelf]);

  const trustBadge = sellerStats.releasedCount >= 5;

  const storeCoords = useMemo(() => {
    const lat = viewProfile?.store_latitude ?? null;
    const lon = viewProfile?.store_longitude ?? null;
    if (typeof lat === "number" && typeof lon === "number") {
      return { lat, lon };
    }
    const itemWithCoords = items.find(
      (item) =>
        typeof item.latitude === "number" && typeof item.longitude === "number"
    );
    if (itemWithCoords && itemWithCoords.latitude && itemWithCoords.longitude) {
      return { lat: itemWithCoords.latitude, lon: itemWithCoords.longitude };
    }
    return null;
  }, [viewProfile?.store_latitude, viewProfile?.store_longitude, items]);

  const handleToggleFollow = useCallback(async () => {
    if (!supabase || !user || !viewProfile) return;
    if (!isSeller || isSelf) return;
    if (following) {
      const { error } = await supabase
        .from("marketplace_follows")
        .delete()
        .eq("buyer_id", user.id)
        .eq("seller_id", viewProfile.id);
      if (error) {
        setToast("Unable to unfollow seller.");
        return;
      }
      setFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
      return;
    }
    const { error } = await supabase.from("marketplace_follows").insert([
      { buyer_id: user.id, seller_id: viewProfile.id },
    ]);
    if (error) {
      setToast("Unable to follow seller.");
      return;
    }
    setFollowing(true);
    setFollowerCount((prev) => prev + 1);
  }, [supabase, user, viewProfile, following, isSeller, isSelf]);

  const openEditModal = useCallback(() => {
    if (!viewProfile) return;
    setEditName(viewProfile.username ?? "");
    setEditBio(viewProfile.bio ?? "");
    setEditLocation(viewProfile.location ?? "");
    setEditStoreName(viewProfile.store_name ?? "");
    setAvatarPreview(viewProfile.avatar_url ?? null);
    setAvatarFile(null);
    setEditOpen(true);
  }, [viewProfile]);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!supabase || !user) return null;
      const extension = file.name.split(".").pop() ?? "jpg";
      const filePath = `marketplace/avatars/${user.id}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (error) {
        setToast("Avatar upload failed.");
        return null;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    },
    [supabase, user]
  );

  const handleSaveProfile = useCallback(async () => {
    if (!updateProfile) return;
    let avatarUrl = viewProfile?.avatar_url ?? null;
    if (avatarFile) {
      const uploaded = await uploadAvatar(avatarFile);
      if (uploaded) avatarUrl = uploaded;
    }
    await updateProfile({
      username: editName.trim() || null,
      bio: editBio.trim() || null,
      location: editLocation.trim() || null,
      store_name: editStoreName.trim() || null,
      avatar_url: avatarUrl,
    });
    setEditOpen(false);
    setToast("Profile updated.");
  }, [
    updateProfile,
    editName,
    editBio,
    editLocation,
    editStoreName,
    avatarFile,
    uploadAvatar,
    viewProfile?.avatar_url,
  ]);

  if (!profileId) {
    return (
      <div className="gd-mp-sub gd-mp-shell min-h-screen bg-[#0b2b25] text-white">
        <div className="gd-mp-container mx-auto max-w-3xl px-6 py-16 text-sm text-white/60">
          Profile not found.
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="gd-mp-sub gd-mp-shell min-h-screen bg-[#0b2b25] text-white">
        <div className="gd-mp-container mx-auto max-w-3xl px-6 py-16 text-sm text-white/60">
          Loading account...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
        </div>
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Please sign in to view marketplace profiles.{" "}
            <Link
              href="/market-place/login"
              className="font-semibold text-emerald-200 hover:text-emerald-100"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="gd-mp-sub gd-mp-shell min-h-screen bg-[#0b2b25] text-white">
        <div className="gd-mp-container mx-auto max-w-3xl px-6 py-16 text-sm text-white/60">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!viewProfile) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="gd-mp-container mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Profile not found.{" "}
            <Link
              href="/market-place"
              className="font-semibold text-emerald-200 hover:text-emerald-100"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    viewProfile.username ?? viewProfile.store_name ?? "Marketplace Member";

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="gd-mp-container relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className={`${cardBase} hidden h-max space-y-4 p-5 lg:block`}>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Account
            </div>
            <nav className="space-y-2 text-sm">
              <Link
                href={`/market-place/profile/${user.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:border-emerald-300/40 hover:text-white"
              >
                My Profile
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/market-place/orders"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
              >
                My Orders
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/market-place/buyer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
              >
                Buyer Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              {profile?.role === "seller" && (
                <Link
                  href="/market-place/vendor"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                >
                  Seller Studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </nav>
          </aside>

          <div className="space-y-6">
            <section className={`${cardBase} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="relative">
                    {viewProfile.avatar_url ? (
                      <img
                        src={viewProfile.avatar_url}
                        alt={displayName}
                        className="h-20 w-20 rounded-3xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-xl font-semibold text-emerald-100">
                        {GD_avatarInitials(displayName)}
                      </div>
                    )}
                    {trustBadge && (
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/40 bg-emerald-200/20 text-emerald-100">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-semibold">{displayName}</h1>
                      {isSeller ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Seller
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                          Buyer
                        </span>
                      )}
                      {trustBadge && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/60">
                      {viewProfile.location && (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-200" />
                          {viewProfile.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-emerald-200" />
                        Joined {GD_formatDate(viewProfile.created_at)}
                      </span>
                    </div>
                    {viewProfile.store_name && (
                      <div className="mt-3 text-sm text-white/80">
                        Store:{" "}
                        <span className="text-emerald-100">
                          {viewProfile.store_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {!isSelf && isSeller && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                        following
                          ? "border border-white/15 bg-white/5 text-white/70 hover:border-emerald-200/40"
                          : "bg-emerald-400 text-emerald-950 hover:brightness-110"
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      {following ? "Following" : "Follow"}
                    </button>
                  )}
                  {isSelf && (
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-emerald-300/40"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit profile
                    </button>
                  )}
                  {isSeller && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-white/70">
                      <Users className="h-4 w-4" />
                      {followerCount} followers
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className={`${cardBase} p-6`}>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Bio
              </div>
              <p className="mt-3 text-sm text-white/70">
                {viewProfile.bio ||
                  "Share your farming story, sourcing values, and marketplace goals."}
              </p>
            </section>

            {isSeller ? (
              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`${cardBase} p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                        Store Collection
                      </div>
                      <h2 className="mt-2 text-lg font-semibold">
                        All store listings
                      </h2>
                      <p className="mt-1 text-xs text-white/60">
                        Buyers can open any listing to review details or place an order.
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
                      {items.length} items
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                      No products listed yet.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <img
                            src={
                              item.image_url ??
                              "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                            }
                            alt={item.title}
                            className="h-28 w-full rounded-2xl object-cover"
                          />
                          <div className="mt-3 text-sm font-semibold">
                            {item.title}
                          </div>
                          <div className="mt-1 text-xs text-white/60">
                            {item.plant_type ?? item.category ?? "Marketplace item"}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/60">
                            <span className="text-sm font-semibold text-emerald-200">
                              {item.price_dzd.toLocaleString()} DZD
                            </span>
                            <span>{GD_formatDate(item.created_at)}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
                              <MapPin className="h-3 w-3 text-emerald-200/80" />
                              {item.wilaya ?? "Algeria"}
                            </span>
                            <Link
                              href={`/market-place/product/${item.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 transition hover:text-emerald-100"
                            >
                              View listing
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className={`${cardBase} p-6`}>
                    <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Store Metrics
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-white/60">
                          Total sales released
                        </div>
                        <div className="mt-2 text-xl font-semibold text-emerald-200">
                          {sellerStats.totalSales.toLocaleString()} DZD
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-white/60">
                          Successful escrow orders
                        </div>
                        <div className="mt-2 text-xl font-semibold text-emerald-200">
                          {sellerStats.releasedCount}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                          <ShieldCheck className="h-4 w-4" />
                          Trust Status
                        </div>
                        <p className="mt-2">
                          {trustBadge
                            ? "Verified seller with consistent escrow success."
                            : "Complete 5+ escrow releases to unlock the verified badge."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`${cardBase} p-6`}>
                    <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Store Location
                    </div>
                    {storeCoords ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        <img
                          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${storeCoords.lat},${storeCoords.lon}&zoom=12&size=600x320&markers=${storeCoords.lat},${storeCoords.lon},green-pushpin`}
                          alt="Store map"
                          className="h-44 w-full object-cover"
                        />
                        <div className="px-4 py-3 text-xs text-white/60">
                          <MapPin className="mr-2 inline h-4 w-4 text-emerald-200" />
                          Coordinates {storeCoords.lat.toFixed(3)}, {" "}
                          {storeCoords.lon.toFixed(3)}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                        No map coordinates available yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`${cardBase} p-6`}>
                  <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    Eco Statistics
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Total Orders</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-200">
                        {buyerStats.totalOrders}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Seeds Planted</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-200">
                        {buyerStats.seedOrders}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Total Spend</div>
                      <div className="mt-2 text-xl font-semibold text-emerald-200">
                        {buyerStats.totalSpend.toLocaleString()} DZD
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Impact Score</div>
                      <div className="mt-2 text-xl font-semibold text-emerald-200">
                        {buyerStats.ecoScore}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${cardBase} p-6`}>
                  <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    Buyer Actions
                  </div>
                  <div className="mt-4 space-y-3 text-xs text-white/60">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                        <Truck className="h-4 w-4" />
                        Delivery Confidence
                      </div>
                      <p className="mt-2">
                        Track escrow progress in your orders dashboard to keep
                        every delivery safe.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                        <Star className="h-4 w-4" />
                        Share Feedback
                      </div>
                      <p className="mt-2">
                        Reviews help sellers grow and keep the marketplace
                        trusted.
                      </p>
                    </div>
                    <Link
                      href="/market-place/orders"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-950 transition hover:brightness-110"
                    >
                      <MessageCircle className="h-4 w-4" />
                      View My Orders
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-2xl rounded-[28px] border border-white/10 bg-emerald-950/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-emerald-950/80 text-white/80 transition hover:bg-emerald-900"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Edit Profile
            </div>
            <h2 className="mt-2 text-xl font-semibold">Update your profile</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Display name
                </label>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Location (Wilaya)
                </label>
                <input
                  value={editLocation}
                  onChange={(event) => setEditLocation(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                Store name (optional)
              </label>
              <input
                value={editStoreName}
                onChange={(event) => setEditStoreName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(event) => setEditBio(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                Avatar
              </label>
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="mt-4 h-28 w-28 rounded-2xl object-cover"
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-950 transition hover:brightness-110"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
