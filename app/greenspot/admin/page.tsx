"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, XCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { greenspotClient } from "@/lib/supabase/client";
import { useGreenspotProfile } from "@/lib/greenspot/use-greenspot-profile";

type VerificationStatus = "pending" | "approved" | "rejected";

type VerificationRequestRow = {
  id: string;
  user_id: string;
  type: "student" | "researcher" | string;
  status: VerificationStatus;
  document_url?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  profile?: {
    id: string;
    email?: string | null;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    verification_status?: string | null;
    verification_type?: string | null;
    account_tier?: string | null;
  } | null;
};

const statusPill = (status: VerificationStatus) => {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  if (status === "rejected") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  return "bg-amber-500/15 text-amber-200 border-amber-500/30";
};

const formatDate = (value: string) => new Date(value).toLocaleString();

export default function GreenSpotAdminVerificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile: greenspotProfile, loading: profileLoading } = useGreenspotProfile(user);
  const [requests, setRequests] = useState<VerificationRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<VerificationStatus | "all">("pending");

  const isAdmin = greenspotProfile?.role === "admin";

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/greenspot/login?redirect=/greenspot/admin");
    }
  }, [authLoading, user, router]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((row) => row.status === filter);
  }, [requests, filter]);

  const fetchRequests = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);

    const { data, error } = await greenspotClient
      .from("verification_requests")
      .select("id, user_id, type, status, document_url, created_at, reviewed_at")
      .order("created_at", { ascending: false });

    if (error) {
      setToast(error.message ?? "Unable to load verification requests.");
      setLoading(false);
      return;
    }

    const list = (data ?? []) as VerificationRequestRow[];
    const ids = Array.from(new Set(list.map((row) => row.user_id)));

    if (ids.length === 0) {
      setRequests(list);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await greenspotClient
      .from("greenspot_profiles")
      .select("id, email, username, full_name, avatar_url, verification_status, verification_type, account_tier")
      .in("id", ids);

    if (profileError) {
      setToast(profileError.message ?? "Unable to load GreenSpot profiles.");
      setRequests(list);
      setLoading(false);
      return;
    }

    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    setRequests(
      list.map((row) => ({
        ...row,
        profile: profileMap.get(row.user_id) ?? null,
      }))
    );
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleDecision = useCallback(
    async (request: VerificationRequestRow, decision: VerificationStatus) => {
      if (!user || !isAdmin) return;
      setActionLoading(request.id);

      const { error: requestError } = await greenspotClient
        .from("verification_requests")
        .update({ status: decision, reviewed_at: new Date().toISOString() })
        .eq("id", request.id);

      if (requestError) {
        setToast(requestError.message ?? "Unable to update request.");
        setActionLoading(null);
        return;
      }

      const nextTier =
        decision === "approved"
          ? request.type === "researcher"
            ? "impact"
            : "pro"
          : undefined;

      const { error: profileError } = await greenspotClient
        .from("greenspot_profiles")
        .update({
          verification_status: decision,
          verification_type: request.type,
          ...(nextTier ? { account_tier: nextTier } : {}),
        })
        .eq("id", request.user_id);

      if (profileError) {
        setToast(profileError.message ?? "Unable to update profile.");
        setActionLoading(null);
        return;
      }

      setToast(decision === "approved" ? "Verification approved." : "Verification rejected.");
      setActionLoading(null);
      fetchRequests();
    },
    [user, isAdmin, fetchRequests]
  );

  if (!user) {
    return (
      <main className="min-h-screen gd-page-bg--flat text-white">
        <Navbar />
        <section className="pt-28 pb-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              Please sign in to access the admin dashboard.
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (!profileLoading && !isAdmin) {
    return (
      <main className="min-h-screen gd-page-bg--flat text-white">
        <Navbar />
        <section className="pt-28 pb-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              Admin access required.
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen gd-page-bg--flat text-white">
      <Navbar />
      <section className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  GreenSpot Admin
                </div>
                <h1 className="mt-2 text-2xl font-semibold">Verification Requests</h1>
                <p className="mt-2 text-sm text-white/60">
                  Approve or reject academic verification submissions.
                </p>
              </div>
              <Link
                href="/greenspot"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-200/20"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to GreenSpot
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {["pending", "approved", "rejected", "all"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as VerificationStatus | "all")}
                  className={`rounded-full border px-3 py-1 transition ${
                    filter === value
                      ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-300/40"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </header>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              Loading verification requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No verification requests found.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => {
                const fullName =
                  request.profile?.full_name ||
                  request.profile?.username ||
                  request.profile?.email ||
                  request.user_id.slice(0, 8);
                return (
                  <div
                    key={request.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-emerald-200/60">
                          {request.type}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold">{fullName}</h3>
                        <p className="mt-1 text-xs text-white/50">User {request.user_id}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusPill(request.status)}`}>
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
                      <span>Submitted {formatDate(request.created_at)}</span>
                      {request.reviewed_at && <span>Reviewed {formatDate(request.reviewed_at)}</span>}
                      {request.document_url && (
                        <a
                          href={request.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300/40"
                        >
                          View document
                        </a>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button
                        className="bg-emerald-500 text-black hover:bg-emerald-400"
                        onClick={() => handleDecision(request, "approved")}
                        disabled={request.status === "approved" || actionLoading === request.id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="border-rose-400/40 text-rose-200 hover:bg-rose-500/10"
                        onClick={() => handleDecision(request, "rejected")}
                        disabled={request.status === "rejected" || actionLoading === request.id}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      {request.status === "pending" && (
                        <span className="inline-flex items-center gap-2 text-xs text-amber-200">
                          <ShieldCheck className="h-4 w-4" />
                          Awaiting review
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-full border border-white/10 bg-emerald-950/80 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      <Footer />
    </main>
  );
}
