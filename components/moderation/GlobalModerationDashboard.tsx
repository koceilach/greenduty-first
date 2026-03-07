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
  Info as InfoIcon,
  LayoutDashboard,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (["denied", "closed", "dismissed"].includes(status)) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  }
  if (["reviewing", "reviewed"].includes(status)) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-400";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-400";
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
      <section className="rounded-3xl border border-rose-500/20 bg-white/[0.03] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] supports-[backdrop-filter]:backdrop-blur-2xl light:border-rose-300/70 light:bg-rose-50/85 light:shadow-[0_16px_30px_-18px_rgba(15,23,42,0.35)] green:border-rose-400/25 green:bg-rose-500/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-400" />
          <div>
            <h2 className="text-base font-semibold text-white light:text-rose-900 green:text-rose-100">Unable to load moderation data</h2>
            <p className="text-sm text-slate-400 light:text-rose-700 green:text-rose-200/80">{initialError ?? "Unknown error."}</p>
          </div>
        </div>
      </section>
    );
  }

  const busy = (key: string) => isPending && pendingKey === key;

  return (
    <div className="gd-mod-root grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-2xl light:border-slate-300/80 light:bg-white/92 light:shadow-[0_16px_32px_-18px_rgba(15,23,42,0.28)] light:ring-slate-200/90 green:border-emerald-300/20 green:bg-emerald-950/35 green:ring-emerald-200/10">
          {/* Sidebar header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Moderation</p>
              <p className="text-sm font-semibold text-white">Control Panel</p>
            </div>
          </div>

          {/* Role badge */}
          <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Your Role</p>
            <p className="mt-1 text-sm font-bold capitalize text-white">{initialData.actorRole}</p>
          </div>

          {/* Navigation */}
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600">Navigation</p>
          <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const count = tab.key === "seller_demands" ? counts.seller
              : tab.key === "market_disputes" ? counts.disputes
              : tab.key === "education_reports" ? counts.reports
              : null;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.35)] light:shadow-[0_10px_24px_-14px_rgba(5,150,105,0.55)]"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white light:text-slate-600 light:hover:bg-emerald-50 light:hover:text-slate-900 green:text-emerald-100/70 green:hover:bg-emerald-500/12"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{tab.title}</span>
                {count !== null && count > 0 ? (
                  <span className={cn(
                    "min-w-[20px] rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white/[0.06] text-slate-500 light:bg-emerald-100 light:text-emerald-700 green:bg-emerald-500/15 green:text-emerald-100"
                  )}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>

          {/* Security notice */}
          <div className="mt-6 border-t border-white/[0.05] pt-4">
            <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
                <Shield className="h-3 w-3" />
                Security Policy
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Moderators cannot take actions against admin accounts.</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-2xl sm:p-6 light:border-slate-300/80 light:bg-white/92 light:shadow-[0_16px_32px_-18px_rgba(15,23,42,0.26)] light:ring-slate-200/90 green:border-emerald-300/20 green:bg-emerald-950/35 green:ring-emerald-200/10">
        {notice ? (
          <div
            className={cn(
              "mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
              notice.type === "info" && "border-white/[0.06] bg-white/[0.03] text-slate-300",
              notice.type === "success" && "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-400",
              notice.type === "error" && "border-rose-500/15 bg-rose-500/[0.07] text-rose-400"
            )}
          >
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : notice.type === "error" ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <InfoIcon className="h-4 w-4 flex-shrink-0" />}
            {notice.message}
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-950/50 via-[#0c1a2e] to-[#0a1628] p-6 ring-1 ring-inset ring-white/[0.04] light:border-emerald-300/45 light:from-emerald-100 light:via-white light:to-cyan-50 light:ring-emerald-200/40 green:from-emerald-950/70 green:via-[#07201a] green:to-[#092218]">
              {/* Decorative corner glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/[0.08] blur-[60px]" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-teal-500/[0.06] blur-[40px]" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <LayoutDashboard className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/60">Unified Control Center</p>
                </div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">Global Moderation Dashboard</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  Resolve incidents across marketplace and education with protected admin hierarchy.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Seller Demands" value={counts.seller} color="emerald" />
              <Stat label="Market Disputes" value={counts.disputes} color="sky" />
              <Stat label="Education Reports" value={counts.reports} color="amber" />
              <Stat label="Admin Protected" value={counts.protectedTargets} color="violet" />
            </div>

            {initialData.actorRole === "admin" ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 light:border-slate-300/75 light:bg-white/95 green:border-emerald-300/20 green:bg-emerald-950/30">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Shield className="h-4.5 w-4.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Staff Access Manager</p>
                    <p className="text-[11px] text-slate-500">
                      Set a custom password for moderator/admin by email.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(event) => setStaffEmail(event.target.value)}
                    placeholder="staff@email.com"
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500 green:border-emerald-200/20 green:bg-emerald-950/20 green:text-emerald-50 green:placeholder:text-emerald-100/45"
                  />
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(event) => setStaffPassword(event.target.value)}
                    placeholder="New custom password"
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500 green:border-emerald-200/20 green:bg-emerald-950/20 green:text-emerald-50 green:placeholder:text-emerald-100/45"
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
                    className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_-4px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] hover:brightness-110 disabled:opacity-60 disabled:shadow-none"
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
            <div className="flex items-end justify-between border-b border-white/[0.05] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Store className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Seller Demands</h2>
                  <p className="text-[11px] text-slate-500">
                    Review application details, then approve to grant seller access.
                  </p>
                </div>
              </div>
              <span className="hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:inline-block">Pending</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-white/[0.05] bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">User</th>
                      <th className="px-4 py-3.5 font-semibold">Store</th>
                      <th className="px-4 py-3.5 font-semibold">Created</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {initialData.sellerRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <Store className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                          <p className="text-sm font-medium text-slate-500">No pending requests</p>
                          <p className="mt-1 text-xs text-slate-600">New seller applications will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      initialData.sellerRequests.map((row) => {
                        const targetIsAdmin = row.requester?.role === "admin";
                        return (
                          <tr key={row.id} className="align-top transition hover:bg-white/[0.03]">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-white">
                                {row.requester?.fullName ?? row.userId.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate-500">@{row.requester?.username ?? "user"}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-300">{row.requestedStoreName ?? "No name"}</p>
                              <p className="mt-1 text-xs text-slate-500">{row.requestedBio ?? "No bio"}</p>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">{dt(row.createdAt)}</td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-3">
                                {targetIsAdmin ? (
                                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-400">
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
                                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/15 disabled:opacity-60"
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
                                      className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 disabled:opacity-60"
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
            <div className="flex items-end justify-between border-b border-white/[0.05] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                  <ShieldAlert className="h-4.5 w-4.5 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Market Disputes</h2>
                  <p className="text-[11px] text-slate-500">Investigate buyer-seller conflicts and take action.</p>
                </div>
              </div>
              <span className="hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:inline-block">Active</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-white/[0.05] bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Case</th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                      <th className="px-4 py-3.5 font-semibold">Opened</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {initialData.marketDisputes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                          <p className="text-sm font-medium text-slate-500">No active disputes</p>
                          <p className="mt-1 text-xs text-slate-600">All marketplace conflicts have been resolved.</p>
                        </td>
                      </tr>
                    ) : (
                      initialData.marketDisputes.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-white">{row.product?.title ?? "Unknown product"}</p>
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
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white light:border-slate-300/80 light:text-slate-700 light:hover:border-emerald-400/50 light:hover:bg-emerald-50 light:hover:text-slate-900 green:border-emerald-200/20 green:text-emerald-100/80 green:hover:border-emerald-300/35 green:hover:bg-emerald-500/12"
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
            <div className="flex items-end justify-between border-b border-white/[0.05] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                  <GraduationCap className="h-4.5 w-4.5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Education Reports</h2>
                  <p className="text-[11px] text-slate-500">Review reported content for community safety.</p>
                </div>
              </div>
              <span className="hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:inline-block">Review</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-white/[0.05] bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Reason</th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                      <th className="px-4 py-3.5 font-semibold">Opened</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {initialData.eduReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <GraduationCap className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                          <p className="text-sm font-medium text-slate-500">No active reports</p>
                          <p className="mt-1 text-xs text-slate-600">The education platform is clear.</p>
                        </td>
                      </tr>
                    ) : (
                      initialData.eduReports.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-white">{row.reason}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {row.contentKind === "reel" ? "Reel" : "Post"} report
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {row.details ??
                                (row.contentKind === "reel"
                                  ? row.reel?.caption || "Reported reel"
                                  : "No details")}
                            </p>
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
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white light:border-slate-300/80 light:text-slate-700 light:hover:border-emerald-400/50 light:hover:bg-emerald-50 light:hover:text-slate-900 green:border-emerald-200/20 green:text-emerald-100/80 green:hover:border-emerald-300/35 green:hover:bg-emerald-500/12"
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
        <DialogContent className="gd-mod-dialog max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a1222]/97 p-0 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-2xl light:border-slate-300/80 light:bg-white/95 light:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.35)] light:ring-slate-200/90 green:border-emerald-300/20 green:bg-[#0a2019]/96 green:ring-emerald-200/10">
          {selectedDispute ? (
            <div className="space-y-5 p-6">
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15">
                    <ShieldAlert className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-400/70">Market Dispute</span>
                </div>
                <DialogTitle className="pr-10 text-xl font-bold text-white">
                  {selectedDispute.product?.title ?? "Unknown product"}
                </DialogTitle>
                <DialogDescription>{selectedDispute.reason}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Buyer" value={selectedDispute.buyer?.username ?? "Unknown"} />
                <Info label="Seller" value={selectedDispute.seller?.username ?? "Unknown"} />
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Complaint</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{selectedDispute.description}</p>
              </div>

              {selectedDispute.evidenceUrl ? (
                <img
                  src={selectedDispute.evidenceUrl}
                  alt="Dispute evidence"
                  className="max-h-72 w-full rounded-2xl border border-white/[0.06] object-cover"
                />
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-slate-500">
                  No evidence image.
                </div>
              )}

              <textarea
                value={disputeNotes}
                onChange={(event) => setDisputeNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/15 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500 green:border-emerald-200/20 green:bg-emerald-950/20 green:text-emerald-50 green:placeholder:text-emerald-100/45"
                placeholder="Internal notes"
              />

              {selectedDispute.seller?.role === "admin" || selectedDispute.buyer?.role === "admin" ? (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-400">
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
        <DialogContent className="gd-mod-dialog max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a1222]/97 p-0 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/[0.04] supports-[backdrop-filter]:backdrop-blur-2xl light:border-slate-300/80 light:bg-white/95 light:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.35)] light:ring-slate-200/90 green:border-emerald-300/20 green:bg-[#0a2019]/96 green:ring-emerald-200/10">
          {selectedReport ? (
            <div className="space-y-5 p-6">
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/70">
                    Education {selectedReport.contentKind === "reel" ? "Reel" : "Post"} Report
                  </span>
                </div>
                <DialogTitle className="pr-10 text-xl font-bold text-white">
                  {selectedReport.reason}
                </DialogTitle>
                <DialogDescription>{dt(selectedReport.createdAt)}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Reporter" value={selectedReport.reporter?.username ?? "Unknown"} />
                <Info label="Author" value={selectedReport.postAuthor?.username ?? "Unknown"} />
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-slate-300">
                {selectedReport.details ?? "No report details."}
              </div>
              {selectedReport.contentKind === "post" ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">
                    {selectedReport.post?.title ?? "Untitled post"}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {selectedReport.post?.body ?? "No post body"}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">
                    {selectedReport.reel?.caption || "Untitled reel"}
                  </p>
                  {selectedReport.reel?.videoUrl ? (
                    <video
                      src={selectedReport.reel.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="mt-2.5 max-h-64 w-full rounded-xl border border-white/[0.06] bg-black object-contain"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-500">No reel media found.</p>
                  )}
                </div>
              )}

              <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Author Reels
                </p>
                {selectedReport.reels.length > 0 ? (
                  selectedReport.reels.map((reel) => (
                    <div
                      key={reel.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 disabled:opacity-60"
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
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/15 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500 green:border-emerald-200/20 green:bg-emerald-950/20 green:text-emerald-50 green:placeholder:text-emerald-100/45"
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
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-60 light:border-slate-300/80 light:bg-white light:text-slate-900 green:border-emerald-200/20 green:bg-emerald-950/20 green:text-emerald-50"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      {day} day{day > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReport.postAuthor?.role === "admin" ? (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-400">
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
                      () =>
                        updateEduReportStatus(
                          selectedReport.id,
                          "reviewed",
                          reportNotes,
                          selectedReport.contentKind
                        ),
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
                      () =>
                        updateEduReportStatus(
                          selectedReport.id,
                          "action_taken",
                          reportNotes,
                          selectedReport.contentKind
                        ),
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
                      () =>
                        updateEduReportStatus(
                          selectedReport.id,
                          "dismissed",
                          reportNotes,
                          selectedReport.contentKind
                        ),
                      "Report dismissed."
                    )
                  }
                  label="Dismiss"
                />
                <ActionButton
                  busy={busy(`edu:${selectedReport.id}:delete_content`)}
                  disabled={
                    selectedReport.postAuthor?.role === "admin" ||
                    (selectedReport.contentKind === "post" && !selectedReport.postId) ||
                    (selectedReport.contentKind === "reel" && !selectedReport.reelId)
                  }
                  onClick={() =>
                    runAction(
                      `edu:${selectedReport.id}:delete_content`,
                      () =>
                        selectedReport.contentKind === "reel"
                          ? deleteEducationReel(selectedReport.reelId as string)
                          : deleteEducationPost(selectedReport.postId as string),
                      selectedReport.contentKind === "reel"
                        ? "Reported reel deleted."
                        : "Reported post deleted."
                    )
                  }
                  label={selectedReport.contentKind === "reel" ? "Delete Reel" : "Delete Post"}
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
          <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.04] px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-violet-400">
              <Shield className="h-3.5 w-3.5" />
              Moderator Mode
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Admin accounts are protected targets and cannot be actioned.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: "emerald" | "sky" | "amber" | "violet" }) {
  const colorMap = {
    emerald: { bar: "from-emerald-500 via-emerald-500/40", dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]", text: "text-emerald-400" },
    sky: { bar: "from-sky-500 via-sky-500/40", dot: "bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.5)]", text: "text-sky-400" },
    amber: { bar: "from-amber-500 via-amber-500/40", dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]", text: "text-amber-400" },
    violet: { bar: "from-violet-500 via-violet-500/40", dot: "bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]", text: "text-violet-400" },
  };
  const c = colorMap[color];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.04] light:border-slate-300/80 light:bg-white light:hover:border-emerald-300/65 light:hover:bg-emerald-50/70 green:border-emerald-200/20 green:bg-emerald-950/28 green:hover:border-emerald-300/35 green:hover:bg-emerald-500/10">
      <div className={cn("pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b to-transparent", c.bar)} />
      <div className="flex items-center gap-2">
        <div className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <p className={cn("mt-2.5 text-3xl font-bold", c.text)}>{value.toLocaleString()}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5 light:border-slate-300/80 light:bg-white green:border-emerald-200/20 green:bg-emerald-950/28">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
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
          ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15"
          : "border-white/[0.08] bg-white/[0.05] text-slate-300 hover:bg-white/[0.08] hover:text-white light:border-slate-300/80 light:bg-white light:text-slate-700 light:hover:border-emerald-400/45 light:hover:bg-emerald-50 light:hover:text-slate-900 green:border-emerald-200/20 green:bg-emerald-950/25 green:text-emerald-100/80 green:hover:border-emerald-300/35 green:hover:bg-emerald-500/12"
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {busy ? "..." : label}
    </button>
  );
}
