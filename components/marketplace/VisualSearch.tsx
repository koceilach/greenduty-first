"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Scan, UploadCloud } from "lucide-react";
import {
  analyzeImage,
  type VisualDetectionItem,
  type AnalyzeImageResult,
} from "@/actions/analyzeImage";
import { cn } from "@/lib/utils";

type VisualSearchProps = {
  sectionId?: string;
  className?: string;
};

const MAX_IMAGE_MB = 8;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

const formatTime = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function VisualSearch({
  sectionId = "marketplace-visual-search",
  className,
}: VisualSearchProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const analyzeTokenRef = useRef(0);

  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSizeKb, setFileSizeKb] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<VisualDetectionItem[]>([]);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large. Max size is ${MAX_IMAGE_MB}MB.`);
      return;
    }

    const token = Date.now();
    analyzeTokenRef.current = token;
    setError(null);
    setDetections([]);
    setAnalyzedAt(null);
    setFileName(file.name || "image");
    setFileSizeKb(Math.max(1, Math.round(file.size / 1024)));

    try {
      const dataUrl = await fileToDataUrl(file);
      if (analyzeTokenRef.current !== token) return;
      setPreviewUrl(dataUrl);
      setIsAnalyzing(true);

      const base64 = dataUrl.split(",")[1] ?? "";
      const result: AnalyzeImageResult = await analyzeImage(base64);
      if (analyzeTokenRef.current !== token) return;

      setDetections(result.items);
      setAnalyzedAt(result.analyzedAt);
    } catch (cause) {
      if (analyzeTokenRef.current !== token) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to analyze this image right now."
      );
    } finally {
      if (analyzeTokenRef.current === token) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        await analyzeFile(file);
      }
    },
    [analyzeFile]
  );

  const onFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await analyzeFile(file);
      }
      event.target.value = "";
    },
    [analyzeFile]
  );

  return (
    <section
      id={sectionId}
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/35 to-teal-50/35 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)] sm:p-6",
        "select-none",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-cyan-200/35 blur-3xl" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              Visual Search
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Upload a crop photo and let AI detect plant, seed, and soil clues.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 backdrop-blur-md">
            <Scan className="h-3.5 w-3.5 text-emerald-600" />
            {analyzedAt ? `Analyzed ${formatTime(analyzedAt)}` : "Ready to scan"}
          </span>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(false);
          }}
          onDrop={onDrop}
          className={cn(
            "rounded-2xl border-2 border-dashed bg-white/65 p-4 transition sm:p-5",
            dragActive
              ? "border-emerald-400 bg-emerald-50/70"
              : "border-emerald-200/80"
          )}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Drag & drop an image or select from your device
              </p>
              <p className="text-xs text-slate-500">
                Works with gallery upload and mobile camera capture.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.3)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <UploadCloud className="h-4 w-4" />
                Select Image
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <Camera className="h-4 w-4" />
                Use Camera
              </button>
            </div>
          </div>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={onFileInputChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileInputChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <article className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur-md">
              <div className="relative h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-64">
                <Image
                  src={previewUrl}
                  alt="Uploaded crop preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate font-medium text-slate-700">{fileName}</span>
                <span>{fileSizeKb} KB</span>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 shadow-sm backdrop-blur-md">
              <h4 className="text-base font-bold text-slate-900">AI Detection Results</h4>

              {isAnalyzing ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-white/70 px-4 py-8 text-center shadow-[0_12px_30px_rgba(16,185,129,0.12)] backdrop-blur-md">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-emerald-800">
                    AI is analyzing your crop...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Running label and web detection for accurate visual matching.
                  </p>
                </div>
              ) : detections.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {detections.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/65 px-3 py-2.5 text-sm shadow-[0_8px_20px_rgba(16,185,129,0.08)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          Detected: {item.label}
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                          {item.source}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Confidence: {item.confidencePercent}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No detections yet. Upload an image to start scanning.
                </div>
              )}
            </article>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

