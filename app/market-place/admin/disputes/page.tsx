import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminDisputes } from "@/actions/disputes";
import AdminDisputesDashboard from "@/components/marketplace/AdminDisputesDashboard";

export default async function MarketplaceAdminDisputesPage() {
  const result = await getAdminDisputes();

  return (
    <div className="gd-mp-sub gd-mp-shell min-h-screen bg-[#041b17] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/market-place/admin"
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80 transition hover:text-emerald-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Hub
        </Link>

        <AdminDisputesDashboard
          initialDisputes={result.disputes}
          initialError={result.ok ? null : result.error}
        />
      </div>
    </div>
  );
}
