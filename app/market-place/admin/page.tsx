"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import type { MarketplaceProfile, SellerApplication } from "@/components/marketplace-auth-provider";
import {
  GD_isMissingRpcError,
  GD_runEscrowRpc,
} from "@/lib/marketplace/escrow-client";

/* ─── helpers ──────────────────────────────────────────────── */
const GD_formatWilayaLabel = (value?: string | null) => {
  if (!value) return "Algeria";
  return value === "All Wilayas" ? "All Algeria" : value;
};

const GD_ESCROW_FILTERS = [
  { value: "pending_receipt", label: "Pending Receipt" },
  { value: "funds_held", label: "Funds Held" },
  { value: "disputed", label: "Disputed" },
  { value: "released_to_seller", label: "Released" },
  { value: "refunded_to_buyer", label: "Refunded" },
  { value: "all", label: "All" },
] as const;

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
  dispute?: {
    id: string;
    reason?: string | null;
    status?: string | null;
    resolution_action?: string | null;
    resolution_note?: string | null;
    updated_at?: string | null;
  } | null;
  created_at: string;
  item: {
    id: string;
    title: string;
    image_url: string | null;
    price_dzd: number;
    wilaya: string | null;
  } | null;
};

type AdminItem = {
  id: string;
  title: string;
  description: string;
  price_dzd: number;
  image_url: string | null;
  category: string | null;
  seller_id: string;
  stock_quantity: number;
  wilaya: string | null;
  created_at: string;
};

type AdminTab = "escrow" | "applications" | "users" | "products";

