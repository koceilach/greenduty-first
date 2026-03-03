"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  FileWarning,
  Loader2,
  MessageSquareText,
  Shield,
  XCircle,
} from "lucide-react";
import {
  banSellerFromDispute,
  resolveDispute,
} from "@/actions/disputes";
import type { AdminDisputeRow, DisputeStatus } from "@/lib/marketplace/disputes";
import { cn } from "@/lib/utils";

type AdminDisputesDashboardProps = {
  initialDisputes: AdminDisputeRow[];
  initialError?: string | null;
};

type Notice = {
  type: "idle" | "error" | "success";
  message: string;
} | null;

const KANBAN_COLUMNS: Array<{ title: string; statuses: DisputeStatus[] }> = [
  { title: "Pending", statuses: ["pending"] },
  { title: "Reviewing", statuses: ["reviewing"] },
  { title: "Resolved", statuses: ["resolved"] },
  { title: "Closed", statuses: ["closed"] },
];

export default function AdminDisputesDashboard({
  initialDisputes,
  initialError,
}: AdminDisputesDashboardProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(
    initialError
      ? { type: "error", message: initialError }
      : { type: "idle", message: "Control room synced." }
  );
  const [isTransitioning, startTransition] = useTransition();

  const disputesByColumn = useMemo(() => {
    const grouped = new Map<string, AdminDisputeRow[]>();
    for (const column of KANBAN_COLUMNS) {
      grouped.set(
        column.title,
        initialDisputes.filter((item) => column.statuses.includes(item.status))
      );
    }
    return grouped;
  }, [initialDisputes]);

  const setAdminNote = (disputeId: string, value: string) => {
    setNotesById((prev) => ({ ...prev, [disputeId]: value }));
  };

  const runStatusAction = (
    disputeId: string,
    status: DisputeStatus,
    fallbackNote: string
  ) => {
    const candidate = notesById[disputeId] ?? "";
    const nextNote = candidate.trim() || fallbackNote;
    setPendingAction(`${disputeId}:${status}`);

    startTransition(async () => {
      const result = await resolveDispute(disputeId, status, nextNote);
      setPendingAction(null);

      if (!result.ok) {
        setNotice({
          type: "error",
          message: result.error ?? "Unable to update dispute status.",
        });
        return;
      }

      setNotice({
        type: "success",
        message: `Dispute moved to ${status}.`,
      });
      router.refresh();
    });
  };

  const runBanSeller = (disputeId: string) => {
    const note =
      notesById[disputeId]?.trim() ||
      "Seller blocked due to repeated or severe dispute behavior.";

    setPendingAction(`${disputeId}:ban`);

    startTransition(async () => {
      const result = await banSellerFromDispute(disputeId, note);
      setPendingAction(null);

      if (!result.ok) {
        setNotice({
          type: "error",
          message: result.error ?? "Unable to ban seller.",
        });
        return;
      }

      setNotice({
        type: "success",
        message: "Seller blocked from selling and dispute closed.",
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/70">
          Secret Control Room
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Dispute Resolution Center
        </h1>
        <p className="max-w-2xl text-sm text-white/65">
          Review buyer claims, inspect evidence, and enforce outcomes with auditable
          admin notes.
        </p>
      </header>

      {notice ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.type === "idle" && "border-white/15 bg-white/5 text-white/70",
            notice.type === "success" && "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
            notice.type === "error" && "border-rose-300/35 bg-rose-300/10 text-rose-100"
          )}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      ) : null}

      {initialDisputes.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          No disputes right now.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {KANBAN_COLUMNS.map((column) => {
            const items = disputesByColumn.get(column.title) ?? [];
            return (
              <section
                key={column.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">{column.title}</h2>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-4 text-center text-xs text-white/45">
                      Empty
                    </div>
                  ) : (
                    items.map((dispute) => {
                      const isExpanded = expandedId === dispute.id;
                      const isBusy =
                        isTransitioning && pendingAction?.startsWith(`${dispute.id}:`);

                      return (
                        <article
                          key={dispute.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-3"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((prev) => (prev === dispute.id ? null : dispute.id))
                            }
                            className="w-full space-y-1 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="line-clamp-1 text-sm font-semibold text-white">
                                {dispute.product?.title ?? "Unknown product"}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/70">
                                <Clock3 className="h-3 w-3" />
                                {dispute.status}
                              </span>
                            </div>
                            <p className="line-clamp-1 text-xs text-white/65">{dispute.reason}</p>
                            <p className="text-[11px] text-white/45">
                              Buyer: {dispute.buyer?.username || dispute.buyer?.email || "Unknown"}
                            </p>
                          </button>

                          {isExpanded ? (
                            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                              <p className="text-xs leading-relaxed text-white/70">
                                {dispute.description}
                              </p>

                              <div className="grid gap-2 text-xs text-white/60">
                                <div>
                                  Seller: {dispute.seller?.username || dispute.seller?.email || "Unknown"}
                                </div>
                                <div>
                                  Created: {new Date(dispute.created_at).toLocaleString()}
                                </div>
                              </div>

                              {dispute.evidence_signed_url ? (
                                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                                  <img
                                    src={dispute.evidence_signed_url}
                                    alt="Dispute evidence"
                                    className="h-44 w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/55">
                                  <Eye className="h-3.5 w-3.5" />
                                  No evidence uploaded
                                </div>
                              )}

                              <label className="block space-y-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                                  Internal Notes
                                </span>
                                <textarea
                                  value={notesById[dispute.id] ?? dispute.admin_notes ?? ""}
                                  onChange={(event) =>
                                    setAdminNote(dispute.id, event.target.value)
                                  }
                                  rows={3}
                                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/20"
                                  placeholder="Write investigation notes..."
                                />
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    runStatusAction(
                                      dispute.id,
                                      "resolved",
                                      "Resolved after admin review."
                                    )
                                  }
                                  disabled={Boolean(isBusy)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-60"
                                >
                                  {isBusy && pendingAction === `${dispute.id}:resolved` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Mark as Resolved
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    runStatusAction(
                                      dispute.id,
                                      "closed",
                                      "Closed by admin after investigation."
                                    )
                                  }
                                  disabled={Boolean(isBusy)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/40 bg-slate-300/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:bg-slate-300/20 disabled:opacity-60"
                                >
                                  {isBusy && pendingAction === `${dispute.id}:closed` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Close
                                </button>

                                <button
                                  type="button"
                                  onClick={() => runBanSeller(dispute.id)}
                                  disabled={Boolean(isBusy)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                                >
                                  {isBusy && pendingAction === `${dispute.id}:ban` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Ban className="h-3.5 w-3.5" />
                                  )}
                                  Ban Seller
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <FileWarning className="h-3.5 w-3.5 text-amber-300" />
          All actions are logged in admin notes.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5 text-cyan-300" />
          Keep notes factual and actionable.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-300" />
          Evidence links are signed and temporary.
        </span>
      </footer>
    </div>
  );
}
