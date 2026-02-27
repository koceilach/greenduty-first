import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MarketplaceProductFallbackPage() {
  return (
    <div className="gd-mp-sub gd-mp-shell flex min-h-screen items-center justify-center bg-[#0b2b25] px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-300/10 text-emerald-100">
          <Search className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold sm:text-2xl">Listing link is missing</h1>
        <p className="mt-3 text-sm text-white/70 sm:text-base">
          Open a product or pet card again from the marketplace to view full details.
        </p>
        <Link
          href="/market-place"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-300/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
