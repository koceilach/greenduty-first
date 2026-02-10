"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImagePlus,
  MapPin,
  PackagePlus,
  ShieldCheck,
  Truck,
  Trash2,
  Upload,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";
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

export default function VendorStudioPage() {
  const { supabase, user, profile, updateRole } = useMarketplaceAuth();
  const [items, setItems] = useState<VendorItem[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<string | null>(null);
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
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select(
        "id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, marketplace_items ( id, title, image_url, price_dzd, wilaya, seller_id )"
      )
      .eq("marketplace_items.seller_id", user.id)
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
        setToast("Unable to load escrow orders.");
      }
      setOrdersLoading(false);
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
    setOrdersLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchItems();
    fetchOrders();
  }, [fetchItems, fetchOrders]);

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
      const { error } = await supabase
        .from("marketplace_orders")
        .update({
          seller_shipping_proof: proofUrl,
          status: "shipped",
        })
        .eq("id", orderId);

      if (error) {
        const message = error.message ?? "";
        if (
          message.toLowerCase().includes("seller_shipping_proof") ||
          message.toLowerCase().includes("escrow_status")
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

      setToast("Marked as shipped. Buyer notified.");
      setReceiptUploading(null);
      fetchOrders();
    },
    [supabase, user, uploadShippingProof, fetchOrders]
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
        .eq("id", orderId);

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
      <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl space-y-6 px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                <PackagePlus className="h-6 w-6" />
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Vendor Studio</h1>
            <p className="mt-2 text-sm text-white/60">
              Upgrade to Seller to list products and manage inventory.
            </p>
            <button
              type="button"
              onClick={() => updateRole("seller")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950"
            >
              Become a Seller
            </button>
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
              Vendor Studio
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              Manage your listings
            </h1>
            <p className="mt-2 text-sm text-white/60">
              List new items, track stock, and sync locations to the map.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
            Total inventory:{" "}
            <span className="text-emerald-200">{totalInventory}</span>
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
              const shipped =
                order.status === "shipped" || order.status === "delivered";
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
                      {disputed && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-200/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                          Disputed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/60">
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
