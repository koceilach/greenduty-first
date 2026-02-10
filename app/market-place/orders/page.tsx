"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  MapPin,
  PackageCheck,
  Receipt,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

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
  buyer_first_name?: string | null;
  buyer_last_name?: string | null;
  delivery_address?: string | null;
  delivery_location?: string | null;
  delivery_fee_dzd?: number | null;
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price_dzd: number;
    wilaya: string | null;
  } | null;
};

export default function BuyerOrdersPage() {
  const { supabase, user, profile } = useMarketplaceAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);
  const cardBase =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]";

  const fetchOrders = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select(
        "id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, buyer_first_name, buyer_last_name, delivery_address, delivery_location, delivery_fee_dzd, marketplace_items ( id, title, image_url, price_dzd, wilaya )"
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
          "Orders are blocked by database policy. Apply the marketplace RLS migration in Supabase."
        );
      } else {
        setToast("Unable to load your orders.");
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
        buyer_first_name: (row as any).buyer_first_name ?? null,
        buyer_last_name: (row as any).buyer_last_name ?? null,
        delivery_address: (row as any).delivery_address ?? null,
        delivery_location: (row as any).delivery_location ?? null,
        delivery_fee_dzd: (row as any).delivery_fee_dzd ?? null,
        item: (row as any).marketplace_items ?? null,
      })) ?? [];

    setOrders(normalized);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

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
      <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className={`${cardBase} p-8 text-center text-sm text-white/60`}>
            Please sign in to view your orders.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className={`${cardBase} h-max space-y-4 p-5`}>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Account
            </div>
            <nav className="space-y-2 text-sm">
              <Link
                href={user ? `/market-place/profile/${user.id}` : "/market-place/profile"}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:border-emerald-300/40 hover:text-white"
              >
                My Profile
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/market-place/orders"
                className="flex items-center justify-between rounded-2xl border border-emerald-200/30 bg-emerald-200/10 px-4 py-2 text-white transition"
              >
                My Orders
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/market-place/buyer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
              >
                Buyer Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
              {profile?.role === "seller" && (
                <Link
                  href="/market-place/vendor"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                >
                  Seller Studio
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </nav>
          </aside>

          <div className="space-y-8">
            <header className={`${cardBase} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Buyer Orders
              </div>
              <h1 className="mt-2 text-2xl font-semibold">Your purchases</h1>
              <p className="mt-2 text-sm text-white/60">
                Track order status, delivery details, and payment totals.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/market-place"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-200/20"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to marketplace
              </Link>
              <Link
                href="/market-place/buyer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-emerald-300/40 hover:text-white"
              >
                Buyer dashboard
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
                <ShoppingBag className="h-4 w-4 text-emerald-200" />
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

        <section className="space-y-4">
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`order-skeleton-${index}`}
                  className={`${cardBase} animate-pulse p-6`}
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
              No orders yet. Place your first order from the marketplace.
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const status = statusMeta(order.status);
                const fullName = `${order.buyer_first_name ?? ""} ${
                  order.buyer_last_name ?? ""
                }`.trim();
                const deliveryFee =
                  typeof order.delivery_fee_dzd === "number"
                    ? order.delivery_fee_dzd
                    : 0;
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
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:items-start">
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            order.item?.image_url ??
                            "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                          }
                          alt={order.item?.title ?? "Order item"}
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
                              Item{" "}
                              {(order.item?.price_dzd ?? 0).toLocaleString()}{" "}
                              DZD
                            </span>
                            {order.item?.wilaya && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-emerald-200" />
                                {order.item.wilaya}
                              </span>
                            )}
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
                        <div className="text-xs text-white/50">
                          Delivery fee {deliveryFee.toLocaleString()} DZD
                        </div>
                        <div
                          className={`inline-flex w-max items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${status.className}`}
                        >
                          {status.label}
                        </div>
                      </div>

                      <div className="space-y-3 text-xs text-white/60">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          <Truck className="h-4 w-4 text-emerald-200" />
                          Delivery details
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/50">Recipient</div>
                          <div className="mt-1 text-sm text-white">
                            {fullName || "Buyer"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/50">Address</div>
                          <div className="mt-1 text-sm text-white">
                            {order.delivery_address ?? "Not provided"}
                          </div>
                          <div className="mt-2 text-xs text-white/60">
                            {order.delivery_location ?? "Delivery place not set"}
                          </div>
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
    </div>
  </div>
  </div>
  );
}
