"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  MapPin,
  PackagePlus,
  ShieldCheck,
  Truck,
  Trash2,
  Upload,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
import {
  GD_isMissingRpcError,
  GD_runEscrowRpc,
} from "@/lib/marketplace/escrow-client";
import { GD_findOrCreateMarketplaceDirectConversation } from "@/lib/marketplace/messages/direct-conversation";
import { GD_WILAYAS } from "@/lib/wilayas";

type VendorItem = {
  id: string;
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
};

type SellerOrder = {
  id: string;
  buyer_id: string;
  buyer_first_name?: string | null;
  buyer_last_name?: string | null;
  buyer_phone?: string | null;
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

const GD_VENDOR_WILAYAS = GD_WILAYAS;

const GD_VENDOR_TYPES = [
  "Vegetables",
  "Fruits",
  "Herbs",
  "Grains",
  "Flowers",
];

const GD_formatWilayaLabel = (value?: string | null) => {
  if (!value) return "Algeria";
  return value === "All Wilayas" ? "All Algeria" : value;
};

const GD_phoneHref = (phone?: string | null) => {
  if (!phone) return null;
  const sanitized = phone.replace(/[^\d+]/g, "");
  return sanitized.length > 0 ? `tel:${sanitized}` : null;
};

export default function VendorStudioPage() {
  const { supabase, user, profile } = useMarketplaceAuth();
  const router = useRouter();
  const [items, setItems] = useState<VendorItem[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);
  const [messageOrderId, setMessageOrderId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    category: "Seeds",
    plantType: "Vegetables",
    wilaya: "Algiers",
    latitude: "",
    longitude: "",
  });

  const isSeller = profile?.role === "seller";

  const resetForm = useCallback(() => {
    setForm({
      title: "",
      description: "",
      price: "",
      stock: "",
      category: "Seeds",
      plantType: "Vegetables",
      wilaya: "Algiers",
      latitude: "",
      longitude: "",
    });
    setImageFile(null);
    setImagePreview(null);
  }, []);

  const fetchItems = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setToast("Unable to load your items.");
      setLoading(false);
      return;
    }
    setItems((data ?? []) as VendorItem[]);
    setLoading(false);
  }, [supabase, user]);

  const fetchOrders = useCallback(async () => {
    if (!supabase || !user) return;
    setOrdersLoading(true);
    const queryWithDisputes =
      "id, buyer_id, buyer_first_name, buyer_last_name, buyer_phone, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya, seller_id ), marketplace_disputes ( id, reason, status, resolution_action, resolution_note, updated_at )";
    const queryWithoutDisputes =
      "id, buyer_id, buyer_first_name, buyer_last_name, buyer_phone, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya, seller_id )";

    let queryResult: { data: any[] | null; error: { message?: string } | null } =
      await supabase
      .from("marketplace_orders")
      .select(queryWithDisputes)
      .eq("marketplace_items.seller_id", user.id)
      .order("created_at", { ascending: false });
    let data = queryResult.data;
    let error = queryResult.error;

    if (
      error &&
      (error.message ?? "").toLowerCase().includes("marketplace_disputes")
    ) {
      const fallback = await supabase
        .from("marketplace_orders")
        .select(queryWithoutDisputes)
        .eq("marketplace_items.seller_id", user.id)
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

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
      } else if (message.toLowerCase().includes("buyer_phone")) {
        setToast(
          "Buyer phone column is missing. Run migration 20260219212000_marketplace_order_buyer_phone.sql in Supabase."
        );
      } else if (message.toLowerCase().includes("marketplace_disputes")) {
        setToast(
          "Disputes table is missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
        );
      } else {
        setToast("Unable to load escrow orders.");
      }
      setOrdersLoading(false);
      return;
    }

    const normalized =
      (data ?? []).map((row) => ({
        id: row.id,
        buyer_id: row.buyer_id,
        buyer_first_name: (row as any).buyer_first_name ?? null,
        buyer_last_name: (row as any).buyer_last_name ?? null,
        buyer_phone: (row as any).buyer_phone ?? null,
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
      })) ?? [];

    setOrders(normalized);
    setOrdersLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchItems();
    fetchOrders();
  }, [fetchItems, fetchOrders]);

  useEffect(() => {
    if (!supabase || !user || !isSeller) return;

    const isSellerOrder = async (orderId: string) => {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .select("id, marketplace_items!inner ( seller_id )")
        .eq("id", orderId)
        .eq("marketplace_items.seller_id", user.id)
        .maybeSingle();
      return !error && Boolean(data);
    };

    const channel = supabase
      .channel(`marketplace-seller-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_orders" },
        async (payload) => {
          const incoming = (payload.new ?? null) as { id?: string } | null;
          const orderId = incoming?.id;
          if (!orderId || !(await isSellerOrder(orderId))) return;
          setToast("New order received. It now appears in Escrow Orders.");
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketplace_orders" },
        async (payload) => {
          const incoming = (payload.new ?? null) as {
            id?: string;
            escrow_status?: string | null;
          } | null;
          const previous = (payload.old ?? null) as {
            escrow_status?: string | null;
          } | null;
          const orderId = incoming?.id;
          if (!orderId) return;

          const before = (previous?.escrow_status ?? "").toLowerCase();
          const after = (incoming?.escrow_status ?? "").toLowerCase();
          if (before === "funds_held" || after !== "funds_held") return;
          if (!(await isSellerOrder(orderId))) return;

          setToast("Payment secured. Order is now safe to ship.");
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, isSeller, supabase, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    },
    []
  );

  const uploadImage = useCallback(async () => {
    if (!supabase || !user || !imageFile) return null;
    const extension = imageFile.name.split(".").pop() ?? "jpg";
    const filePath = `marketplace/${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, imageFile, {
        contentType: imageFile.type || "image/jpeg",
        upsert: true,
      });
    if (error) {
      setToast("Image upload failed.");
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data?.publicUrl ?? null;
  }, [supabase, user, imageFile]);

  const uploadShippingProof = useCallback(
    async (orderId: string, file: File) => {
      if (!supabase || !user) return null;
      const extension = file.name.split(".").pop() ?? "jpg";
      const filePath = `escrow/shipping/${user.id}/${orderId}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
      if (error) {
        setToast("Shipping proof upload failed.");
        return null;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    },
    [supabase, user]
  );

  const handleSubmit = useCallback(async () => {
    if (!supabase || !user) {
      setToast("Please sign in to list items.");
      return;
    }
    if (!isSeller) {
      setToast("Switch to seller role to list items.");
      return;
    }
    if (!form.title.trim() || !form.price || !form.stock) {
      setToast("Fill in the required fields.");
      return;
    }
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setToast("Add valid latitude and longitude for map sync.");
      return;
    }

    setSubmitting(true);
    const imageUrl = await uploadImage();

    const { error } = await supabase.from("marketplace_items").insert([
      {
        seller_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price_dzd: Number(form.price),
        stock_quantity: Number(form.stock),
        category: form.category.trim(),
        plant_type: form.plantType,
        wilaya: form.wilaya,
        image_url: imageUrl,
        latitude,
        longitude,
      },
    ]);

    if (error) {
      setToast(`Listing failed: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setToast("Item listed successfully.");
    resetForm();
    fetchItems();
    setSubmitting(false);
  }, [supabase, user, isSeller, form, uploadImage, resetForm, fetchItems]);

  const handleMarkShipped = useCallback(
    async (orderId: string, file?: File) => {
      if (!supabase || !user) return;
      if (!file) {
        setToast("Add shipping proof before marking as shipped.");
        return;
      }
      setReceiptUploading(orderId);
      const proofUrl = await uploadShippingProof(orderId, file);
      if (!proofUrl) {
        setReceiptUploading(null);
        return;
      }

      const result = await GD_runEscrowRpc<{ ok: boolean }>(
        supabase,
        "marketplace_mark_order_shipped",
        {
          p_order_id: orderId,
          p_shipping_proof_url: proofUrl,
        },
        "Shipment update timed out. Please try again."
      );

      if (result.error) {
        if (GD_isMissingRpcError(result.error)) {
          const fallback = await supabase
            .from("marketplace_orders")
            .update({
              seller_shipping_proof: proofUrl,
              status: "shipped",
            })
            .eq("id", orderId);
          if (fallback.error) {
            const fallbackMessage = fallback.error.message ?? "";
            if (
              fallbackMessage.toLowerCase().includes("seller_shipping_proof") ||
              fallbackMessage.toLowerCase().includes("escrow_status")
            ) {
              setToast(
                "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
              );
            } else {
              setToast("Unable to mark as shipped right now.");
            }
            setReceiptUploading(null);
            return;
          }
        } else if (
          result.error.toLowerCase().includes("marketplace_mark_order_shipped")
        ) {
          setToast(
            "Escrow RPC missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
          );
          setReceiptUploading(null);
          return;
        } else {
          setToast(result.error);
          setReceiptUploading(null);
          return;
        }
      }

      setToast("Marked as shipped. Buyer notified.");
      setReceiptUploading(null);
      fetchOrders();
    },
    [supabase, user, uploadShippingProof, fetchOrders]
  );

  const handleOpenDispute = useCallback(
    async (orderId: string) => {
      if (!supabase || !user) return;
      const reason = window.prompt(
        "What is the issue with this order? (optional)",
        ""
      );
      if (reason === null) return;
      setDisputeOrder(orderId);
      const result = await GD_runEscrowRpc<{ ok: boolean }>(
        supabase,
        "marketplace_open_dispute",
        {
          p_order_id: orderId,
          p_reason: reason.trim() || null,
        },
        "Dispute request timed out. Please try again."
      );

      if (result.error) {
        if (GD_isMissingRpcError(result.error)) {
          const fallback = await supabase
            .from("marketplace_orders")
            .update({
              escrow_status: "disputed",
              status: "disputed",
            })
            .eq("id", orderId);
          if (fallback.error) {
            const fallbackMessage = fallback.error.message ?? "";
            if (fallbackMessage.toLowerCase().includes("escrow_status")) {
              setToast(
                "Escrow columns are missing. Run migration 20260206193000_marketplace_escrow.sql in Supabase."
              );
            } else {
              setToast("Unable to open dispute right now.");
            }
            setDisputeOrder(null);
            return;
          }
        } else if (
          result.error.toLowerCase().includes("marketplace_open_dispute")
        ) {
          setToast(
            "Dispute RPC missing. Run migration 20260219113000_marketplace_disputes_workflow.sql in Supabase."
          );
          setDisputeOrder(null);
          return;
        } else {
          setToast(result.error);
          setDisputeOrder(null);
          return;
        }
      }

      setToast("Dispute opened. Admin notified.");
      setDisputeOrder(null);
      fetchOrders();
    },
    [supabase, user, fetchOrders]
  );

  const handleMessageBuyer = useCallback(
    async (
      orderId: string,
      buyerId?: string | null,
      item?: {
        id: string;
        title: string;
        image_url: string | null;
        price_dzd: number;
        wilaya: string | null;
      } | null
    ) => {
      if (!supabase || !user) {
        setToast("Please sign in to message the buyer.");
        return;
      }
      if (!buyerId) {
        setToast("Buyer chat is unavailable for this order.");
        return;
      }

      setMessageOrderId(orderId);
      const result = await GD_findOrCreateMarketplaceDirectConversation(
        supabase,
        user.id,
        buyerId,
        {
          itemId: item?.id ?? null,
          itemTitle: item?.title ?? null,
          itemImageUrl: item?.image_url ?? null,
          itemPriceDzd:
            typeof item?.price_dzd === "number" ? item.price_dzd : null,
        }
      );
      setMessageOrderId(null);

      if (!result.conversationId) {
        setToast(result.error ?? "Unable to open chat right now.");
        return;
      }

      router.push(`/market-place/messages/${result.conversationId}`);
    },
    [supabase, user, router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { error } = await supabase
        .from("marketplace_items")
        .delete()
        .eq("id", id);
      if (error) {
        setToast("Unable to delete item.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setToast("Item removed.");
    },
    [supabase]
  );

  const totalInventory = useMemo(
    () => items.reduce((sum, item) => sum + (item.stock_quantity ?? 0), 0),
    [items]
  );

  if (!isSeller) {
    return (
      <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="gd-mp-container relative z-10 mx-auto max-w-3xl space-y-6 px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                <PackagePlus className="h-6 w-6" />
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Vendor Studio</h1>
            <p className="mt-2 text-sm text-white/60">
              Apply to become a seller to list products and manage inventory.
            </p>
            <Link
              href="/market-place/seller-onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950"
            >
              Apply to Become a Seller
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-mp-sub gd-mp-shell relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="gd-mp-container relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Vendor Studio
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              Manage your listings
            </h1>
            <p className="mt-2 text-sm text-white/60">
              List new items, track stock, and sync locations to the map.
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
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              Total inventory:{" "}
              <span className="text-emerald-200">{totalInventory}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <PackagePlus className="h-5 w-5 text-emerald-200" />
            List New Item
          </div>
          <div className="mt-6 grid gap-4">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Item title"
              className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Item description"
              rows={3}
              className="w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 py-3 text-sm text-white"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: event.target.value }))
                }
                placeholder="Price (DZD)"
                type="number"
                className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
              />
              <input
                value={form.stock}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, stock: event.target.value }))
                }
                placeholder="Stock quantity"
                type="number"
                className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={form.plantType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, plantType: event.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
              >
                {GD_VENDOR_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <div className="space-y-2">
                <select
                  value={form.wilaya}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      wilaya: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
                >
                  {GD_VENDOR_WILAYAS.map((option) => (
                    <option key={option} value={option}>
                      {option === "All Wilayas" ? "All Algeria" : option}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/50">
                  Choose "All Algeria" to deliver nationwide.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.latitude}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, latitude: event.target.value }))
                }
                placeholder="Latitude"
                className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
              />
              <input
                value={form.longitude}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, longitude: event.target.value }))
                }
                placeholder="Longitude"
                className="h-11 w-full rounded-2xl border border-emerald-200/20 bg-emerald-900/40 px-4 text-sm text-white"
              />
            </div>
            <div className="rounded-2xl border border-dashed border-emerald-200/30 bg-emerald-900/30 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-xs text-white/70">
                <ImagePlus className="h-4 w-4 text-emerald-200" />
                Upload product image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-3 h-28 w-full rounded-xl object-cover"
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-110 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {submitting ? "Listing..." : "List Item"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Your Listings</div>
            <span className="text-xs text-white/60">{items.length} items</span>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-xs text-white/50">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                No listings yet. Add your first item.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs text-white/60">
                        {item.plant_type ?? item.category ?? "Plant"} -{" "}
                        {GD_formatWilayaLabel(item.wilaya)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/40 bg-red-400/10 text-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                    <span className="text-emerald-200">
                      {item.price_dzd.toLocaleString()} DZD
                    </span>
                    <span>Stock: {item.stock_quantity}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.latitude?.toFixed(2)}, {item.longitude?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Escrow Orders
            </div>
            <h2 className="mt-2 text-lg font-semibold">
              Safe-to-ship marketplace orders
            </h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
            {orders.length} orders
          </div>
        </div>

        {ordersLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`seller-order-skeleton-${index}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-20 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            No escrow orders yet. New purchases will appear here.
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const escrowStatus =
                (order.escrow_status ?? "pending_receipt").toLowerCase();
              const fundsHeld = escrowStatus === "funds_held";
              const disputed = escrowStatus === "disputed";
              const released = escrowStatus === "released_to_seller";
              const refunded = escrowStatus === "refunded_to_buyer";
              const shipped =
                order.status === "shipped" || order.status === "delivered";
              const buyerName = `${order.buyer_first_name ?? ""} ${
                order.buyer_last_name ?? ""
              }`.trim();
              const buyerPhone = order.buyer_phone?.trim() ?? "";
              const buyerPhoneHref = GD_phoneHref(buyerPhone);
              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition hover:border-emerald-200/30 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
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
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                          <span>{buyerName || "Buyer"}</span>
                          <span className="text-white/40">•</span>
                          <span>
                            {buyerPhone || "No phone provided"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <span>Qty {order.quantity}</span>
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

                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      {fundsHeld && !disputed && !shipped && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Safe to Ship
                        </span>
                      )}
                      {shipped && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/30 bg-sky-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                          <Truck className="h-3.5 w-3.5" />
                          Shipped
                        </span>
                      )}
                      {released && (
                        <span className="rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                          Released
                        </span>
                      )}
                      {refunded && (
                        <span className="rounded-full border border-sky-200/40 bg-sky-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                          Refunded
                        </span>
                      )}
                      {disputed && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                          Disputed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <button
                      type="button"
                      onClick={() =>
                        handleMessageBuyer(order.id, order.buyer_id, order.item)
                      }
                      disabled={messageOrderId === order.id}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-emerald-300/40 hover:text-white disabled:opacity-60"
                    >
                      {messageOrderId === order.id
                        ? "Opening chat..."
                        : "Message buyer"}
                    </button>
                    {buyerPhoneHref ? (
                      <a
                        href={buyerPhoneHref}
                        className="rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-200/20"
                      >
                        Call buyer
                      </a>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/50">
                        Buyer phone unavailable
                      </span>
                    )}
                    {!released && !refunded && (
                      <button
                        type="button"
                        onClick={() => handleOpenDispute(order.id)}
                        disabled={disputeOrder === order.id}
                        className="rounded-full border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-200/20 disabled:opacity-60"
                      >
                        {disputeOrder === order.id ? "Opening..." : "Open Dispute"}
                      </button>
                    )}

                    {fundsHeld && !shipped && !disputed && (
                      <span className="rounded-full border border-sky-200/30 bg-sky-200/10 px-3 py-2 text-[11px] text-sky-100">
                        Upload shipping proof for admin + buyer, then mark as
                        shipped.
                      </span>
                    )}

                    {fundsHeld && !shipped && !disputed && (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-200/20">
                        {receiptUploading === order.id
                          ? "Uploading..."
                          : "Mark as Shipped"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleMarkShipped(order.id, file);
                          }}
                        />
                      </label>
                    )}

                    {order.seller_shipping_proof && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                        Shipping proof uploaded
                      </span>
                    )}
                    <Link
                      href={`/market-place/orders/${order.id}/receipt`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:border-emerald-300/40 hover:text-white"
                    >
                      Receipt PDF
                    </Link>

                    {order.dispute?.reason && disputed && (
                      <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-[11px] text-amber-100">
                        Reason: {order.dispute.reason}
                      </span>
                    )}
                    {order.dispute?.resolution_note &&
                      order.dispute.status === "resolved" && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                          Resolution: {order.dispute.resolution_note}
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
  );
}
