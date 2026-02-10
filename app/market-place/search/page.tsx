"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Search,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useMarketplaceAuth } from "@/components/marketplace-auth-provider";

type MarketplaceItem = {
  id: string;
  title: string | null;
  description: string | null;
  price_dzd: number | null;
  image_url: string | null;
  stock_quantity: number | null;
  plant_type: string | null;
  category: string | null;
  wilaya: string | null;
};

const GD_formatWilayaLabel = (value?: string | null) => {
  if (!value) return "Algeria";
  return value === "All Wilayas" ? "All Algeria" : value;
};

export default function MarketplaceSearchPage() {
  const { supabase, profile } = useMarketplaceAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = useMemo(() => rawQuery.trim(), [rawQuery]);
  const [queryInput, setQueryInput] = useState(query);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeller = profile?.role === "seller";

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  const fetchItems = useCallback(async () => {
    if (!supabase) return;
    if (!query) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("marketplace_items")
      .select("*")
      .ilike("title", query)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Unable to load search results.");
      setLoading(false);
      return;
    }

    setItems((data ?? []) as MarketplaceItem[]);
    setLoading(false);
  }, [supabase, query]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextQuery = queryInput.trim();
      if (!nextQuery) return;
      router.push(`/market-place/search?q=${encodeURIComponent(nextQuery)}`);
    },
    [queryInput, router]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b2b25] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <section className="gd-search-hero rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-950/70 via-emerald-950/40 to-slate-950/60 p-6 shadow-[0_20px_55px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/market-place"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
                aria-label="Back to marketplace"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">
                  Marketplace Search
                </div>
                <h1 className="mt-2 text-2xl font-semibold">
                  Results for "{query || "..."}"
                </h1>
                <p className="mt-2 text-xs text-white/60">
                  Exact-name search across all live marketplace listings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
              <span className="text-emerald-200">
                {query ? items.length : 0} results
              </span>
              <span>{isSeller ? "Seller mode" : "Buyer mode"}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Exact name match
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Live inventory only
            </span>
            <span className="rounded-full border border-emerald-200/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
              Updated in real time
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)] md:grid-cols-[1fr_auto_auto]"
          >
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <div className="gd-search-icon flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/60">
                  <Search className="h-4 w-4" />
                </div>
              </div>
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search product name..."
                className="gd-search-input h-12 w-full rounded-full border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white placeholder:text-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-emerald-300/40 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-full bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 shadow-[0_12px_30px_rgba(16,185,129,0.45)] transition hover:brightness-110"
            >
              Search
            </button>
            <Link
              href="/market-place"
              className="flex h-12 items-center justify-center rounded-full border border-emerald-200/40 bg-emerald-200/10 px-6 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/20"
            >
              Browse all
            </Link>
          </form>
        </section>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`search-skeleton-${index}`}
                className="h-64 rounded-3xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-300/30 bg-amber-200/10 p-6 text-sm text-amber-100">
            {error}
          </div>
        ) : !query ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            Type a product name to search the marketplace.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            No products found with the exact name "{query}".
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-emerald-300/50"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={
                      item.image_url ??
                      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={item.title ?? "Marketplace item"}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    {item.stock_quantity && item.stock_quantity > 0
                      ? "In Stock"
                      : "Out of Stock"}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                    {item.plant_type ?? item.category ?? "Seeds"}
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.title ?? "Marketplace Item"}
                  </h3>
                  <p className="text-xs text-white/60 line-clamp-2">
                    {item.description?.trim() ||
                      "Fresh marketplace listing from a verified seller."}
                  </p>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span className="font-semibold text-emerald-200">
                      {typeof item.price_dzd === "number"
                        ? `${item.price_dzd.toLocaleString()} DZD`
                        : "Price on request"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {GD_formatWilayaLabel(item.wilaya)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/market-place/product/${item.id}`)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-200/20"
                    >
                      View details
                      {isSeller ? (
                        <ShoppingBag className="h-3 w-3" />
                      ) : (
                        <ShoppingCart className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
