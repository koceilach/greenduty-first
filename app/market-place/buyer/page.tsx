"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  ChevronRight,
  PackageCheck,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import { GD_WILAYAS } from "@/lib/wilayas";

type BuyerOrder = {
  id: string;
  quantity: number;
  total_price_dzd: number;
  status: string;
  escrow_status?: string | null;
  buyer_confirmation?: boolean | null;
  buyer_receipt_url?: string | null;
  seller_shipping_proof?: string | null;
  created_at: string;
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price_dzd: number;
  } | null;
};

type BuyerSavedItem = {
  id: string;
  created_at: string;
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price_dzd: number;
    wilaya: string | null;
  } | null;
};

type BuyerCartItem = {
  id: string;
  quantity: number;
  created_at: string;
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price_dzd: number;
    wilaya: string | null;
  } | null;
};

export default function BuyerDashboardPage() {
  const { supabase, user, profile, updateProfile, refreshProfile, submitSellerApplication, getMySellerApplication } =
    useMarketplaceAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [savedItems, setSavedItems] = useState<BuyerSavedItem[]>([]);
  const [cartItems, setCartItems] = useState<BuyerCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartCheckoutLoading, setCartCheckoutLoading] = useState(false);
  const [cartCheckoutOpen, setCartCheckoutOpen] = useState(false);
  const [cartCheckoutStep, setCartCheckoutStep] = useState<1 | 2>(1);
  const [cartFirstName, setCartFirstName] = useState("");
  const [cartLastName, setCartLastName] = useState("");
  const [cartAddress, setCartAddress] = useState("");
  const [cartLocation, setCartLocation] = useState("");
  const [sellerRequestOpen, setSellerRequestOpen] = useState(false);
  const [sellerStoreName, setSellerStoreName] = useState("");
  const [sellerBio, setSellerBio] = useState("");
  const [sellerLocation, setSellerLocation] = useState("Algiers");
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const cardBase =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]";
  const isSeller = profile?.role === "seller";

  const fetchOrders = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select(
        "id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd )"
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const message = error.message ?? "";
      if (
        message.toLowerCase().includes("escrow_status") ||
        message.toLowerCase().includes("buyer_confirmation") ||
        message.toLowerCase().includes("buyer_receipt_url") ||
        message.toLowerCase().includes("seller_shipping_proof")
      ) {
        setToast(
          "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
        );
      } else {
        setToast("Unable to load purchase history.");
      }
      setLoading(false);
      return;
    }
    const normalized =
      (data ?? []).map((row) => ({
        id: row.id,
        quantity: row.quantity,
        total_price_dzd: row.total_price_dzd,
        status: row.status,
        escrow_status: (row as any).escrow_status ?? "pending_receipt",
        buyer_confirmation: (row as any).buyer_confirmation ?? false,
        buyer_receipt_url: (row as any).buyer_receipt_url ?? null,
        seller_shipping_proof: (row as any).seller_shipping_proof ?? null,
        created_at: row.created_at,
        item: (row as any).marketplace_items ?? null,
      })) ?? [];

    setOrders(normalized);
    setLoading(false);
  }, [supabase, user]);

  const fetchSavedItems = useCallback(async () => {
    if (!supabase || !user) return;
    setSavedLoading(true);
    const { data, error } = await supabase
      .from("marketplace_saved_items")
      .select(
        "id, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya )"
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setToast("Unable to load saved items.");
      setSavedLoading(false);
      return;
    }

    const normalized =
      (data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        item: (row as any).marketplace_items ?? null,
      })) ?? [];

    setSavedItems(normalized);
    setSavedLoading(false);
  }, [supabase, user]);

  const fetchCartItems = useCallback(async () => {
    if (!supabase || !user) return;
    setCartLoading(true);
    const { data, error } = await supabase
      .from("marketplace_cart_items")
      .select(
        "id, quantity, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya )"
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setToast("Unable to load cart items.");
      setCartLoading(false);
      return;
    }

    const normalized =
      (data ?? []).map((row) => ({
        id: row.id,
        quantity: row.quantity,
        created_at: row.created_at,
        item: (row as any).marketplace_items ?? null,
      })) ?? [];

    setCartItems(normalized);
    setCartLoading(false);
  }, [supabase, user]);

  const handleRemoveSavedItem = useCallback(
    async (savedId: string) => {
      if (!supabase || !user) return;
      const { error } = await supabase
        .from("marketplace_saved_items")
        .delete()
        .eq("id", savedId)
        .eq("buyer_id", user.id);
      if (error) {
        setToast("Unable to remove saved item.");
        return;
      }
      setSavedItems((prev) => prev.filter((item) => item.id !== savedId));
      setToast("Removed from saved picks.");
    },
    [supabase, user]
  );

  const handleRemoveCartItem = useCallback(
    async (cartId: string) => {
      if (!supabase || !user) return;
      const { error } = await supabase
        .from("marketplace_cart_items")
        .delete()
        .eq("id", cartId)
        .eq("buyer_id", user.id);
      if (error) {
        setToast("Unable to remove cart item.");
        return;
      }
      setCartItems((prev) => prev.filter((item) => item.id !== cartId));
      setToast("Removed from cart.");
    },
    [supabase, user]
  );

  const deliveryFee = 50;

  const handleOpenCartCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      setToast("Your cart is empty.");
      return;
    }
    if (!cartLocation) {
      const fallbackLocation =
        cartItems.find((entry) => entry.item?.wilaya)?.item?.wilaya ?? "";
      setCartLocation(fallbackLocation);
    }
    setCartCheckoutStep(1);
    setCartCheckoutOpen(true);
  }, [cartItems, cartLocation]);

  const handleConfirmCartOrder = useCallback(async () => {
    if (!supabase || !user) return;
    if (cartItems.length === 0) {
      setToast("Your cart is empty.");
      return;
    }

    const invalidItem = cartItems.find(
      (entry) =>
        !entry.item?.id ||
        typeof entry.item?.price_dzd !== "number" ||
        entry.item.price_dzd <= 0
    );

    if (invalidItem) {
      setToast("Some cart items are missing a price.");
      return;
    }

    if (
      cartFirstName.trim().length === 0 ||
      cartLastName.trim().length === 0 ||
      cartAddress.trim().length === 0 ||
      cartLocation.trim().length === 0
    ) {
      setToast("Please complete delivery details.");
      return;
    }

    setCartCheckoutLoading(true);
    const rows = cartItems.map((entry) => ({
      buyer_id: user.id,
      item_id: entry.item!.id,
      quantity: entry.quantity ?? 1,
      total_price_dzd:
        entry.item!.price_dzd * (entry.quantity ?? 1) + deliveryFee,
      status: "pending",
      escrow_status: "pending_receipt",
      buyer_confirmation: false,
      buyer_receipt_url: null,
      seller_shipping_proof: null,
      buyer_first_name: cartFirstName.trim(),
      buyer_last_name: cartLastName.trim(),
      delivery_address: cartAddress.trim(),
      delivery_location: cartLocation.trim(),
      delivery_fee_dzd: deliveryFee,
    }));

    const { error } = await supabase.from("marketplace_orders").insert(rows);
    if (error) {
      const message = error.message ?? "";
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
        setToast("Unable to place your cart order right now.");
      }
      setCartCheckoutLoading(false);
      return;
    }

    const cartIds = cartItems.map((entry) => entry.id);
    await supabase
      .from("marketplace_cart_items")
      .delete()
      .in("id", cartIds)
      .eq("buyer_id", user.id);

    setCartItems([]);
    setToast("Order placed. Seller notified.");
    setCartCheckoutLoading(false);
    setCartCheckoutOpen(false);
    router.push("/market-place/orders");
  }, [
    supabase,
    user,
    cartItems,
    deliveryFee,
    cartFirstName,
    cartLastName,
    cartAddress,
    cartLocation,
    router,
  ]);

  const handleSellerUpgrade = useCallback(async () => {
    if (!user) {
      setToast("Please sign in to become a seller.");
      return;
    }
    if (
      !sellerStoreName.trim() ||
      !sellerBio.trim() ||
      !sellerLocation.trim()
    ) {
      setToast("Fill in store name, bio, and location.");
      return;
    }
    setSellerSubmitting(true);
    const { error } = await submitSellerApplication({
      store_name: sellerStoreName.trim(),
      bio: sellerBio.trim(),
      location: sellerLocation.trim(),
    });
    setSellerSubmitting(false);
    setSellerRequestOpen(false);
    if (error) {
      setToast(error);
    } else {
      setToast("Application submitted! An admin will review it shortly.");
    }
  }, [
    user,
    sellerStoreName,
    sellerBio,
    sellerLocation,
    submitSellerApplication,
  ]);

  const uploadReceipt = useCallback(
    async (orderId: string, file: File) => {
      if (!supabase || !user) return null;
      const extension = file.name.split(".").pop() ?? "jpg";
      const filePath = `escrow/receipts/${user.id}/${orderId}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (error) {
        setToast("Receipt upload failed.");
        return null;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    },
    [supabase, user]
  );

  const handleUploadReceipt = useCallback(
    async (orderId: string, file?: File) => {
      if (!supabase || !user || !file) return;
      setReceiptUploading(orderId);
      const receiptUrl = await uploadReceipt(orderId, file);
      if (!receiptUrl) {
        setReceiptUploading(null);
        return;
      }
      const { error } = await supabase
        .from("marketplace_orders")
        .update({
          buyer_receipt_url: receiptUrl,
          escrow_status: "pending_receipt",
        })
        .eq("id", orderId)
        .eq("buyer_id", user.id);

      if (error) {
        const message = error.message ?? "";
        if (
          message.toLowerCase().includes("escrow_status") ||
          message.toLowerCase().includes("buyer_receipt_url")
        ) {
          setToast(
            "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
          );
        } else {
          setToast("Unable to submit receipt right now.");
        }
        setReceiptUploading(null);
        return;
      }

      setToast("Receipt submitted. Awaiting admin verification.");
      setReceiptUploading(null);
      fetchOrders();
    },
    [supabase, user, uploadReceipt, fetchOrders]
  );

  const handleConfirmDelivery = useCallback(
    async (orderId: string) => {
      if (!supabase || !user) return;
      setConfirmingOrder(orderId);
      const { error } = await supabase
        .from("marketplace_orders")
        .update({
          buyer_confirmation: true,
          escrow_status: "released_to_seller",
          status: "delivered",
        })
        .eq("id", orderId)
        .eq("buyer_id", user.id);

      if (error) {
        const message = error.message ?? "";
        if (
          message.toLowerCase().includes("escrow_status") ||
          message.toLowerCase().includes("buyer_confirmation")
        ) {
          setToast(
            "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
          );
        } else {
          setToast("Unable to confirm delivery right now.");
        }
        setConfirmingOrder(null);
        return;
      }

      setToast("Delivery confirmed. Funds released to seller.");
      setConfirmingOrder(null);
      fetchOrders();
    },
    [supabase, user, fetchOrders]
  );

  const handleOpenDispute = useCallback(
    async (orderId: string) => {
      if (!supabase || !user) return;
      setDisputeOrder(orderId);
      const { error } = await supabase
        .from("marketplace_orders")
        .update({
          escrow_status: "disputed",
          status: "disputed",
        })
        .eq("id", orderId)
        .eq("buyer_id", user.id);

      if (error) {
        const message = error.message ?? "";
        if (message.toLowerCase().includes("escrow_status")) {
          setToast(
            "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
          );
        } else {
          setToast("Unable to open dispute right now.");
        }
        setDisputeOrder(null);
        return;
      }

      setToast("Dispute opened. Admin notified.");
      setDisputeOrder(null);
      fetchOrders();
    },
    [supabase, user, fetchOrders]
  );

  useEffect(() => {
    fetchOrders();
    fetchSavedItems();
    fetchCartItems();
  }, [fetchOrders, fetchSavedItems, fetchCartItems]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpend = orders.reduce(
      (sum, order) => sum + (order.total_price_dzd ?? 0),
      0
    );
    const delivered = orders.filter((order) => order.status === "delivered")
      .length;
    return { totalOrders, totalSpend, delivered };
  }, [orders]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, entry) => {
      const price = entry.item?.price_dzd ?? 0;
      return sum + price * (entry.quantity ?? 0);
    }, 0);
  }, [cartItems]);
  const cartFeeTotal = cartItems.length * deliveryFee;
  const cartTotalWithFee = cartTotal + cartFeeTotal;
  const cartFormComplete =
    cartFirstName.trim().length > 0 &&
    cartLastName.trim().length > 0 &&
    cartAddress.trim().length > 0 &&
    cartLocation.trim().length > 0;

  const statusMeta = useCallback((status?: string) => {
    const normalized = (status ?? "pending").toLowerCase();
    if (normalized === "delivered") {
      return {
        label: "Delivered",
        className:
          "border-emerald-200/30 bg-emerald-200/15 text-emerald-100",
      };
    }
    if (normalized === "shipped") {
      return {
        label: "Shipped",
        className: "border-sky-200/30 bg-sky-200/10 text-sky-100",
      };
    }
    if (normalized === "disputed") {
      return {
        label: "Disputed",
        className: "border-amber-300/40 bg-amber-200/15 text-amber-100",
      };
    }
    if (normalized === "cancelled" || normalized === "canceled") {
      return {
        label: "Cancelled",
        className: "border-rose-200/30 bg-rose-200/10 text-rose-100",
      };
    }
    if (normalized === "processing") {
      return {
        label: "Processing",
        className: "border-sky-200/30 bg-sky-200/10 text-sky-100",
      };
    }
    const label =
      normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return {
      label,
      className: "border-amber-200/30 bg-amber-200/10 text-amber-100",
    };
  }, []);

  if (!user) {
    return (
      <div className="gd-mp-sub relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className={`${cardBase} p-8 text-center text-sm text-white/60`}>
            Please sign in to view your buyer dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-mp-sub relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className={`${cardBase} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Buyer Dashboard
              </div>
              <h1 className="mt-2 text-2xl font-semibold">Your Orders</h1>
              <p className="mt-2 text-sm text-white/60">
                Track purchases, delivery status, and spending history.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/market-place"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-200/20"
              >
                Browse marketplace
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              {!isSeller ? (
                <button
                  type="button"
                  onClick={() => setSellerRequestOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:brightness-110"
                >
                  Become a Seller
                </button>
              ) : (
                <Link
                  href="/market-place/vendor"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                >
                  Seller Studio
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                Total Orders
                <Receipt className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="mt-2 text-xl font-semibold text-emerald-200">
                {stats.totalOrders}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                Total Spend
                <BadgeCheck className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="mt-2 text-xl font-semibold text-emerald-200">
                {stats.totalSpend.toLocaleString()} DZD
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                Delivered
                <PackageCheck className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="mt-2 text-xl font-semibold text-emerald-200">
                {stats.delivered}
              </div>
            </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`${cardBase} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Saved Picks
              </div>
              <h2 className="mt-2 text-lg font-semibold">
                Gemini favorites you liked
              </h2>
              <p className="mt-1 text-xs text-white/60">
                Items saved from AI recommendations for quick access later.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
              {savedItems.length} saved
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {savedLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`saved-skeleton-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 animate-pulse"
                >
                  <div className="h-12 w-16 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                  <div className="h-4 w-16 rounded-full bg-white/10" />
                </div>
              ))
            ) : savedItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/60">
                No saved items yet. Tap Save on Gemini AI recommendations.
              </div>
            ) : (
              savedItems.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        entry.item?.image_url ??
                        "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={entry.item?.title ?? "Saved item"}
                      className="h-12 w-16 rounded-xl object-cover"
                    />
                    <div>
                      <div className="text-sm font-semibold">
                        {entry.item?.title ?? "Marketplace item"}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {entry.item?.wilaya ?? "Algeria"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span className="font-semibold text-emerald-200">
                      {(entry.item?.price_dzd ?? 0).toLocaleString()} DZD
                    </span>
                    {entry.item?.id && (
                      <Link
                        href={`/market-place/product/${entry.item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100/90 transition hover:text-emerald-100"
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <button
                      type="button"
                      aria-label="Remove saved item"
                      onClick={() => handleRemoveSavedItem(entry.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-300/40 bg-rose-400/10 text-rose-100 transition hover:border-rose-200/70 hover:bg-rose-400/20"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${cardBase} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Cart Overview
              </div>
              <h2 className="mt-2 text-lg font-semibold">
                Items waiting to be ordered
              </h2>
              <p className="mt-1 text-xs text-white/60">
                Review your cart before placing an order.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
              {cartItems.length} items
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {cartLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`cart-skeleton-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 animate-pulse"
                >
                  <div className="h-12 w-16 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                  <div className="h-4 w-16 rounded-full bg-white/10" />
                </div>
              ))
            ) : cartItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/60">
                Your cart is empty. Add items from Featured Marketplace.
              </div>
            ) : (
              cartItems.map((entry) => {
                const price = entry.item?.price_dzd ?? 0;
                const lineTotal = price * entry.quantity;
                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          entry.item?.image_url ??
                          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                        }
                        alt={entry.item?.title ?? "Cart item"}
                        className="h-12 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-sm font-semibold">
                          {entry.item?.title ?? "Marketplace item"}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          Qty {entry.quantity} /{" "}
                          {entry.item?.wilaya ?? "Algeria"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-white/60">
                      <span className="font-semibold text-emerald-200">
                        {lineTotal.toLocaleString()} DZD
                      </span>
                      {entry.item?.id && (
                        <Link
                          href={`/market-place/product/${entry.item.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100/90 transition hover:text-emerald-100"
                        >
                          View
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <button
                        type="button"
                        aria-label="Remove cart item"
                        onClick={() => handleRemoveCartItem(entry.id)}
                        className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-300/40 bg-rose-400/10 text-rose-100 transition hover:border-rose-200/70 hover:bg-rose-400/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-white/60">
            <div className="flex items-center justify-between">
              <span>Estimated subtotal</span>
              <span className="text-sm font-semibold text-emerald-200">
                {cartTotal.toLocaleString()} DZD
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery fee</span>
              <span className="text-sm font-semibold text-emerald-200">
                {cartFeeTotal} DZD
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span>Total (pay on delivery)</span>
              <span className="text-sm font-semibold text-emerald-100">
                {cartTotalWithFee.toLocaleString()} DZD
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenCartCheckout}
              disabled={cartItems.length === 0 || cartCheckoutLoading}
              className="w-full rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Buy all items together
            </button>
            <div className="text-[11px] text-white/50">
              A 50 DZD delivery margin is added per item.
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Purchase History
              </div>
              <h2 className="mt-2 text-lg font-semibold">Recent activity</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
              <ShoppingBag className="h-4 w-4 text-emerald-200" />
              {orders.length} orders
            </div>
          </div>
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`buyer-skeleton-${index}`}
                  className={`${cardBase} animate-pulse p-5`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-20 w-24 rounded-2xl bg-white/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-3 w-40 rounded-full bg-white/10" />
                      <div className="h-3 w-28 rounded-full bg-white/10" />
                      <div className="h-3 w-24 rounded-full bg-white/10" />
                    </div>
                    <div className="h-8 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className={`${cardBase} p-8 text-center text-sm text-white/60`}>
              No orders yet. Explore the marketplace feed to place your first
              order.
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const status = statusMeta(order.status);
                const unitPrice =
                  order.item?.price_dzd ??
                  Math.round(
                    order.total_price_dzd / Math.max(order.quantity, 1)
                  );
                const escrowStatus =
                  (order.escrow_status ?? "pending_receipt").toLowerCase();
                const receiptSubmitted = Boolean(order.buyer_receipt_url);
                const fundsHeld = escrowStatus === "funds_held";
                const released = escrowStatus === "released_to_seller";
                const disputed = escrowStatus === "disputed";
                const shipped =
                  order.status === "shipped" || order.status === "delivered";
                const canConfirmDelivery =
                  fundsHeld && (shipped || Boolean(order.seller_shipping_proof));
                const steps = [
                  { label: "Payment", complete: true, active: false },
                  {
                    label: "Escrow",
                    complete: fundsHeld || released,
                    active: escrowStatus === "pending_receipt",
                  },
                  {
                    label: "Shipping",
                    complete: shipped || released,
                    active: fundsHeld && !shipped && !released,
                  },
                  { label: "Success", complete: released, active: released },
                ];
                return (
                  <div
                    key={order.id}
                    className={`${cardBase} p-5 transition hover:border-emerald-200/30 hover:bg-white/10`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.6fr] lg:items-center">
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            order.item?.image_url ??
                            "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                          }
                          alt={order.item?.title ?? "Item"}
                          className="h-20 w-24 rounded-2xl object-cover"
                        />
                        <div>
                          <div className="text-sm font-semibold">
                            {order.item?.title ?? "Marketplace Item"}
                          </div>
                          <div className="mt-1 text-xs text-white/50">
                            Order ID {order.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
                            <span>Qty {order.quantity}</span>
                            <span>
                              Unit {unitPrice.toLocaleString()} DZD
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-200" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          Total {order.total_price_dzd.toLocaleString()} DZD
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3 text-xs text-white/60">
                        <div
                          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${status.className}`}
                        >
                          {status.label}
                        </div>
                        {order.item?.id && (
                          <Link
                            href={`/market-place/product/${order.item.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100/90 transition hover:text-emerald-100"
                          >
                            View listing
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="my-8 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-white/60 backdrop-blur">
                      {steps.map((step) => (
                        <div
                          key={step.label}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                            step.complete
                              ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                              : step.active
                                ? "border-sky-200/40 bg-sky-200/10 text-sky-100"
                                : "border-white/10 bg-white/5 text-white/50"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              step.complete
                                ? "bg-emerald-300"
                                : step.active
                                  ? "bg-sky-300"
                                  : "bg-white/30"
                            }`}
                          />
                          {step.label}
                        </div>
                      ))}
                    </div>

                    <div className="my-8 flex flex-wrap items-center gap-3 text-xs text-white/60">
                      {disputed && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                          Dispute in review
                        </span>
                      )}

                      {!released && (
                        <button
                          type="button"
                          onClick={() => handleOpenDispute(order.id)}
                          disabled={disputeOrder === order.id}
                          className="rounded-full border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-200/20 disabled:opacity-60"
                        >
                          {disputeOrder === order.id ? "Opening..." : "Open Dispute"}
                        </button>
                      )}

                      {!receiptSubmitted && escrowStatus === "pending_receipt" && (
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-200/20">
                          {receiptUploading === order.id
                            ? "Uploading..."
                            : "Upload Receipt"}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) handleUploadReceipt(order.id, file);
                            }}
                          />
                        </label>
                      )}

                      {receiptSubmitted && escrowStatus === "pending_receipt" && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                          Receipt submitted - awaiting admin verification
                        </span>
                      )}

                      {fundsHeld && (
                        <span className="rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[11px] font-semibold text-emerald-100">
                          Funds held in escrow
                        </span>
                      )}

                      {canConfirmDelivery && !released && (
                        <button
                          type="button"
                          onClick={() => handleConfirmDelivery(order.id)}
                          disabled={confirmingOrder === order.id}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-950 transition hover:brightness-110 disabled:opacity-60"
                        >
                          {confirmingOrder === order.id
                            ? "Confirming..."
                            : "Confirm Delivery"}
                        </button>
                      )}

                      {released && (
                        <span className="rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                          Funds released to seller
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {toast && (
          <div className="fixed bottom-6 right-6 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>

      {cartCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/10 bg-emerald-950/90 shadow-[0_30px_90px_rgba(0,0,0,0.55)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              type="button"
              onClick={() => setCartCheckoutOpen(false)}
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
                <div className="mt-3 space-y-3">
                  {cartItems.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-2xl bg-white/20 p-3 backdrop-blur"
                    >
                      <img
                        src={
                          entry.item?.image_url ??
                          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                        }
                        alt={entry.item?.title ?? "Cart item"}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">
                          {entry.item?.title ?? "Marketplace item"}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-950/70">
                          Qty {entry.quantity} ·{" "}
                          {(entry.item?.price_dzd ?? 0).toLocaleString()} DZD
                        </div>
                      </div>
                    </div>
                  ))}
                  {cartItems.length > 3 && (
                    <div className="text-[11px] text-emerald-950/70">
                      + {cartItems.length - 3} more items
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950/70">Subtotal</span>
                    <span className="font-semibold">
                      {cartTotal.toLocaleString()} DZD
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950/70">Delivery fee</span>
                    <span className="font-semibold">{cartFeeTotal} DZD</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-900/20 bg-emerald-900/10 px-4 py-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{cartTotalWithFee.toLocaleString()} DZD</span>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-900/20 bg-emerald-900/10 p-3 text-[11px] text-emerald-950/80">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    GreenDuty protection
                  </div>
                  <p className="mt-2">
                    Pay on delivery. The seller is notified once you confirm.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 text-slate-900 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Step {cartCheckoutStep} of 2
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {cartCheckoutStep === 1
                        ? "Choose delivery location"
                        : "Payment & details"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {cartCheckoutStep === 1
                        ? "Set where you want the items delivered."
                        : "Confirm pay on delivery and fill your details."}
                    </p>
                  </div>
                </div>

                {cartCheckoutStep === 1 ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Delivery place
                      </div>
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                        {cartLocation || "Select delivery location"}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Use a landmark, neighborhood, or city name.
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Delivery place
                      </label>
                      <input
                        type="text"
                        value={cartLocation}
                        onChange={(event) => setCartLocation(event.target.value)}
                        placeholder="Example: Bab Ezzouar, Algiers"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCartCheckoutOpen(false)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-200/60 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCartCheckoutStep(2)}
                        disabled={cartLocation.trim().length === 0}
                        className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-emerald-200"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      <Truck className="h-4 w-4" />
                      Pay on delivery
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                          Name
                        </label>
                        <input
                          type="text"
                          value={cartFirstName}
                          onChange={(event) => setCartFirstName(event.target.value)}
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
                          value={cartLastName}
                          onChange={(event) => setCartLastName(event.target.value)}
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
                        value={cartAddress}
                        onChange={(event) => setCartAddress(event.target.value)}
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
                        value={cartLocation}
                        onChange={(event) => setCartLocation(event.target.value)}
                        placeholder="Landmark or preferred drop-off location"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                      />
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Pay in cash when the items are delivered. Delivery fee is{" "}
                      {deliveryFee} DZD per item.
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCartCheckoutStep(1)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-emerald-200/60 hover:text-slate-700"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCartOrder}
                        disabled={!cartFormComplete || cartCheckoutLoading}
                        className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-emerald-200"
                      >
                        {cartCheckoutLoading
                          ? "Placing order..."
                          : `Confirm order • ${cartTotalWithFee.toLocaleString()} DZD`}
                      </button>
                    </div>
                    {!cartFormComplete && (
                      <div className="text-center text-xs text-slate-500">
                        Please fill in all delivery details to continue.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {sellerRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-2xl rounded-[28px] border border-white/10 bg-emerald-950/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setSellerRequestOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-emerald-950/80 text-white/80 transition hover:bg-emerald-900"
              aria-label="Close seller request"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Become a Seller
            </div>
            <h2 className="mt-2 text-xl font-semibold">
              Share your store details
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Add your store name, bio, and location. An admin will review and
              approve your application.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Store name
                </label>
                <input
                  value={sellerStoreName}
                  onChange={(event) => setSellerStoreName(event.target.value)}
                  placeholder="GreenDuty Seeds"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                  Location (Wilaya)
                </label>
                <select
                  value={sellerLocation}
                  onChange={(event) => setSellerLocation(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                >
                  {GD_WILAYAS.filter((item) => item !== "All Wilayas").map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                Business bio
              </label>
              <textarea
                value={sellerBio}
                onChange={(event) => setSellerBio(event.target.value)}
                rows={4}
                placeholder="Describe what you sell and your farming story."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSellerRequestOpen(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSellerUpgrade}
                disabled={sellerSubmitting}
                className="rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sellerSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
