"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  MapPin,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

type AdminOrder = {
  id: string;
  buyer_id: string;
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
    wilaya: string | null;
  } | null;
};

const GD_formatWilayaLabel = (value?: string | null) => {
  if (!value) return "Algeria";
  return value === "All Wilayas" ? "All Algeria" : value;
};

const GD_ESCROW_FILTERS = [
  { value: "pending_receipt", label: "Pending Receipt" },
  { value: "funds_held", label: "Funds Held" },
  { value: "disputed", label: "Disputed" },
  { value: "released_to_seller", label: "Released" },
  { value: "all", label: "All" },
] as const;

export default function AdminEscrowPage() {
  const { supabase, user, profile } = useMarketplaceAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof GD_ESCROW_FILTERS)[number]["value"]>(
    "pending_receipt"
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const fetchOrders = useCallback(async () => {
    if (!supabase || !user || !isAdmin) return;
    setLoading(true);
    let query = supabase
      .from("marketplace_orders")
      .select(
        "id, buyer_id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya )"
      )
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("escrow_status", filter);
    }

    const { data, error } = await query;
    if (error) {
      const message = error.message ?? "";
      if (
        message.toLowerCase().includes("escrow_status") ||
        message.toLowerCase().includes("buyer_receipt_url") ||
        message.toLowerCase().includes("seller_shipping_proof")
      ) {
        setToast(
          "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
        );
      } else if (message.toLowerCase().includes("permission")) {
        setToast("Admin access blocked by database policy.");
      } else {
        setToast("Unable to load escrow orders.");
      }
      setLoading(false);
      return;
    }

    const normalized =
      (data ?? []).map((row) => ({
        id: row.id,
        buyer_id: row.buyer_id,
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
  }, [supabase, user, isAdmin, filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleVerifyFunds = useCallback(
    async (orderId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(orderId);
      const { error } = await supabase
        .from("marketplace_orders")
        .update({ escrow_status: "funds_held" })
        .eq("id", orderId);

      if (error) {
        setToast("Unable to verify receipt right now.");
        setActionLoading(null);
        return;
      }
      setToast("Receipt verified. Funds held in escrow.");
      setActionLoading(null);
      fetchOrders();
    },
    [supabase, isAdmin, fetchOrders]
  );

  const handleReleaseToSeller = useCallback(
    async (orderId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(orderId);
      const { error } = await supabase
        .from("marketplace_orders")
        .update({ escrow_status: "released_to_seller" })
        .eq("id", orderId);

      if (error) {
        setToast("Unable to release funds right now.");
        setActionLoading(null);
        return;
      }
      setToast("Funds released to seller.");
      setActionLoading(null);
      fetchOrders();
    },
    [supabase, isAdmin, fetchOrders]
  );

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Please sign in to access the admin dashboard.
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Admin access required.
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

      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                Admin Escrow Desk
              </div>
              <h1 className="mt-2 text-2xl font-semibold">
                Verify receipts & resolve disputes
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Approve payments, unlock shipping, and settle escrow conflicts.
              </p>
            </div>
            <Link
              href="/market-place"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-200/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to marketplace
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            {GD_ESCROW_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-3 py-1 transition ${
                  filter === item.value
                    ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`admin-escrow-skeleton-${index}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-20 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-40 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            No escrow orders found for this filter.
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const escrowStatus =
                (order.escrow_status ?? "pending_receipt").toLowerCase();
              const fundsHeld = escrowStatus === "funds_held";
              const disputed = escrowStatus === "disputed";
              const released = escrowStatus === "released_to_seller";
              const shipped =
                order.status === "shipped" || order.status === "delivered";
              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition hover:border-emerald-200/30 hover:bg-white/10"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_1fr] lg:items-start">
                    <div className="flex items-start gap-4">
                      <img
                        src={
                          order.item?.image_url ??
                          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                        }
                        alt={order.item?.title ?? "Order item"}
                        className="h-16 w-20 rounded-2xl object-cover"
                      />
                      <div>
                        <div className="text-sm font-semibold">
                          {order.item?.title ?? "Marketplace Item"}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          Order {order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <span>Buyer {order.buyer_id.slice(0, 8)}</span>
                          <span>
                            Total {order.total_price_dzd.toLocaleString()} DZD
                          </span>
                          {order.item?.wilaya && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-emerald-200" />
                              {GD_formatWilayaLabel(order.item.wilaya)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-white/60">
                      {fundsHeld && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Funds Held
                        </span>
                      )}
                      {shipped && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/30 bg-sky-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                          <Truck className="h-3.5 w-3.5" />
                          Shipped
                        </span>
                      )}
                      {released && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Released
                        </span>
                      )}
                      {disputed && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Disputed
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      {order.buyer_receipt_url ? (
                        <a
                          href={order.buyer_receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-emerald-300/40"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          View Receipt
                        </a>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/50">
                          No receipt
                        </span>
                      )}

                      {order.seller_shipping_proof && (
                        <a
                          href={order.seller_shipping_proof}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-emerald-300/40"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Shipping Proof
                        </a>
                      )}

                      {escrowStatus === "pending_receipt" && (
                        <button
                          type="button"
                          onClick={() => handleVerifyFunds(order.id)}
                          disabled={actionLoading === order.id || !order.buyer_receipt_url}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-950 transition hover:brightness-110 disabled:opacity-60"
                        >
                          {actionLoading === order.id
                            ? "Verifying..."
                            : "Verify Funds Held"}
                        </button>
                      )}

                      {disputed && (
                        <button
                          type="button"
                          onClick={() => handleReleaseToSeller(order.id)}
                          disabled={actionLoading === order.id}
                          className="rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-200/20 disabled:opacity-60"
                        >
                          {actionLoading === order.id
                            ? "Releasing..."
                            : "Release to Seller"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
