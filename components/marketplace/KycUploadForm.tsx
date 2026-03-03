"use client";

import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileImage, Loader2, Lock, ShieldCheck, UploadCloud } from "lucide-react";
import { submitKycRequest } from "@/actions/kyc";
import { cn } from "@/lib/utils";

type KycUploadFormProps = {
  className?: string;
  onSubmitted?: (requestId: string) => void;
};

type UploadNotice = {
  tone: "idle" | "success" | "error";
  message: string;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export default function KycUploadForm({ className, onSubmitted }: KycUploadFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [notice, setNotice] = useState<UploadNotice>({
    tone: "idle",
    message: "Upload a clear government-issued ID or passport image.",
  });

  const canSubmit = useMemo(() => !isUploading && Boolean(selectedFileName), [isUploading, selectedFileName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFileName("");
      setNotice({
        tone: "idle",
        message: "Upload a clear government-issued ID or passport image.",
      });
      return;
    }

    setSelectedFileName(file.name);
    setNotice({
      tone: "idle",
      message: "Encrypted upload is ready. Submit to send your KYC request securely.",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isUploading) return;

    const form = event.currentTarget;
    const payload = new FormData(form);

    setIsUploading(true);
    setNotice({ tone: "idle", message: "Uploading your document over an encrypted connection..." });

    const result = await submitKycRequest(payload);
    setIsUploading(false);

    if (!result.ok) {
      setNotice({ tone: "error", message: result.error ?? "Unable to submit KYC right now." });
      return;
    }

    setNotice({
      tone: "success",
      message: "KYC submitted successfully. Our trust & safety team will review it shortly.",
    });

    setSelectedFileName("");
    formRef.current?.reset();

    if (result.requestId && onSubmitted) {
      onSubmitted(result.requestId);
    }
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-lg supports-[backdrop-filter]:border-white/60 supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-xl sm:p-7",
        className
      )}
      aria-label="KYC upload form"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-transparent blur-2xl" />

      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Trust & Safety</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Identity Verification (KYC)</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Lock className="h-3.5 w-3.5" />
            Encrypted
          </div>
        </div>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Full security
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <FileImage className="h-4 w-4 text-cyan-600" />
            JPG, PNG, WEBP up to 6MB
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="kyc-document" className="space-y-2.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ID / Passport Image</span>
            <div className="group relative rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-200">
              <UploadCloud className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="kyc-document"
                name="document"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                className="w-full cursor-pointer border-0 bg-transparent pl-7 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                required
              />
            </div>
          </label>

          {selectedFileName ? (
            <p className="text-xs text-slate-600">Selected: <span className="font-medium text-slate-800">{selectedFileName}</span></p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading securely...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Submit KYC Request
              </>
            )}
          </button>
        </form>

        <div
          className={cn(
            "flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs",
            notice.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            notice.tone === "error" && "border-rose-200 bg-rose-50 text-rose-700",
            notice.tone === "idle" && "border-slate-200 bg-slate-50 text-slate-600"
          )}
          role="status"
          aria-live="polite"
        >
          {notice.tone === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      </div>
    </section>
  );
}