/* ─── main component ──────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { supabase, user, profile } = useMarketplaceAuth();
  const isAdmin = profile?.role === "admin";

  /* tab state */
  const [activeTab, setActiveTab] = useState<AdminTab>("applications");
  const [toast, setToast] = useState<string | null>(null);

  /* escrow state */
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [escrowFilter, setEscrowFilter] = useState<(typeof GD_ESCROW_FILTERS)[number]["value"]>("pending_receipt");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* applications state */
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsFilter, setAppsFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  /* users state */
  const [allUsers, setAllUsers] = useState<MarketplaceProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilter, setUsersFilter] = useState<"all" | "buyer" | "seller" | "admin">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* products state */
  const [products, setProducts] = useState<AdminItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ─── escrow fetchers ─────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setOrdersLoading(true);
    const queryWithDisputes =
      "id, buyer_id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya ), marketplace_disputes ( id, reason, status, resolution_action, resolution_note, updated_at )";
    const queryWithoutDisputes =
      "id, buyer_id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya )";

    let query = supabase
      .from("marketplace_orders")
      .select(queryWithDisputes)
      .order("created_at", { ascending: false });

    if (escrowFilter !== "all") query = query.eq("escrow_status", escrowFilter);

    let queryResult: { data: any[] | null; error: { message?: string } | null } =
      await query;
    let data = queryResult.data;
    let error = queryResult.error;
    if (
      error &&
      (error.message ?? "").toLowerCase().includes("marketplace_disputes")
    ) {
      let fallbackQuery = supabase
        .from("marketplace_orders")
        .select(queryWithoutDisputes)
        .order("created_at", { ascending: false });
      if (escrowFilter !== "all") {
        fallbackQuery = fallbackQuery.eq("escrow_status", escrowFilter);
      }
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if ((error.message ?? "").toLowerCase().includes("marketplace_disputes")) {
        setToast(
          "Disputes table is missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
        );
      } else {
        setToast("Unable to load escrow orders.");
      }
      setOrdersLoading(false);
      return;
    }

    setOrders(
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
        dispute: (() => {
          const raw = (row as any).marketplace_disputes;
          if (!raw) return null;
          const payload = Array.isArray(raw) ? raw[0] : raw;
          return payload
            ? {
                id: payload.id,
                reason: payload.reason ?? null,
                status: payload.status ?? null,
                resolution_action: payload.resolution_action ?? null,
                resolution_note: payload.resolution_note ?? null,
                updated_at: payload.updated_at ?? null,
              }
            : null;
        })(),
        created_at: row.created_at,
        item: (row as any).marketplace_items ?? null,
      }))
    );
    setOrdersLoading(false);
  }, [supabase, isAdmin, escrowFilter]);

  const handleVerifyFunds = useCallback(
    async (orderId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(orderId);
      const result = await GD_runEscrowRpc<{ ok: boolean }>(
        supabase,
        "marketplace_admin_set_escrow",
        { p_order_id: orderId, p_action: "verify_funds", p_note: null },
        "Escrow verification timed out. Please try again."
      );
      if (result.error) {
        if (GD_isMissingRpcError(result.error)) {
          const fallback = await supabase
            .from("marketplace_orders")
            .update({ escrow_status: "funds_held", status: "processing" })
            .eq("id", orderId);
          setActionLoading(null);
          if (fallback.error) {
            setToast("Unable to verify receipt.");
            return;
          }
        } else if (
          result.error.toLowerCase().includes("marketplace_admin_set_escrow")
        ) {
          setActionLoading(null);
          setToast(
            "Escrow RPC missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
          );
          return;
        } else {
          setActionLoading(null);
          setToast(result.error);
          return;
        }
      } else {
        setActionLoading(null);
      }
      setToast("Receipt verified. Funds held in escrow.");
      fetchOrders();
    },
    [supabase, isAdmin, fetchOrders]
  );

  const handleReleaseToSeller = useCallback(
    async (orderId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(orderId);
      const note = window.prompt(
        "Optional resolution note for release (shown in dispute log):",
        ""
      );
      if (note === null) {
        setActionLoading(null);
        return;
      }
      const result = await GD_runEscrowRpc<{ ok: boolean }>(
        supabase,
        "marketplace_admin_set_escrow",
        {
          p_order_id: orderId,
          p_action: "release_to_seller",
          p_note: note.trim() || null,
        },
        "Fund release timed out. Please try again."
      );

      if (result.error) {
        if (GD_isMissingRpcError(result.error)) {
          const fallback = await supabase
            .from("marketplace_orders")
            .update({ escrow_status: "released_to_seller", status: "delivered" })
            .eq("id", orderId);
          setActionLoading(null);
          if (fallback.error) {
            setToast("Unable to release funds.");
            return;
          }
        } else if (
          result.error.toLowerCase().includes("marketplace_admin_set_escrow")
        ) {
          setActionLoading(null);
          setToast(
            "Escrow RPC missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
          );
          return;
        } else {
          setActionLoading(null);
          setToast(result.error);
          return;
        }
      } else {
        setActionLoading(null);
      }
      setToast("Funds released to seller.");
      fetchOrders();
    },
    [supabase, isAdmin, fetchOrders]
  );

  const handleRefundBuyer = useCallback(
    async (orderId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(orderId);
      const note = window.prompt(
        "Reason for refund (saved in dispute log):",
        "Refund approved by admin."
      );
      if (note === null) {
        setActionLoading(null);
        return;
      }

      const result = await GD_runEscrowRpc<{ ok: boolean }>(
        supabase,
        "marketplace_admin_set_escrow",
        {
          p_order_id: orderId,
          p_action: "refund_buyer",
          p_note: note.trim() || "Refund approved by admin.",
        },
        "Refund action timed out. Please try again."
      );

      if (result.error) {
        if (GD_isMissingRpcError(result.error)) {
          const fallback = await supabase
            .from("marketplace_orders")
            .update({ escrow_status: "refunded_to_buyer", status: "refunded" })
            .eq("id", orderId);
          setActionLoading(null);
          if (fallback.error) {
            setToast("Unable to refund buyer.");
            return;
          }
        } else if (
          result.error.toLowerCase().includes("marketplace_admin_set_escrow")
        ) {
          setActionLoading(null);
          setToast(
            "Escrow RPC missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
          );
          return;
        } else {
          setActionLoading(null);
          setToast(result.error);
          return;
        }
      } else {
        setActionLoading(null);
      }

      setToast("Buyer refunded and dispute resolved.");
      fetchOrders();
    },
    [supabase, isAdmin, fetchOrders]
  );

  /* ─── applications fetchers ───────────────────────────────── */
  const fetchApplications = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setAppsLoading(true);
    let query = supabase
      .from("marketplace_seller_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (appsFilter !== "all") query = query.eq("status", appsFilter);

    const { data, error } = await query;
    if (error) {
      setToast("Unable to load seller applications.");
      setAppsLoading(false);
      return;
    }
    setApplications((data ?? []) as SellerApplication[]);
    setAppsLoading(false);
  }, [supabase, isAdmin, appsFilter]);

  const handleApproveApplication = useCallback(
    async (app: SellerApplication) => {
      if (!supabase || !isAdmin || !user) return;
      setActionLoading(app.id);
      // 1. Update application status
      const { error: appError } = await supabase
        .from("marketplace_seller_applications")
        .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", app.id);
      if (appError) { setToast("Unable to approve application."); setActionLoading(null); return; }
      // 2. Promote user role to seller
      const { error: roleError } = await supabase
        .from("marketplace_profiles")
        .update({ role: "seller", store_name: app.store_name, bio: app.bio, location: app.location })
        .eq("id", app.user_id);
      if (roleError) { setToast("Application approved but role update failed."); }
      else { setToast("Seller approved and role updated!"); }
      setActionLoading(null);
      fetchApplications();
    },
    [supabase, isAdmin, user, fetchApplications]
  );

  const handleRejectApplication = useCallback(
    async (appId: string) => {
      if (!supabase || !isAdmin || !user) return;
      setActionLoading(appId);
      const { error } = await supabase
        .from("marketplace_seller_applications")
        .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", appId);
      setActionLoading(null);
      if (error) { setToast("Unable to reject application."); return; }
      setToast("Application rejected.");
      fetchApplications();
    },
    [supabase, isAdmin, user, fetchApplications]
  );

  /* ─── users fetchers ──────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setUsersLoading(true);
    let query = supabase
      .from("marketplace_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersFilter !== "all") query = query.eq("role", usersFilter);

    const { data, error } = await query;
    if (error) {
      setToast("Unable to load users.");
      setUsersLoading(false);
      return;
    }
    setAllUsers((data ?? []) as MarketplaceProfile[]);
    setUsersLoading(false);
  }, [supabase, isAdmin, usersFilter]);

  const handleDemoteUser = useCallback(
    async (userId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(userId);
      const { error } = await supabase
        .from("marketplace_profiles")
        .update({ role: "buyer" })
        .eq("id", userId);
      setActionLoading(null);
      if (error) { setToast("Unable to demote user."); return; }
      setToast("User demoted to buyer.");
      fetchUsers();
    },
    [supabase, isAdmin, fetchUsers]
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(userId);
      // Delete their products first
      await supabase.from("marketplace_items").delete().eq("seller_id", userId);
      // Delete profile
      const { error } = await supabase
        .from("marketplace_profiles")
        .delete()
        .eq("id", userId);
      setActionLoading(null);
      setConfirmDelete(null);
      if (error) { setToast("Unable to delete user."); return; }
      setToast("User and their products deleted.");
      fetchUsers();
    },
    [supabase, isAdmin, fetchUsers]
  );

  /* ─── products fetchers ───────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setProductsLoading(true);
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("id, title, description, price_dzd, image_url, category, seller_id, stock_quantity, wilaya, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setToast("Unable to load products.");
      setProductsLoading(false);
      return;
    }
    setProducts((data ?? []) as AdminItem[]);
    setProductsLoading(false);
  }, [supabase, isAdmin]);

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      if (!supabase || !isAdmin) return;
      setActionLoading(productId);
      const { error } = await supabase
        .from("marketplace_items")
        .delete()
        .eq("id", productId);
      setActionLoading(null);
      setConfirmDeleteProduct(null);
      if (error) { setToast("Unable to delete product."); return; }
      setToast("Product deleted.");
      fetchProducts();
    },
    [supabase, isAdmin, fetchProducts]
  );

  /* ─── fetch on tab/filter change ──────────────────────────── */
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "escrow") fetchOrders();
    if (activeTab === "applications") fetchApplications();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "products") fetchProducts();
  }, [activeTab, isAdmin, fetchOrders, fetchApplications, fetchUsers, fetchProducts]);

  /* ─── auth guards ─────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        </div>
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Please sign in to access the admin dashboard.
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        </div>
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Admin access required. Contact the site administrator.
          </div>
        </div>
      </div>
    );
  }

  /* ─── tabs config ─────────────────────────────────────────── */
  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "applications", label: "Seller Apps", icon: <UserCheck className="h-4 w-4" />, count: applications.filter((a) => a.status === "pending").length },
    { key: "escrow", label: "Escrow", icon: <ShieldCheck className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" />, count: allUsers.length },
    { key: "products", label: "Products", icon: <Package className="h-4 w-4" />, count: products.length },
  ];

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="gd-mp-container relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Admin Dashboard</div>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Marketplace Control Center</h1>
            <p className="mt-1 text-xs text-white/50">{profile?.email}</p>
          </div>
          <Link
            href="/market-place"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Marketplace
          </Link>
        </header>

        {/* Tab Nav */}
        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
              }`}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span className="ml-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold text-emerald-950">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ─── TAB: Seller Applications ───────────────────────── */}
        {activeTab === "applications" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAppsFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    appsFilter === f
                      ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {appsLoading ? (
              <SkeletonCards count={3} />
            ) : applications.length === 0 ? (
              <EmptyState text="No seller applications found." />
            ) : (
              <div className="grid gap-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-200/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{app.store_name}</div>
                        <div className="text-xs text-white/50">
                          {app.full_name ?? "Unknown"} &middot; {app.email ?? "No email"} &middot; {app.phone ?? "No phone"}
                        </div>
                        <div className="text-xs text-white/50">
                          Location: {app.location ?? "N/A"} &middot; Applied {new Date(app.created_at).toLocaleDateString()}
                        </div>
                        {app.bio && (
                          <p className="mt-2 max-w-xl text-xs text-white/60">{app.bio}</p>
                        )}
                        {app.id_file_url && (
                          <a
                            href={app.id_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300 underline"
                          >
                            <FileCheck className="h-3 w-3" /> View ID Document
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={app.status} />
                        {app.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveApplication(app)}
                              disabled={actionLoading === app.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-emerald-950 transition hover:brightness-110 disabled:opacity-60"
                            >
                              <BadgeCheck className="h-3.5 w-3.5" />
                              {actionLoading === app.id ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectApplication(app.id)}
                              disabled={actionLoading === app.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-300/40 bg-red-300/10 px-3 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-300/20 disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {actionLoading === app.id ? "..." : "Reject"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── TAB: Escrow ────────────────────────────────────── */}
        {activeTab === "escrow" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {GD_ESCROW_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEscrowFilter(item.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    escrowFilter === item.value
                      ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <SkeletonCards count={3} />
            ) : orders.length === 0 ? (
              <EmptyState text="No escrow orders found." />
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => {
                  const es = (order.escrow_status ?? "pending_receipt").toLowerCase();
                  const refunded = es === "refunded_to_buyer";
                  return (
                    <div key={order.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-200/30">
                      <div className="flex flex-wrap items-start gap-4">
                        <img
                          src={order.item?.image_url ?? "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"}
                          alt={order.item?.title ?? "Order"}
                          className="h-14 w-18 rounded-2xl object-cover"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="text-sm font-semibold">{order.item?.title ?? "Item"}</div>
                          <div className="text-xs text-white/50">
                            Order {order.id.slice(0, 8).toUpperCase()} &middot; {order.total_price_dzd.toLocaleString()} DZD &middot; Qty {order.quantity}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                            {order.item?.wilaya && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-200" />{GD_formatWilayaLabel(order.item.wilaya)}</span>
                            )}
                            <StatusBadge status={es} />
                            {refunded && (
                              <span className="rounded-full border border-sky-200/40 bg-sky-200/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                                Buyer refunded
                              </span>
                            )}
                          </div>
                          {order.dispute?.reason && (
                            <div className="text-[11px] text-amber-100/90">
                              Dispute reason: {order.dispute.reason}
                            </div>
                          )}
                          {order.dispute?.resolution_note && (
                            <div className="text-[11px] text-white/55">
                              Resolution: {order.dispute.resolution_note}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.buyer_receipt_url && (
                            <a href={order.buyer_receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-emerald-300/40">
                              <FileCheck className="h-3.5 w-3.5" /> Receipt
                            </a>
                          )}
                          {order.seller_shipping_proof && (
                            <a href={order.seller_shipping_proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-emerald-300/40">
                              <Truck className="h-3.5 w-3.5" /> Shipping
                            </a>
                          )}
                          <Link
                            href={`/market-place/orders/${order.id}/receipt`}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-emerald-300/40"
                          >
                            <FileCheck className="h-3.5 w-3.5" /> Receipt PDF
                          </Link>
                          {es === "pending_receipt" && (
                            <button type="button" onClick={() => handleVerifyFunds(order.id)} disabled={actionLoading === order.id || !order.buyer_receipt_url} className="rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-emerald-950 transition hover:brightness-110 disabled:opacity-60">
                              {actionLoading === order.id ? "..." : "Verify Funds"}
                            </button>
                          )}
                          {(es === "funds_held" || es === "disputed") && (
                            <>
                              <button type="button" onClick={() => handleReleaseToSeller(order.id)} disabled={actionLoading === order.id} className="rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-200/20 disabled:opacity-60">
                                {actionLoading === order.id ? "..." : "Release"}
                              </button>
                              <button type="button" onClick={() => handleRefundBuyer(order.id)} disabled={actionLoading === order.id} className="rounded-full border border-sky-200/40 bg-sky-200/10 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-200/20 disabled:opacity-60">
                                {actionLoading === order.id ? "..." : "Refund"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── TAB: Users ─────────────────────────────────────── */}
        {activeTab === "users" && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "buyer", "seller", "admin"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUsersFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    usersFilter === f
                      ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {usersLoading ? (
              <SkeletonCards count={4} />
            ) : allUsers.length === 0 ? (
              <EmptyState text="No users found." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allUsers.map((u) => (
                  <div key={u.id} className="relative rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-200/30">
                    <div className="flex items-start gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200/10 text-xs font-bold text-emerald-200">
                          {(u.username ?? u.email ?? "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold">{u.username ?? "No name"}</div>
                        <div className="truncate text-xs text-white/50">{u.email ?? "No email"}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <RoleBadge role={u.role} />
                          {u.store_name && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                              <ShoppingBag className="mr-1 inline h-2.5 w-2.5" />{u.store_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {u.role !== "admin" && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {u.role === "seller" && (
                          <button
                            type="button"
                            onClick={() => handleDemoteUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-200/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-200/20 disabled:opacity-60"
                          >
                            <UserX className="h-3 w-3" />
                            Demote
                          </button>
                        )}
                        {confirmDelete === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-red-300">Are you sure?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={actionLoading === u.id}
                              className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                            >
                              {actionLoading === u.id ? "..." : "Yes, Delete"}
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/60">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(u.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-300/30 bg-red-300/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-300/20"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── TAB: Products ──────────────────────────────────── */}
        {activeTab === "products" && (
          <section className="space-y-4">
            {productsLoading ? (
              <SkeletonCards count={4} />
            ) : products.length === 0 ? (
              <EmptyState text="No products in the marketplace." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div key={p.id} className="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition hover:border-emerald-200/30">
                    <img
                      src={p.image_url ?? "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"}
                      alt={p.title}
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-4 space-y-1">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="text-xs text-white/50">
                        {p.price_dzd.toLocaleString()} DZD &middot; Stock: {p.stock_quantity} &middot; {p.category ?? "Uncategorized"}
                      </div>
                      <div className="text-xs text-white/40">
                        {GD_formatWilayaLabel(p.wilaya)} &middot; Seller: {p.seller_id.slice(0, 8)}
                      </div>
                      <div className="mt-2">
                        {confirmDeleteProduct === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-red-300">Delete this product?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              disabled={actionLoading === p.id}
                              className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                            >
                              {actionLoading === p.id ? "..." : "Yes"}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteProduct(null)} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/60">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProduct(p.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-300/30 bg-red-300/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-300/20"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete Product
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ───────────────────────────────────────── */
function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skel-${i}`} className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-18 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded-full bg-white/10" />
              <div className="h-3 w-24 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
      {text}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let color = "border-white/10 bg-white/5 text-white/60";
  if (s === "approved" || s === "released_to_seller" || s === "funds_held") color = "border-emerald-200/40 bg-emerald-200/10 text-emerald-200";
  if (s === "pending" || s === "pending_receipt") color = "border-amber-300/40 bg-amber-200/10 text-amber-200";
  if (s === "rejected" || s === "disputed") color = "border-red-300/40 bg-red-200/10 text-red-300";
  if (s === "refunded_to_buyer" || s === "refunded") color = "border-sky-200/40 bg-sky-200/10 text-sky-100";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] font-semibold ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  let color = "border-gray-300/30 bg-gray-200/10 text-gray-300";
  if (role === "seller") color = "border-emerald-200/40 bg-emerald-200/10 text-emerald-200";
  if (role === "admin") color = "border-purple-300/40 bg-purple-200/10 text-purple-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] font-semibold ${color}`}>
      {role}
    </span>
  );
}
