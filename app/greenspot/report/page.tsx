"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { greenspotClient } from "@/lib/supabase/client";
import { plantList } from "@/lib/greenspot/plant-list";
import { useAuth } from "@/components/auth-provider";
import {
  MapPin,
  ShieldCheck,
  Leaf,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";

export default function GreenSpotReportPage() {
  const { user, loading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [plantType, setPlantType] = useState<"Tree" | "Plant">("Tree");
  const [plantName, setPlantName] = useState("");

  useEffect(() => {
    setSubmitted(false);
  }, []);

  const requestGpsLocation = () => {
    setSubmitError("");
    if (!navigator.geolocation) {
      setSubmitError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setSubmitError("Unable to access location."),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <main className="min-h-screen gd-page-bg--red text-white">
      <Navbar />

      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-24 left-10 h-10 w-10 rounded-full bg-red-500/70" />
          <div className="absolute bottom-16 right-20 h-16 w-16 rounded-full bg-emerald-400/30" />
          <div className="absolute bottom-24 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border border-dashed border-emerald-400/30" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Link href="/greenspot">
                  <ArrowLeft className="w-4 h-4" />
                  Back to GreenSpot
                </Link>
              </Button>
              <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <img
                  src="/logo.png"
                  alt="GreenDuty logo"
                  width={800}
                  height={800}
                  className="h-10 w-10 object-contain"
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={requestGpsLocation}
                >
                  Use my GPS location
                </Button>
                {coords && (
                  <p className="text-xs text-emerald-200">
                    Location captured: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </p>
                )}
                <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
                <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
              </div>
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
                GreenSpot Report
              </p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-semibold">
                Report a planting or arrosage area.
              </h1>
              <p className="mt-3 text-white/70 max-w-2xl">
                Submit a location ready for greenery. Verified reports receive priority
                review and get published to the community map.
              </p>
            </div>
          </motion.div>

          <div className="mt-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-8">
            <motion.form
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
              className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitError("");
                setIsSubmitting(true);
                const form = event.currentTarget;
                const formData = new FormData(form);
                if (!user || loading) {
                  setIsSubmitting(false);
                  setSubmitError("You must be logged in to submit a report.");
                  return;
                }
                if (!coords) {
                  setIsSubmitting(false);
                  setSubmitError("Use GPS location before submitting so the report is pinned correctly.");
                  return;
                }

                const uploadedUrls: string[] = [];
                if (selectedFiles && selectedFiles.length > 0) {
                  const files = Array.from(selectedFiles);
                  for (const file of files) {
                    const filePath = `${user.id}/${Date.now()}-${file.name}`;
                    const { error: uploadError } = await greenspotClient.storage
                      .from("greenspot-uploads")
                      .upload(filePath, file);
                    if (uploadError) {
                      setIsSubmitting(false);
                      setSubmitError("Failed to upload files.");
                      return;
                    }
                    const { data: publicUrl } = greenspotClient.storage
                      .from("greenspot-uploads")
                      .getPublicUrl(filePath);
                    uploadedUrls.push(publicUrl.publicUrl);
                  }
                }

                const locationName = String(formData.get("location_name") ?? "").trim();
                const category = String(formData.get("category") ?? "General").trim();
                const region = String(formData.get("region") ?? "").trim();
                const accessLevel = String(formData.get("access_level") ?? "Public").trim();
                const description = String(formData.get("description") ?? "").trim();
                const photoPreviewUrl = uploadedUrls[0] ?? null;

                const locationLabel = locationName || region || "GreenSpot area";
                const descriptionWithContext = [
                  description,
                  region ? `Region: ${region}` : null,
                  accessLevel ? `Access: ${accessLevel}` : null,
                ]
                  .filter(Boolean)
                  .join(" ");

                const response = await fetch("/api/greenspot/reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: locationLabel,
                    description: descriptionWithContext,
                    category: category || "General",
                    expert: "community-report",
                    imageUrl: photoPreviewUrl,
                    lat: coords.lat,
                    lng: coords.lng,
                  }),
                });
                const payload = (await response.json().catch(() => null)) as
                  | { report?: { id?: string }; error?: string }
                  | null;

                setIsSubmitting(false);
                if (!response.ok || !payload?.report?.id) {
                  setSubmitError(payload?.error ?? "Failed to submit report.");
                  return;
                }
                if (payload.report.id && plantName) {
                  await fetch("/api/greenspot/care", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      plantName,
                      plantType,
                      latitude: coords.lat,
                      longitude: coords.lng,
                      reportId: payload.report.id,
                    }),
                  });
                }
                setSubmitted(true);
                form.reset();
                setSelectedFiles(null);
                setPlantName("");
                setCoords(null);
              }}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Plant or tree type</label>
                  <input
                    type="text"
                    name="plant_name"
                    list="plant-list"
                    value={plantName}
                    onChange={(event) => setPlantName(event.target.value)}
                    placeholder="Search or type a plant name"
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    required
                  />
                  <datalist id="plant-list">
                    {plantList.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-white/60">Plant type</label>
                  <select
                    name="plant_type"
                    value={plantType}
                    onChange={(event) => setPlantType(event.target.value as "Tree" | "Plant")}
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option>Tree</option>
                    <option>Plant</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">Location name</label>
                  <input
                    type="text"
                    name="location_name"
                    placeholder="e.g. Palm belt hydration zone"
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Category</label>
                  <select
                    name="category"
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option>Planting</option>
                    <option>Arrosage</option>
                    <option>Reforestation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60">City / Region</label>
                  <input
                    type="text"
                    name="region"
                    placeholder="e.g. El Oued"
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Access level</label>
                  <select
                    name="access_level"
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option>Public</option>
                    <option>Community</option>
                    <option>Private review</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs text-white/60">Description</label>
                <textarea
                  rows={4}
                  name="description"
                  placeholder="Describe the area, current condition, and why it needs greenery."
                  className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="mt-4">
                <label className="text-xs text-white/60">Upload photos</label>
                <label className="mt-2 block cursor-pointer rounded-2xl border border-dashed border-emerald-500/40 bg-black/40 px-4 py-6 text-center text-white/60">
                  <UploadCloud className="w-6 h-6 mx-auto mb-2 text-emerald-300" />
                  <span>Drag & drop or click to upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setSelectedFiles(event.target.files)}
                  />
                </label>
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-200">
                    {selectedFiles.length} file(s) selected
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  disabled={isSubmitting || !coords}
                >
                  {isSubmitting ? "Submitting..." : "Submit report"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Save draft
                </Button>
              </div>

              {submitError && (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {submitError}
                </div>
              )}

              {submitted && !submitError && (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Thanks! Your GreenSpot report is now in review.
                </div>
              )}
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
            >
              <div className="rounded-3xl border border-emerald-500/20 bg-black/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Map selection</p>
                    <h3 className="text-lg font-semibold mt-1">3D area preview</h3>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 p-2 border border-emerald-400/30">
                    <MapPin className="w-4 h-4 text-emerald-300" />
                  </div>
                </div>

                <motion.div
                  whileHover={{ rotateX: 6, rotateY: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 140, damping: 14 }}
                  className="mt-4 relative h-56 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 via-black/60 to-black/80 overflow-hidden"
                  style={{ transformStyle: "preserve-3d", perspective: "900px" }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.2),transparent_45%)]" />
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,_rgba(16,185,129,0.4)_1px,_transparent_1px)] [background-size:14px_14px]" />
                  <div className="absolute inset-0 border border-white/5 rounded-2xl shadow-[inset_0_0_40px_rgba(16,185,129,0.2)]" />

                  <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="h-14 w-14 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.45)]">
                      <MapPin className="w-6 h-6 text-emerald-300" />
                    </div>
                  </motion.div>

                  <div className="absolute left-6 bottom-6 rounded-full bg-black/50 border border-emerald-500/30 px-3 py-1 text-xs text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
                    Click to place a pin
                  </div>
                </motion.div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button className="bg-emerald-500 text-black hover:bg-emerald-400">
                    Select area on map
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Reset pin
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Verification status</p>
                  <h3 className="text-xl font-semibold mt-1">ID verified reporter</h3>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-black/40 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-200 flex items-center justify-center font-semibold border border-emerald-400/20">
                    GD
                  </div>
                  <div>
                    <p className="font-medium">GreenDuty Reporter</p>
                    <p className="text-xs text-white/60">Verified by ID check</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-300" />
                    Reports are reviewed before publication.
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-300" />
                    Pin accuracy increases verification score.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
