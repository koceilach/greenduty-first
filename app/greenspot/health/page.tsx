"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Leaf, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type HealthCheckRow = {
  id: string;
  plant_name: string;
  status: string;
  issues: string[];
  actions: string[];
  checked_at: string;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export default function GreenSpotHealthPage() {
  const { user, loading } = useAuth();
  const [healthChecks, setHealthChecks] = useState<HealthCheckRow[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const [healthResult, setHealthResult] = useState<HealthCheckRow | null>(null);
  const [healthFile, setHealthFile] = useState<File | null>(null);
  const [healthPlant, setHealthPlant] = useState("");
  const [healthAnalyzing, setHealthAnalyzing] = useState(false);

  useEffect(() => {
    const loadHealth = async () => {
      setHealthLoading(true);
      setHealthError("");
      const userId = user?.id;
      if (!userId) {
        setHealthLoading(false);
        return;
      }
      try {
      const res = await fetch("/api/greenspot/health-check");
        const data = await res.json();
        if (!res.ok) {
          setHealthError(data.error || "Failed to load health checks.");
          return;
        }
        setHealthChecks(data.checks || []);
      } catch {
        setHealthError("Failed to load health checks.");
      } finally {
        setHealthLoading(false);
      }
    };
    loadHealth();
  }, [user?.id]);

  const handleHealthCheck = async () => {
    if (!healthFile || !healthPlant) {
      setHealthError("Please select a plant and upload a photo.");
      return;
    }
    setHealthAnalyzing(true);
    setHealthError("");
    const userId = user?.id;
    if (!userId || loading) {
      setHealthError("You must be logged in.");
      setHealthAnalyzing(false);
      return;
    }

    const form = new FormData();
    form.append("plantName", healthPlant);
    form.append("photo", healthFile);

    const res = await fetch("/api/greenspot/health-check", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setHealthError(data.error || "Health check failed.");
      setHealthAnalyzing(false);
      return;
    }
    setHealthResult(data.health);
    setHealthChecks((prev) => [data.health, ...prev]);
    setHealthAnalyzing(false);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(239,68,68,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/greenspot">
                <ArrowLeft className="w-4 h-4" />
                Back to GreenSpot
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Plant Health Check</p>
              <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
                Analyze plant health with AI support.
              </h1>
              <p className="mt-3 text-white/70 max-w-2xl">
                Upload a recent photo to detect stress signals and receive clear care actions.
              </p>
            </div>
            <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-emerald-200 border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              {healthChecks.length} health checks logged
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60">Plant name</label>
                  <input
                    type="text"
                    placeholder="e.g. Olive Tree"
                    value={healthPlant}
                    onChange={(event) => setHealthPlant(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Upload photo</label>
                  <label className="mt-2 block cursor-pointer rounded-2xl border border-dashed border-emerald-500/40 bg-black/40 px-4 py-6 text-center text-white/60">
                    <span>Drop or click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setHealthFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {healthFile && <p className="mt-2 text-xs text-emerald-200">{healthFile.name}</p>}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={handleHealthCheck}
                  disabled={healthAnalyzing}
                >
                  {healthAnalyzing ? "Analyzing..." : "Run health check"}
                </Button>
                {healthError && <p className="text-sm text-red-300">{healthError}</p>}
              </div>

              {healthResult && (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <Leaf className="w-4 h-4" />
                    {healthResult.status}
                  </div>
                  <p className="mt-2 text-xs text-white/70">
                    Issues: {healthResult.issues?.join(", ") || "None detected"}
                  </p>
                  <p className="mt-2 text-xs text-white/70">
                    Actions: {healthResult.actions?.join(" · ") || "Maintain current care"}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">Health timeline</p>
                  <h3 className="text-xl font-semibold mt-2">Recent checks</h3>
                </div>
                <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                  <CalendarCheck className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {healthLoading && <p className="text-sm text-white/60">Loading health checks…</p>}
                {!healthLoading && healthChecks.length === 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-black/40 p-6 text-sm text-white/60">
                    No health checks yet. Upload a photo to start tracking.
                  </div>
                )}
                {healthChecks.map((check) => (
                  <div key={check.id} className="rounded-2xl border border-emerald-500/20 bg-black/40 p-4">
                    <p className="text-sm font-semibold">{check.plant_name}</p>
                    <p className="text-xs text-white/60">
                      Health check – {formatDate(check.checked_at)}
                    </p>
                    <p className="mt-2 text-xs text-emerald-200">{check.status}</p>
                    <p className="mt-1 text-xs text-white/60">
                      Advice: {check.actions?.join(" · ") || "Maintain current care schedule."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
