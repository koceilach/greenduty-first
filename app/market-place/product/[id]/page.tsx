"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Tag,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { GD_findOrCreateMarketplaceDirectConversation } from "@/lib/marketplace/messages/direct-conversation";

type ProductRecord = {
  id: string;
  seller_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  price_dzd?: number | null;
  category?: string | null;
  plant_type?: string | null;
  urgency?: string | null;
  image_url?: string | null;
  wilaya?: string | null;
  stock_quantity?: number | null;
  seller_profile?: MarketplaceSellerProfile | null;
};

type MarketplaceSellerProfile = {
  id: string;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

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

const GD_PLACEHOLDER_COPY =
  "GreenDuty verified listing. Full product details will be available soon.";

const GD_PAGE_CARD =
  "rounded-[32px] border border-white/10 bg-white/5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl";

export default function ProductDetailsPage() {
  const { supabase, user } = useMarketplaceAuth();
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const productId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [sourceTable, setSourceTable] = useState<
    "marketplace_items" | "planting_spots" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");

  const resolveImageUrl = useCallback(
    (rawUrl: string | null | undefined) => {
      if (!rawUrl) return null;
      if (rawUrl.startsWith("http")) return rawUrl;
      if (!supabase) return rawUrl;
      const { data } = supabase.storage.from("avatars").getPublicUrl(rawUrl);
      return data?.publicUrl ?? rawUrl;
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase || !productId) return;
    let active = true;

    const fetchFromTable = async (table: string) => {
      const query =
        table === "marketplace_items"
          ? supabase
              .from(table)
              .select(
                "id, seller_id, title, name, description, price_dzd, category, plant_type, urgency, image_url, wilaya, stock_quantity, marketplace_profiles:seller_id ( id, username, store_name, avatar_url, location )"
              )
          : supabase.from(table).select("*");

      const { data, error: tableError } = await query.eq("id", productId).maybeSingle();
      return { data: data as ProductRecord | null, error: tableError };
    };

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      const primary = await fetchFromTable("marketplace_items");
      let resolved = primary.data;
      let resolvedTable: "marketplace_items" | "planting_spots" | null =
        resolved ? "marketplace_items" : null;

      if (!resolved) {
        const fallback = await fetchFromTable("planting_spots");
        resolved = fallback.data;
        resolvedTable = resolved ? "planting_spots" : null;
        if (!resolved && fallback.error) {
          setError("Unable to load this listing right now.");
        }
      }

      if (!resolved) {
        setError((prev) => prev ?? "Product not found.");
        setSourceTable(null);
        setLoading(false);
        return;
      }

      const image_url = resolveImageUrl(resolved.image_url ?? null);
      const sellerProfile =
        resolvedTable === "marketplace_items"
          ? GD_normalizeSellerProfile(
              (resolved as any).marketplace_profiles as
                | MarketplaceSellerProfile
                | MarketplaceSellerProfile[]
                | null
                | undefined
            )
          : null;
      const sellerAvatar = resolveImageUrl(sellerProfile?.avatar_url ?? null);
      if (!active) return;
      setProduct({
        ...resolved,
        image_url,
        seller_profile: sellerProfile
          ? {
              ...sellerProfile,
              avatar_url: sellerAvatar,
            }
          : null,
      });
      setSourceTable(resolvedTable);
      setLoading(false);
    };

    fetchProduct();

    return () => {
      active = false;
    };
  }, [supabase, productId, resolveImageUrl]);

  const derived = useMemo(() => {
    if (!product) return null;
    const title = product.title ?? product.name ?? "Marketplace Listing";
    const description =
      product.description && product.description.trim().length > 0
        ? product.description
        : GD_PLACEHOLDER_COPY;
    const category = product.plant_type ?? product.category ?? "Marketplace";

    const stock = product.stock_quantity ?? null;
    const urgency =
      product.urgency ??
      (typeof stock === "number"
        ? stock <= 0
          ? "Out of Stock"
          : stock <= 5
          ? "Limited"
          : "Available"
        : "Standard");

    const priceValue =
      typeof product.price_dzd === "number" && product.price_dzd > 0
        ? product.price_dzd
        : null;
    const price = priceValue ? `${priceValue.toLocaleString()} DZD` : "Price on request";

    return {
      title,
      description,
      category,
      urgency,
      price,
      priceValue,
      location: product.wilaya ?? null,
      imageUrl: product.image_url ?? null,
    };
  }, [product]);

  const urgencyBadgeTone = useMemo(() => {
    const value = derived?.urgency?.toLowerCase() ?? "";
    if (value.includes("out")) {
      return "border-red-300/40 bg-red-400/10 text-red-100";
    }
    if (value.includes("limited") || value.includes("urgent") || value.includes("high")) {
      return "border-amber-300/40 bg-amber-400/10 text-amber-100";
    }
    return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
  }, [derived?.urgency]);

  const stockCount = product?.stock_quantity ?? null;
  const sellerProfile = product?.seller_profile ?? null;
  const sellerName = useMemo(
    () => GD_sellerDisplayName(sellerProfile),
    [sellerProfile]
  );
  const sellerProfileHref = useMemo(() => {
    if (!product?.seller_id) return null;
    return `/market-place/profile/${product.seller_id}`;
  }, [product?.seller_id]);
  const isOutOfStock =
    typeof stockCount === "number" ? stockCount <= 0 : false;
  const deliveryFee = 50;
  const totalWithFee = derived?.priceValue
    ? derived.priceValue + deliveryFee
    : null;
  const canCheckout =
    !!derived?.priceValue &&
    !isOutOfStock &&
    sourceTable === "marketplace_items";
  const isDeliveryFormComplete =
    buyerFirstName.trim().length > 0 &&
    buyerLastName.trim().length > 0 &&
    deliveryAddress.trim().length > 0 &&
    deliveryLocation.trim().length > 0;
  const canPlaceOrder = canCheckout && isDeliveryFormComplete;

  const handlePlaceOrder = useCallback(async () => {
    if (!supabase) return;
    if (!user) {
      setToast("Please sign in to place an order.");
      return;
    }
    if (!product || !derived) {
      setToast("This product is unavailable.");
      return;
    }
    if (sourceTable !== "marketplace_items") {
      setToast("This listing cannot be ordered right now.");
      return;
    }
    if (!derived.priceValue) {
      setToast("Price on request. Please message the seller.");
      return;
    }
    if (isOutOfStock) {
      setToast("This item is currently out of stock.");
      return;
    }
    if (!isDeliveryFormComplete) {
      setToast("Please complete delivery details.");
      return;
    }

    setPlacingOrder(true);
    const { error: orderError } = await supabase
      .from("marketplace_orders")
      .insert([
        {
          buyer_id: user.id,
          item_id: product.id,
          quantity: 1,
          total_price_dzd: derived.priceValue + deliveryFee,
          status: "pending",
          escrow_status: "pending_receipt",
          buyer_confirmation: false,
          buyer_receipt_url: null,
          seller_shipping_proof: null,
          buyer_first_name: buyerFirstName.trim(),
          buyer_last_name: buyerLastName.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_location: deliveryLocation.trim(),
          delivery_fee_dzd: deliveryFee,
        },
      ]);

    if (orderError) {
      const message = orderError.message ?? "";
      if (
        message.toLowerCase().includes("escrow_status") ||
        message.toLowerCase().includes("buyer_confirmation") ||
        message.toLowerCase().includes("buyer_receipt_url") ||
        message.toLowerCase().includes("seller_shipping_proof")
      ) {
        setToast(
          "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
        );
      } else if (
        message.toLowerCase().includes("buyer_first_name") ||
        message.toLowerCase().includes("buyer_last_name") ||
        message.toLowerCase().includes("delivery_address") ||
        message.toLowerCase().includes("delivery_location") ||
        message.toLowerCase().includes("delivery_fee_dzd")
      ) {
        setToast(
          "Order delivery columns are missing. Run migration 20260206174500_marketplace_order_delivery.sql in Supabase."
        );
      } else if (message.toLowerCase().includes("marketplace_orders")) {
        setToast(
          "Orders table is missing. Run migration 20260205190000_marketplace_rbac.sql in Supabase."
        );
      } else if (
        message.toLowerCase().includes("row-level security") ||
        message.toLowerCase().includes("permission")
      ) {
        setToast(
          "Order blocked by database policy. Apply the marketplace RLS migration in Supabase."
        );
      } else {
        setToast("Unable to place order right now.");
      }
      setPlacingOrder(false);
      return;
    }

    setToast(
      "Order placed. Upload payment receipt in Orders for admin verification."
    );
    setCheckoutOpen(false);
    setPlacingOrder(false);
    router.push("/market-place/orders");
  }, [
    supabase,
    user,
    product,
    derived,
    sourceTable,
    isOutOfStock,
    buyerFirstName,
    buyerLastName,
    deliveryAddress,
    deliveryLocation,
    isDeliveryFormComplete,
    deliveryFee,
    router,
  ]);

  const handleMessageSeller = useCallback(async () => {
    if (!supabase || !user) {
      setToast("Please sign in to message the seller.");
      return;
    }

    if (sourceTable !== "marketplace_items") {
      setToast("Seller chat is unavailable for this listing.");
      return;
    }

    const sellerId = product?.seller_id ?? null;
    if (!sellerId) {
      setToast("Seller chat is unavailable for this listing.");
      return;
    }

    setOpeningChat(true);
    const result = await GD_findOrCreateMarketplaceDirectConversation(
      supabase,
      user.id,
      sellerId,
      {
        itemId: product?.id ?? null,
        itemTitle: derived?.title ?? null,
        itemImageUrl: derived?.imageUrl ?? null,
        itemPriceDzd: derived?.priceValue ?? null,
      }
    );
    setOpeningChat(false);

    if (!result.conversationId) {
      setToast(result.error ?? "Unable to open chat right now.");
      return;
    }

    router.push(`/market-place/messages/${result.conversationId}`);
  }, [
    supabase,
    user,
    sourceTable,
    product?.seller_id,
    product?.id,
    derived?.title,
    derived?.imageUrl,
    derived?.priceValue,
    router,
  ]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.2),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

      <div className="gd-mp-container relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-16 pt-10">
        <Link
          href="/market-place"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80 transition hover:text-emerald-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className={`${GD_PAGE_CARD} p-6 md:p-10`}>
          {!supabase ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              Marketplace data is unavailable. Please configure Supabase to view
              this listing.
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="h-72 w-full rounded-3xl border border-white/10 bg-white/5 animate-pulse lg:w-5/12" />
              <div className="flex flex-1 flex-col gap-4">
                <div className="h-6 w-40 rounded-full bg-white/10" />
                <div className="h-10 w-2/3 rounded-2xl bg-white/10" />
                <div className="h-20 w-full rounded-2xl bg-white/10" />
                <div className="h-16 w-48 rounded-2xl bg-white/10" />
              </div>
            </div>
          ) : error || !derived ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              {error ?? "Product not found."}
            </div>
          ) : (
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="w-full lg:w-5/12">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-emerald-950/60">
                  {derived.imageUrl ? (
                    <img
                      src={derived.imageUrl}
                      alt={derived.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_60%)] text-center">
                      <div className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">
                        GreenDuty
                      </div>
                      <div className="text-sm font-semibold">
                        Image coming soon
                      </div>
                      <div className="text-xs text-white/60">
                        Verified marketplace listing
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-200/60"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {derived.category}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition hover:-translate-y-0.5 ${urgencyBadgeTone}`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {derived.urgency}
                  </button>
                  {derived.location && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                      <MapPin className="h-3.5 w-3.5 text-emerald-200" />
                      {derived.location}
                    </span>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl font-semibold md:text-3xl">
                    {derived.title}
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {derived.description}
                  </p>
                </div>

                {sourceTable === "marketplace_items" && sellerProfileHref && (
                  <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
                    <button
                      type="button"
                      onClick={() => router.push(sellerProfileHref)}
                      className="inline-flex min-w-0 items-center gap-3 text-left"
                    >
                      <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-200/60 bg-white text-sm font-semibold text-emerald-700">
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
                      <span className="min-w-0">
                        <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                          Sold by
                        </span>
                        <span className="block truncate text-sm font-semibold text-emerald-100">
                          {sellerName}
                        </span>
                        {sellerProfile?.location && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-100/80">
                            <MapPin className="h-3 w-3" />
                            {sellerProfile.location}
                          </span>
                        )}
                      </span>
                    </button>
                    <p className="mt-3 text-xs text-emerald-100/80">
                      Visit the seller store to review all listings, ratings, and profile details.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/80">
                      Price
                    </div>
                    <div className="mt-1 text-xl font-semibold text-emerald-100">
                      {derived.price}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                    Fast response guaranteed by GreenDuty marketplace.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(true)}
                    className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-110"
                  >
                    Buy item
                  </button>
                  <button
                    type="button"
                    onClick={handleMessageSeller}
                    disabled={openingChat}
                    className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-semibold text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                  >
                    {openingChat ? "Opening chat..." : "Message seller"}
                  </button>
                  {sellerProfileHref && (
                    <button
                      type="button"
                      onClick={() => router.push(sellerProfileHref)}
                      className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-6 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/60"
                    >
                      View seller store
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {checkoutOpen && derived && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/10 bg-emerald-950/90 shadow-[0_30px_90px_rgba(0,0,0,0.55)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
              className="absolute right-4 top-4 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-emerald-950/80 text-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:bg-emerald-900/90"
              aria-label="Close checkout"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-500 p-5 text-emerald-950 md:p-6">
                <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-950/70">
                  Order Summary
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/20 p-3 backdrop-blur">
                  <img
                    src={
                      derived.imageUrl ??
                      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={derived.title}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold">{derived.title}</div>
                    <div className="mt-1 text-[11px] text-emerald-950/70">
                      {derived.location ?? "Algeria"} · Qty 1
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950/70">Subtotal</span>
                    <span className="font-semibold">{derived.price}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950/70">Service fee</span>
                    <span className="font-semibold">{deliveryFee} DZD</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950/70">Delivery</span>
                    <span className="font-semibold">Receipt required</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-900/20 bg-emerald-900/10 px-4 py-3 text-base font-semibold">
                  <span>Total</span>
                  <span>
                    {totalWithFee
                      ? `${totalWithFee.toLocaleString()} DZD`
                      : derived.price}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-900/20 bg-emerald-900/10 p-3 text-[11px] text-emerald-950/80">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    GreenDuty protection
                  </div>
                  <p className="mt-2">
                    After placing your order, upload your payment receipt in
                    Orders. Admin verifies payment before seller ships.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 text-slate-900 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Payment method
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      Manual payment receipt
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Pay externally, then upload a payment receipt for escrow
                      review.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Truck className="h-4 w-4" />
                    Upload receipt after order
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Name
                      </label>
                      <input
                        type="text"
                        value={buyerFirstName}
                        onChange={(event) => setBuyerFirstName(event.target.value)}
                        placeholder="First name"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Family name
                      </label>
                      <input
                        type="text"
                        value={buyerLastName}
                        onChange={(event) => setBuyerLastName(event.target.value)}
                        placeholder="Last name"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Exact address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      placeholder="Street, building, neighborhood"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Delivery place
                    </label>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(event) => setDeliveryLocation(event.target.value)}
                      placeholder="Landmark or preferred drop-off location"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                    />
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Payment receipt is uploaded from your Orders page after this
                    order is placed. Delivery fee is {deliveryFee} DZD.
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                    We will notify the seller and reserve your item. You can
                    track the order in your Buyer Dashboard.
                  </div>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={!canPlaceOrder || placingOrder}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-emerald-200"
                  >
                    {placingOrder
                      ? "Placing order..."
                      : `Confirm order • ${
                          totalWithFee
                            ? `${totalWithFee.toLocaleString()} DZD`
                            : derived.price
                        }`}
                  </button>
                  {!canCheckout && (
                    <div className="text-center text-xs text-slate-500">
                      {isOutOfStock
                        ? "This item is out of stock."
                        : "Price on request or unavailable for checkout."}
                    </div>
                  )}
                  {canCheckout && !isDeliveryFormComplete && (
                    <div className="text-center text-xs text-slate-500">
                      Please fill in all delivery details to continue.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-emerald-950/85 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
