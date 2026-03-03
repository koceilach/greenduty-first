"use client";

import { useMemo, useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Film,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Shield,
  ShieldAlert,
  Store,
  Trash2,
} from "lucide-react";
import {
  banEducationUserForDays,
  deleteEducationPost,
  deleteEducationReel,
  deleteMarketplaceProduct,
  handleSellerRequest,
  setStaffPasswordByEmail,
  takeActionOnUser,
  updateEduReportStatus,
  updateMarketDisputeStatus,
} from "@/actions/moderation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  EduPostReportRow,
  EduReportStatus,
  MarketDisputeRow,
  MarketDisputeStatus,
  ModerationActionResult,
  ModerationDashboardPayload,
} from "@/lib/moderation/types";

type TabKey = "overview" | "seller_demands" | "market_disputes" | "education_reports";

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

const tabs: Array<{ key: TabKey; title: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "overview", title: "Overview", icon: LayoutDashboard },
  { key: "seller_demands", title: "Seller Demands", icon: Store },
  { key: "market_disputes", title: "Market Disputes", icon: ShieldAlert },
  { key: "education_reports", title: "Education Reports", icon: GraduationCap },
];

const dt = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
};

const statusClass = (status: string) => {
  if (["approved", "resolved", "action_taken"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["denied", "closed", "dismissed"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["reviewing", "reviewed"].includes(status)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export default function GlobalModerationDashboard({
  initialData,
  initialError,
}: {
  initialData: ModerationDashboardPayload | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedDispute, setSelectedDispute] = useState<MarketDisputeRow | null>(null);
  const [selectedReport, setSelectedReport] = useState<EduPostReportRow | null>(null);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [eduBanDays, setEduBanDays] = useState<number>(1);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(
    initialError
      ? { type: "error", message: initialError }
      : { type: "info", message: "Moderation dashboard synced." }
  );
  const [isPending, startTransition] = useTransition();

  const runAction = (
    key: string,
    task: () => Promise<ModerationActionResult>,
    successMessage: string
  ) => {
    setPendingKey(key);
    startTransition(async () => {
      try {
        const result = await task();
        if (!result.ok) {
          setNotice({ type: "error", message: result.error ?? "Action failed." });
          return;
        }
        setNotice({ type: "success", message: successMessage });
        router.refresh();
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Action failed.",
        });
      } finally {
        setPendingKey(null);
      }
    });
  };

  const counts = useMemo(() => {
    if (!initialData) {
      return { seller: 0, disputes: 0, reports: 0, protectedTargets: 0 };
    }
    const protectedTargets =
      initialData.sellerRequests.filter((x) => x.requester?.role === "admin").length +
      initialData.marketDisputes.filter(
        (x) => x.seller?.role === "admin" || x.buyer?.role === "admin"
      ).length +
      initialData.eduReports.filter((x) => x.postAuthor?.role === "admin").length;

    return {
      seller: initialData.sellerRequests.length,
      disputes: initialData.marketDisputes.length,
      reports: initialData.eduReports.length,
      protectedTargets,
    };
  }, [initialData]);

  if (!initialData) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-white/90 p-5 shadow-lg supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Unable to load moderation data</h2>
            <p className="text-sm text-slate-600">{initialError ?? "Unknown error."}</p>
          </div>
        </div>
      </section>
    );
  }

  const busy = (key: string) => isPending && pendingKey === key;

  return (
    <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] supports-[backdrop-filter]:bg-white/65 supports-[backdrop-filter]:backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Global Moderation
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">Role: {initialData.actorRole}</p>

          <div className="mt-6 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition",
                  active
                    ? "bg-slate-900 text-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.8)]"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.title}
              </button>
            );
          })}
          </div>

          <div className="mt-7 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">Security Policy</p>
            <p className="mt-2">Moderators cannot take actions against admin accounts.</p>
          </div>
        </div>
      </aside>

      <section className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] supports-[backdrop-filter]:bg-white/65 supports-[backdrop-filter]:backdrop-blur-xl sm:p-6">
        {notice ? (
          <div
            className={cn(
              "mb-6 rounded-2xl border px-4 py-2.5 text-sm",
              notice.type === "info" && "border-slate-200/90 bg-slate-50/80 text-slate-700",
              notice.type === "success" && "border-emerald-200/90 bg-emerald-50/80 text-emerald-700",
              notice.type === "error" && "border-rose-200/90 bg-rose-50/80 text-rose-700"
            )}
          >
            {notice.message}
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 text-white">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Unified control center</p>
              <h2 className="mt-1.5 text-xl font-semibold sm:text-2xl">Global Moderation Dashboard</h2>
              <p className="mt-1.5 max-w-2xl text-sm text-white/75">
                Resolve incidents across marketplace and education with protected admin hierarchy.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Seller Demands" value={counts.seller} />
              <Stat label="Market Disputes" value={counts.disputes} />
              <Stat label="Education Reports" value={counts.reports} />
              <Stat label="Admin Protected" value={counts.protectedTargets} />
            </div>

            {initialData.actorRole === "admin" ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900">Staff Access Password Manager</p>
                  <p className="text-xs text-slate-500">
                    Set a custom password for moderator/admin by email.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(event) => setStaffEmail(event.target.value)}
                    placeholder="staff@email.com"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(event) => setStaffPassword(event.target.value)}
                    placeholder="New custom password"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      runAction(
                        "staff:set-password",
                        async () => {
                          const result = await setStaffPasswordByEmail(staffEmail, staffPassword);
                          if (result.ok) {
                            setStaffPassword("");
                          }
                          return result;
                        },
                        "Staff password updated."
                      )
                    }
                    disabled={busy("staff:set-password")}
                    className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busy("staff:set-password") ? "Setting..." : "Set Password"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "seller_demands" ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Seller Demands</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review application details, then approve to grant seller access.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pending approvals</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Store</th>
                      <th className="px-4 py-3.5">Created</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialData.sellerRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No pending requests.
                        </td>
                      </tr>
                    ) : (
                      initialData.sellerRequests.map((row) => {
                        const targetIsAdmin = row.requester?.role === "admin";
                        return (
                          <tr key={row.id} className="align-top transition hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {row.requester?.fullName ?? row.userId.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate-500">@{row.requester?.username ?? "user"}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium">{row.requestedStoreName ?? "No name"}</p>
                              <p className="mt-1 text-xs text-slate-500">{row.requestedBio ?? "No bio"}</p>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">{dt(row.createdAt)}</td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-3">
                                {targetIsAdmin ? (
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                    Admin protected
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        runAction(
                                          `seller:${row.id}:approved`,
                                          () => handleSellerRequest(row.id, "approved"),
                                          "Seller request approved."
                                        )
                                      }
                                      disabled={busy(`seller:${row.id}:approved`)}
                                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                      {busy(`seller:${row.id}:approved`) ? "..." : "Verify & Approve"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        runAction(
                                          `seller:${row.id}:denied`,
                                          () => handleSellerRequest(row.id, "denied"),
                                          "Seller request denied."
                                        )
                                      }
                                      disabled={busy(`seller:${row.id}:denied`)}
                                      className="rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                    >
                                      {busy(`seller:${row.id}:denied`) ? "..." : "Deny"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "market_disputes" ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">Market Disputes</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active investigations</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Case</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Opened</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialData.marketDisputes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No active disputes.
                        </td>
                      </tr>
                    ) : (
                      initialData.marketDisputes.map((row) => (
                        <tr key={row.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">{row.product?.title ?? "Unknown product"}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase", statusClass(row.status))}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500">{dt(row.createdAt)}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setDisputeNotes(row.adminNotes ?? "");
                                setSelectedDispute(row);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "education_reports" ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">Education Reports</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Community safety review</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Opened</th>
                      <th className="px-4 py-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialData.eduReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No active reports.
                        </td>
                      </tr>
                    ) : (
                      initialData.eduReports.map((row) => (
                        <tr key={row.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">{row.reason}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.details ?? "No details"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase", statusClass(row.status))}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500">{dt(row.createdAt)}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setReportNotes(row.actionNote ?? "");
                                setEduBanDays(1);
                                setSelectedReport(row);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={Boolean(selectedDispute)} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white/95 p-0 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl">
          {selectedDispute ? (
            <div className="space-y-5 p-6">
              <DialogHeader>
                <DialogTitle className="pr-10 text-xl text-slate-900">
                  Market Dispute: {selectedDispute.product?.title ?? "Unknown product"}
                </DialogTitle>
                <DialogDescription>{selectedDispute.reason}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Buyer" value={selectedDispute.buyer?.username ?? "Unknown"} />
                <Info label="Seller" value={selectedDispute.seller?.username ?? "Unknown"} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Complaint</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{selectedDispute.description}</p>
              </div>

              {selectedDispute.evidenceUrl ? (
                <img
                  src={selectedDispute.evidenceUrl}
                  alt="Dispute evidence"
                  className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No evidence image.
                </div>
              )}

              <textarea
                value={disputeNotes}
                onChange={(event) => setDisputeNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Internal notes"
              />

              {selectedDispute.seller?.role === "admin" || selectedDispute.buyer?.role === "admin" ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  Admin target detected. Action buttons are disabled.
                </div>
              ) : null}

              <DialogFooter className="flex flex-wrap justify-start gap-3 pt-1">
                <ActionButton
                  busy={busy(`dispute:${selectedDispute.id}:reviewing`)}
                  disabled={selectedDispute.seller?.role === "admin" || selectedDispute.buyer?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `dispute:${selectedDispute.id}:reviewing`,
                      () => updateMarketDisputeStatus(selectedDispute.id, "reviewing", disputeNotes),
                      "Dispute moved to reviewing."
                    )
                  }
                  label="Mark Reviewing"
                />
                <ActionButton
                  busy={busy(`dispute:${selectedDispute.id}:resolved`)}
                  disabled={selectedDispute.seller?.role === "admin" || selectedDispute.buyer?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `dispute:${selectedDispute.id}:resolved`,
                      () => updateMarketDisputeStatus(selectedDispute.id, "resolved", disputeNotes),
                      "Dispute resolved."
                    )
                  }
                  label="Mark Resolved"
                />
                <ActionButton
                  busy={busy(`dispute:${selectedDispute.id}:closed`)}
                  disabled={selectedDispute.seller?.role === "admin" || selectedDispute.buyer?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `dispute:${selectedDispute.id}:closed`,
                      () => updateMarketDisputeStatus(selectedDispute.id, "closed", disputeNotes),
                      "Dispute closed."
                    )
                  }
                  label="Close"
                />
                <ActionButton
                  busy={busy(`dispute:${selectedDispute.id}:ban_seller`)}
                  disabled={selectedDispute.seller?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `dispute:${selectedDispute.id}:ban_seller`,
                      () => takeActionOnUser(selectedDispute.sellerId, "ban_seller"),
                      "Seller banned from selling."
                    )
                  }
                  label="Ban Seller"
                  tone="danger"
                  icon={Ban}
                />
                <ActionButton
                  busy={busy(`dispute:${selectedDispute.id}:delete_product`)}
                  disabled={!selectedDispute.productId || selectedDispute.seller?.role === "admin"}
                  onClick={() =>
                    selectedDispute.productId
                      ? runAction(
                          `dispute:${selectedDispute.id}:delete_product`,
                          () => deleteMarketplaceProduct(selectedDispute.productId as string),
                          "Product removed from marketplace."
                        )
                      : null
                  }
                  label="Delete Product"
                  tone="danger"
                  icon={Trash2}
                />
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white/95 p-0 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl">
          {selectedReport ? (
            <div className="space-y-5 p-6">
              <DialogHeader>
                <DialogTitle className="pr-10 text-xl text-slate-900">
                  Education Report: {selectedReport.reason}
                </DialogTitle>
                <DialogDescription>{dt(selectedReport.createdAt)}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Reporter" value={selectedReport.reporter?.username ?? "Unknown"} />
                <Info label="Author" value={selectedReport.postAuthor?.username ?? "Unknown"} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
                {selectedReport.details ?? "No report details."}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{selectedReport.post?.title ?? "Untitled post"}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{selectedReport.post?.body ?? "No post body"}</p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Author Reels
                </p>
                {selectedReport.reels.length > 0 ? (
                  selectedReport.reels.map((reel) => (
                    <div
                      key={reel.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {reel.caption || "Untitled reel"}
                        </p>
                        <p className="text-xs text-slate-500">{dt(reel.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busy(`edu:${selectedReport.id}:delete_reel:${reel.id}`) || selectedReport.postAuthor?.role === "admin"}
                        onClick={() =>
                          runAction(
                            `edu:${selectedReport.id}:delete_reel:${reel.id}`,
                            () => deleteEducationReel(reel.id),
                            "Reel deleted."
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        <Film className="h-3.5 w-3.5" />
                        {busy(`edu:${selectedReport.id}:delete_reel:${reel.id}`) ? "..." : "Delete Reel"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No reels found for this author.</p>
                )}
              </div>

              <textarea
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Internal notes"
              />

              <div className="max-w-xs space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Education Ban Duration
                </p>
                <select
                  value={String(eduBanDays)}
                  onChange={(event) => setEduBanDays(Number(event.target.value))}
                  disabled={selectedReport.postAuthor?.role === "admin"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      {day} day{day > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReport.postAuthor?.role === "admin" ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  Admin target detected. Action buttons are disabled.
                </div>
              ) : null}

              <DialogFooter className="flex flex-wrap justify-start gap-3 pt-1">
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:reviewed`)}
                  disabled={selectedReport.postAuthor?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `edu:${selectedReport.id}:reviewed`,
                      () => updateEduReportStatus(selectedReport.id, "reviewed", reportNotes),
                      "Report marked as reviewed."
                    )
                  }
                  label="Mark Reviewed"
                />
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:action_taken`)}
                  disabled={selectedReport.postAuthor?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `edu:${selectedReport.id}:action_taken`,
                      () => updateEduReportStatus(selectedReport.id, "action_taken", reportNotes),
                      "Report marked action taken."
                    )
                  }
                  label="Action Taken"
                />
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:dismissed`)}
                  disabled={selectedReport.postAuthor?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `edu:${selectedReport.id}:dismissed`,
                      () => updateEduReportStatus(selectedReport.id, "dismissed", reportNotes),
                      "Report dismissed."
                    )
                  }
                  label="Dismiss"
                />
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:delete_post`)}
                  disabled={selectedReport.postAuthor?.role === "admin"}
                  onClick={() =>
                    runAction(
                      `edu:${selectedReport.id}:delete_post`,
                      () => deleteEducationPost(selectedReport.postId),
                      "Reported post deleted."
                    )
                  }
                  label="Delete Post"
                  icon={Trash2}
                />
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:ban_user_${eduBanDays}`)}
                  disabled={!selectedReport.postAuthorId || selectedReport.postAuthor?.role === "admin"}
                  onClick={() =>
                    selectedReport.postAuthorId
                      ? runAction(
                          `edu:${selectedReport.id}:ban_user_${eduBanDays}`,
                          () =>
                            banEducationUserForDays(
                              selectedReport.postAuthorId as string,
                              eduBanDays,
                              reportNotes
                            ),
                          `Education ban applied for ${eduBanDays} day${eduBanDays > 1 ? "s" : ""}.`
                        )
                      : null
                  }
                  label={`Ban ${eduBanDays} Day${eduBanDays > 1 ? "s" : ""}`}
                  tone="danger"
                  icon={Ban}
                />
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {initialData.actorRole !== "admin" ? (
        <div className="xl:col-span-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700">
            <Shield className="h-3.5 w-3.5" />
            Moderator mode: admin accounts are protected targets.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white px-4 py-3.5">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-slate-900 via-slate-600 to-transparent" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  busy,
  disabled,
  tone = "default",
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  busy: boolean;
  disabled: boolean;
  tone?: "default" | "danger";
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition disabled:opacity-60",
        tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200/80"
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {busy ? "..." : label}
    </button>
  );
}
