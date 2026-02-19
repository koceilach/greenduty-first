"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

type ReceiptOrder = {
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
  buyer_first_name?: string | null;
  buyer_last_name?: string | null;
  buyer_phone?: string | null;
  delivery_address?: string | null;
  delivery_location?: string | null;
  delivery_fee_dzd?: number | null;
  item: {
    id: string;
    title: string;
    price_dzd: number;
    wilaya: string | null;
    seller_id: string;
  } | null;
};

type SellerProfile = {
  id: string;
  username?: string | null;
  email?: string | null;
  store_name?: string | null;
  location?: string | null;
};

const GD_ESCROW_LABELS: Record<string, string> = {
  pending_receipt: "Pending Receipt Verification",
  funds_held: "Funds Held In Escrow",
  disputed: "Disputed",
  released_to_seller: "Released To Seller",
  refunded_to_buyer: "Refunded To Buyer",
};

export default function MarketplaceOrderReceiptPage() {
  const { supabase, user, loading: authLoading } = useMarketplaceAuth();
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [order, setOrder] = useState<ReceiptOrder | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptPageUrl, setReceiptPageUrl] = useState("");

  const fetchReceipt = useCallback(async () => {
    if (!supabase || !user || !orderId) return;
    setLoading(true);
    setError(null);

    const { data, error: orderError } = await supabase
      .from("marketplace_orders")
      .select(
        "id, buyer_id, quantity, total_price_dzd, status, escrow_status, buyer_confirmation, buyer_receipt_url, seller_shipping_proof, created_at, buyer_first_name, buyer_last_name, buyer_phone, delivery_address, delivery_location, delivery_fee_dzd, marketplace_items ( id, title, price_dzd, wilaya, seller_id )"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      setError(orderError.message || "Unable to load order receipt.");
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Order not found.");
      setLoading(false);
      return;
    }

    const normalized: ReceiptOrder = {
      id: data.id,
      buyer_id: data.buyer_id,
      quantity: data.quantity,
      total_price_dzd: data.total_price_dzd,
      status: data.status,
      escrow_status: (data as any).escrow_status ?? "pending_receipt",
      buyer_confirmation: (data as any).buyer_confirmation ?? false,
      buyer_receipt_url: (data as any).buyer_receipt_url ?? null,
      seller_shipping_proof: (data as any).seller_shipping_proof ?? null,
      created_at: data.created_at,
      buyer_first_name: (data as any).buyer_first_name ?? null,
      buyer_last_name: (data as any).buyer_last_name ?? null,
      buyer_phone: (data as any).buyer_phone ?? null,
      delivery_address: (data as any).delivery_address ?? null,
      delivery_location: (data as any).delivery_location ?? null,
      delivery_fee_dzd: (data as any).delivery_fee_dzd ?? 0,
      item: (data as any).marketplace_items ?? null,
    };

    setOrder(normalized);

    const sellerId = normalized.item?.seller_id;
    if (sellerId) {
      const { data: sellerData } = await supabase
        .from("marketplace_profiles")
        .select("id, username, email, store_name, location")
        .eq("id", sellerId)
        .maybeSingle();
      setSeller((sellerData as SellerProfile | null) ?? null);
    } else {
      setSeller(null);
    }

    setLoading(false);
  }, [supabase, user, orderId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchReceipt();
  }, [authLoading, user, fetchReceipt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReceiptPageUrl(window.location.href);
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);

  const buyerName = useMemo(() => {
    if (!order) return "Buyer";
    const fullName = `${order.buyer_first_name ?? ""} ${
      order.buyer_last_name ?? ""
    }`.trim();
    return fullName || "Buyer";
  }, [order]);

  const receiptData = useMemo(() => {
    if (!order) return null;
    const fee = typeof order.delivery_fee_dzd === "number" ? order.delivery_fee_dzd : 0;
    const unitPrice = order.item?.price_dzd ?? 0;
    const subtotal = unitPrice > 0 ? unitPrice * Math.max(order.quantity, 1) : Math.max(order.total_price_dzd - fee, 0);
    const total = order.total_price_dzd ?? subtotal + fee;
    return {
      invoiceNo: `GD-${order.id.slice(0, 8).toUpperCase()}`,
      fee,
      unitPrice,
      subtotal,
      total,
      escrowLabel:
        GD_ESCROW_LABELS[(order.escrow_status ?? "pending_receipt").toLowerCase()] ??
        (order.escrow_status ?? "pending_receipt"),
    };
  }, [order]);

  const qrPayload = useMemo(() => {
    if (!order || !receiptData) return "";
    const targetUrl =
      receiptPageUrl || `/market-place/orders/${order.id}/receipt`;
    return [
      "GreenDutyReceipt",
      `invoice:${receiptData.invoiceNo}`,
      `order:${order.id}`,
      `date:${order.created_at}`,
      `total_dzd:${receiptData.total}`,
      `escrow:${order.escrow_status ?? "pending_receipt"}`,
      `buyer:${buyerName}`,
      `seller:${seller?.store_name || seller?.username || "seller"}`,
      `verify_url:${targetUrl}`,
    ].join("|");
  }, [order, receiptData, receiptPageUrl, buyerName, seller?.store_name, seller?.username]);

  const qrImageUrl = useMemo(() => {
    if (!qrPayload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
      qrPayload
    )}`;
  }, [qrPayload]);

  if (authLoading || loading) {
    return (
      <div className="gd-mp-shell gd-mp-receipt-shell min-h-screen bg-slate-100 p-6">
        <div className="gd-mp-container mx-auto max-w-4xl animate-pulse rounded-2xl border border-slate-200 bg-white p-8">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="mt-6 h-4 w-64 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-52 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-mp-shell gd-mp-receipt-shell min-h-screen bg-slate-100 p-6">
        <div className="gd-mp-container mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Please sign in to view this receipt.
        </div>
      </div>
    );
  }

  if (error || !order || !receiptData) {
    return (
      <div className="gd-mp-shell gd-mp-receipt-shell min-h-screen bg-slate-100 p-6">
        <div className="gd-mp-container mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {error ?? "Receipt not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="gd-mp-shell gd-mp-receipt-shell min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="gd-mp-container mx-auto max-w-4xl space-y-4">
        <div className="gd-receipt-actions flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/market-place/orders"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Orders
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Save As PDF
            </button>
          </div>
        </div>

        <article className="gd-receipt-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <FileText className="h-3.5 w-3.5" />
                GreenDuty Receipt
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">
                Order Invoice
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="text-right text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Invoice No:</span>{" "}
                  {receiptData.invoiceNo}
                </div>
                <div>
                  <span className="font-semibold">Order ID:</span>{" "}
                  {order.id.slice(0, 8).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold">Order Date:</span>{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold">Escrow:</span>{" "}
                  {receiptData.escrowLabel}
                </div>
              </div>
              {qrImageUrl && (
                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                  <img
                    src={qrImageUrl}
                    alt={`QR verification code for invoice ${receiptData.invoiceNo}`}
                    className="h-[110px] w-[110px] object-contain md:h-[120px] md:w-[120px]"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    Verify Receipt
                  </div>
                </div>
              )}
            </div>
          </header>

          <section className="grid gap-4 border-b border-slate-200 py-6 md:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Buyer
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {buyerName}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {order.delivery_address ?? "No address provided"}
              </p>
              <p className="text-sm text-slate-600">
                {order.delivery_location ?? "No delivery location provided"}
              </p>
              <p className="text-sm text-slate-600">
                Phone: {order.buyer_phone ?? "No phone provided"}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Seller
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {seller?.store_name || seller?.username || "Seller"}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {seller?.email ?? "No email available"}
              </p>
              <p className="text-sm text-slate-600">
                {seller?.location || order.item?.wilaya || "Algeria"}
              </p>
            </div>
          </section>

          <section className="border-b border-slate-200 py-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Item Details
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      {order.item?.title ?? "Marketplace item"}
                    </td>
                    <td className="px-4 py-3">{order.quantity}</td>
                    <td className="px-4 py-3">
                      {receiptData.unitPrice.toLocaleString()} DZD
                    </td>
                    <td className="px-4 py-3">
                      {receiptData.subtotal.toLocaleString()} DZD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 py-6 md:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Workflow Proofs
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>
                  Buyer Payment Receipt:{" "}
                  {order.buyer_receipt_url ? "Uploaded" : "Not uploaded"}
                </div>
                <div>
                  Seller Shipping Proof:{" "}
                  {order.seller_shipping_proof ? "Uploaded" : "Not uploaded"}
                </div>
                <div>
                  Buyer Confirmation:{" "}
                  {order.buyer_confirmation ? "Confirmed" : "Pending"}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Items Subtotal</span>
                <span>{receiptData.subtotal.toLocaleString()} DZD</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                <span>Delivery Fee</span>
                <span>{receiptData.fee.toLocaleString()} DZD</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{receiptData.total.toLocaleString()} DZD</span>
              </div>
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-5 text-xs text-slate-500">
            This document is generated by GreenDuty Marketplace and can be used
            for order tracking, dispute handling, and admin escrow review.
          </footer>
        </article>
      </div>

      <style jsx global>{`
        @media print {
          .gd-receipt-actions {
            display: none !important;
          }
          .gd-receipt-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          body {
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}
