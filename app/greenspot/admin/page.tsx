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

type AuditLogRow = {
  id: number;
  action: string;
  reason?: string | null;
  target_type: string;
  target_id: string;
  target_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

const statusPill = (status: VerificationStatus) => {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  if (status === "rejected") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  return "bg-amber-500/15 text-amber-200 border-amber-500/30";
};

const formatDate = (value: string) => new Date(value).toLocaleString();

const isAbsoluteHttpUrl = (value: string) =>
  /^https?:\/\//i.test(value.trim());

const resolveVerificationObjectPath = (value: string) => {
  const raw = value.trim();
  if (!raw) return null;
  if (!isAbsoluteHttpUrl(raw)) {
    return raw.replace(/^greenspot-verification\//i, "");
  }
  try {
    const parsed = new URL(raw);
    const publicPrefix = "/storage/v1/object/public/greenspot-verification/";
    const signedPrefix = "/storage/v1/object/sign/greenspot-verification/";
    if (parsed.pathname.includes(publicPrefix)) {
      return decodeURIComponent(parsed.pathname.split(publicPrefix)[1] ?? "");
    }
    if (parsed.pathname.includes(signedPrefix)) {
      return decodeURIComponent(parsed.pathname.split(signedPrefix)[1] ?? "");
    }
  } catch {}
  return null;
};

export default function GreenSpotAdminVerificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile: greenspotProfile, loading: profileLoading } = useGreenspotProfile(user);
  const [requests, setRequests] = useState<VerificationRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<VerificationStatus | "all">("pending");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

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

  const fetchAuditRows = useCallback(async () => {
    if (!user || !isAdmin) return;
    setAuditLoading(true);
    const { data, error } = await greenspotClient
      .from("admin_audit_log")
      .select("id, action, reason, target_type, target_id, target_user_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      setToast(error.message ?? "Unable to load admin audit history.");
      setAuditLoading(false);
      return;
    }

    setAuditRows((data ?? []) as AuditLogRow[]);
    setAuditLoading(false);
  }, [user, isAdmin]);

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
    fetchAuditRows();
  }, [fetchAuditRows]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleDecision = useCallback(
    async (request: VerificationRequestRow, decision: VerificationStatus) => {
      if (!user || !isAdmin) return;
      setActionLoading(request.id);
      const reason = (decisionReasons[request.id] ?? "").trim();

      const withReason = await greenspotClient.rpc(
        "admin_review_verification_request_with_reason",
        {
          p_request_id: request.id,
          p_decision: decision,
          p_reason: reason.length > 0 ? reason : null,
        }
      );

      let decisionError = withReason.error;
      if (
        decisionError &&
        /function .* does not exist|schema cache/i.test(decisionError.message)
      ) {
        const fallback = await greenspotClient.rpc(
          "admin_review_verification_request",
          {
            p_request_id: request.id,
            p_decision: decision,
          }
        );
        decisionError = fallback.error;
      }

      if (decisionError) {
        setToast(decisionError.message ?? "Unable to update verification request.");
        setActionLoading(null);
        return;
      }

      setDecisionReasons((prev) => ({ ...prev, [request.id]: "" }));
      setToast(decision === "approved" ? "Verification approved." : "Verification rejected.");
      setActionLoading(null);
      fetchRequests();
      fetchAuditRows();
    },
    [user, isAdmin, fetchRequests, fetchAuditRows, decisionReasons]
  );

  const openDocument = useCallback(async (documentRef?: string | null) => {
    if (!documentRef) return;

    const raw = documentRef.trim();
    if (!raw) return;

    if (
      isAbsoluteHttpUrl(raw) &&
      !raw.includes("/storage/v1/object/public/greenspot-verification/") &&
      !raw.includes("/storage/v1/object/sign/greenspot-verification/")
    ) {
      setToast("Unsupported document reference. Re-upload through verification flow.");
      return;
    }

    const objectPath = resolveVerificationObjectPath(raw);
    if (!objectPath) {
      setToast("Unable to resolve document path.");
      return;
    }

    const { data, error } = await greenspotClient.storage
      .from("greenspot-verification")
      .createSignedUrl(objectPath, 60 * 5);

    if (error || !data?.signedUrl) {
      setToast(error?.message ?? "Unable to open document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, []);

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
                        <button
                          type="button"
                          onClick={() => void openDocument(request.document_url)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300/40"
                        >
                          View document
                        </button>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {request.status === "pending" ? (
                        <div className="w-full">
                          <label className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-white/50">
                            Decision Reason (audit log)
                          </label>
                          <textarea
                            value={decisionReasons[request.id] ?? ""}
                            onChange={(event) =>
                              setDecisionReasons((prev) => ({
                                ...prev,
                                [request.id]: event.target.value,
                              }))
                            }
                            rows={2}
                            maxLength={280}
                            placeholder="Optional reason shown in action history..."
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/40"
                          />
                        </div>
                      ) : null}

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

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/60">
                  Audit
                </p>
                <h2 className="mt-2 text-lg font-semibold">Admin Action History</h2>
                <p className="mt-1 text-xs text-white/60">
                  Verification actions, reasons, and targets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchAuditRows()}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:border-emerald-300/40"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {auditLoading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                  Loading audit events...
                </div>
              ) : auditRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                  No audit events yet.
                </div>
              ) : (
                auditRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-emerald-200">{row.action}</span>
                      <span className="text-white/50">{formatDate(row.created_at)}</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      Target: {row.target_type} ({row.target_id})
                    </p>
                    {row.reason ? (
                      <p className="mt-1 text-white/80">Reason: {row.reason}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
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
