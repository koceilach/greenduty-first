"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Lock,
  Shield,
  UploadCloud,
} from "lucide-react";
import { openDispute } from "@/actions/disputes";
import { DISPUTE_REASONS } from "@/lib/marketplace/disputes";
import { cn } from "@/lib/utils";

type ReportItemFormProps = {
  productId: string;
  sellerId: string;
  className?: string;
  onSubmitted?: (disputeId: string) => void;
};

type NoticeState = {
  type: "idle" | "error" | "success";
  message: string;
};

export default function ReportItemForm({
  productId,
  sellerId,
  className,
  onSubmitted,
}: ReportItemFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [reason, setReason] = useState<(typeof DISPUTE_REASONS)[number]>(
    DISPUTE_REASONS[0]
  );
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<NoticeState>({
    type: "idle",
    message: "All reports are encrypted and handled by our trust team.",
  });

  const canSubmit = useMemo(() => {
    return !isSubmitting && description.trim().length >= 15;
  }, [isSubmitting, description]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setNotice({
      type: "idle",
      message: "Submitting your dispute to the resolution center...",
    });

    const result = await openDispute(formData);

    setIsSubmitting(false);
    if (!result.ok) {
      setNotice({
        type: "error",
        message: result.error ?? "Could not submit dispute. Please try again.",
      });
      return;
    }

    setNotice({
      type: "success",
      message: "Dispute submitted. An admin will review your case shortly.",
    });

    setDescription("");
    setReason(DISPUTE_REASONS[0]);
    setSelectedFileName("");
    formRef.current?.reset();

    if (result.disputeId && onSubmitted) {
      onSubmitted(result.disputeId);
    }
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg supports-[backdrop-filter]:border-white/60 supports-[backdrop-filter]:bg-white/65 supports-[backdrop-filter]:backdrop-blur-xl",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-cyan-300/25 via-emerald-300/10 to-transparent blur-2xl" />

      <div className="relative space-y-5">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Dispute Resolution Center
          </p>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
            Report an Order Issue
          </h3>
          <p className="text-sm text-slate-600">
            Share clear details and evidence so our team can resolve your case fast.
          </p>
        </header>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Lock className="h-4 w-4 text-cyan-600" />
            Encrypted upload
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Full security review
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="sellerId" value={sellerId} />

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Reason
            </span>
            <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
              <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                name="reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as (typeof DISPUTE_REASONS)[number])
                }
                className="w-full appearance-none rounded-2xl bg-transparent px-10 py-3 text-sm text-slate-800 outline-none"
              >
                {DISPUTE_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Description
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              required
              minLength={15}
              placeholder="Describe exactly what happened and what outcome you expect."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Evidence Image (optional)
            </span>
            <div className="relative rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-slate-400 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
              <UploadCloud className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="file"
                name="evidence"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setSelectedFileName(event.target.files?.[0]?.name ?? "")
                }
                className="w-full cursor-pointer border-0 bg-transparent pl-7 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300"
              />
            </div>
            {selectedFileName ? (
              <p className="text-xs text-slate-600">Selected: {selectedFileName}</p>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting dispute...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Submit Dispute
              </>
            )}
          </button>
        </form>

        <div
          className={cn(
            "rounded-2xl border px-3 py-2.5 text-xs",
            notice.type === "idle" && "border-slate-200 bg-slate-50 text-slate-600",
            notice.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            notice.type === "error" && "border-rose-200 bg-rose-50 text-rose-700"
          )}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      </div>
    </section>
  );
}
