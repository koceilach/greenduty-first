"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  BarChart3,
  BadgeCheck,
  TrendingUp,
  FileText,
  Camera,
  Video,
  Search,
  PenSquare,
} from "lucide-react";

const highlights = [
  {
    title: "Verified Agronomy Library",
    description:
      "Articles, field notes, and media reviewed by AI and agronomy specialists for accuracy and safety.",
    icon: ShieldCheck,
  },
  {
    title: "Modern Research Tools",
    description:
      "Smart summaries, translation, citations, and crop-specific knowledge cards.",
    icon: Sparkles,
  },
  {
    title: "Impact Analytics",
    description:
      "Track readership, engagement, and real-world outcomes from published insights.",
    icon: BarChart3,
  },
];

const contentTypes = [
  {
    title: "Research Articles",
    description: "Peer-reviewed agronomy and sustainability insights.",
    icon: FileText,
  },
  {
    title: "Field Reports",
    description: "On-site observations with soil, weather, and yield context.",
    icon: PenSquare,
  },
  {
    title: "Photo Stories",
    description: "Crop growth, pest identification, and restoration case studies.",
    icon: Camera,
  },
  {
    title: "Video Briefs",
    description: "Short explainers and demonstrations from verified contributors.",
    icon: Video,
  },
];

const analytics = [
  { label: "Verified Contributors", value: "1,240+" },
  { label: "Published Reports", value: "8,900+" },
  { label: "Active Readers", value: "320K+" },
  { label: "Avg. Trust Score", value: "98.4%" },
];

const libraryItems = [
  {
    title: "Desert Soil Revival Toolkit",
    tag: "Soil Health",
    trend: "+14% readership",
  },
  {
    title: "Water-Smart Irrigation Playbook",
    tag: "Irrigation",
    trend: "+9% adoption",
  },
  {
    title: "Compost Lab: Microbial Boost",
    tag: "Fertilization",
    trend: "+22% saved inputs",
  },
  {
    title: "Pest Watch: Seasonal Signals",
    tag: "Crop Protection",
    trend: "+11% yield stability",
  },
  {
    title: "Green Logistics for Harvest",
    tag: "Supply Chain",
    trend: "+18% efficiency",
  },
  {
    title: "Agro-Education for Youth",
    tag: "Education",
    trend: "+30% engagement",
  },
];

export default function AgroEduPage() {
  const { user, profile, loading } = useAuth();
  const hasAccess =
    Boolean(user) &&
    (profile?.role === "admin" ||
      profile?.account_tier === "pro" ||
      profile?.account_tier === "impact" ||
      profile?.verification_status === "approved");

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
        <Navbar />
        <section className="pt-28 pb-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Sign in required</h1>
                  <p className="text-sm text-white/60">
                    Sign in to access GreenDuty Edu.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <Button asChild className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
        <Navbar />
        <section className="pt-28 pb-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Upgrade required</h1>
                  <p className="text-sm text-white/60">
                    GreenDuty Edu is available to Pro, Impact, or verified academic accounts.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <Button asChild className="bg-emerald-500 text-black hover:bg-emerald-400">
                  <Link href="/pricing">View plans</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/account/verification">Request verification</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-[#68d391]/20 blur-3xl" />
          <div className="absolute top-32 right-24 h-16 w-16 rounded-full bg-[#f6ad55]/60" />
          <div className="absolute top-44 right-44 h-8 w-8 rounded-full bg-[#f56565]/70" />
          <div className="absolute bottom-10 left-10 h-20 w-20 rounded-full border-2 border-dashed border-[#9f7aea]/40" />
          <div className="absolute bottom-24 right-36 h-10 w-10 rounded-full bg-[#63b3ed]/50" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center relative">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 border border-white/20 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-[#f56565]" />
                <span className="font-medium">5 Stars</span>
                <span className="text-white/40">Trusted by agro learners</span>
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
                Find Your
                <span className="block">Perfect Agro</span>
                <span className="block text-emerald-300">Education Platform</span>
              </h1>
              <p className="mt-5 text-lg text-white/70 max-w-2xl">
                A professional knowledge hub where verified contributors publish research,
                reports, and media. Each submission is reviewed by AI for accuracy and safety.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-black">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Explore Library
                </Button>
              </div>
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {analytics.map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 shadow-sm">
                    <div className="text-xl font-semibold text-emerald-300">{item.value}</div>
                    <div className="text-xs text-white/60">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-emerald-900/20 rounded-[32px] blur-2xl opacity-80" />
              <div className="relative rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-xl">
                <div className="absolute -top-10 -left-8 h-20 w-20 rounded-full bg-[#fed7aa]" />
                <div className="absolute -bottom-8 -right-6 h-16 w-16 rounded-full bg-[#90cdf4]" />
                <div className="absolute top-10 -right-8 h-8 w-8 rounded-full bg-[#f687b3]" />
                <div className="absolute -bottom-10 left-8 h-10 w-10 rounded-full bg-[#9ae6b4]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Featured Knowledge Pack</p>
                    <h2 className="text-2xl font-semibold mt-1">Algerian Agro Atlas 2026</h2>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                    <BookOpen className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {highlights.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-black/40 px-4 py-4 shadow-sm"
                    >
                      <div className="rounded-xl bg-emerald-500/15 p-2 border border-emerald-400/30">
                        <item.icon className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-white/60">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-sm text-white/60">
                    Updated weekly with verified field data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Types */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">About the Library</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">Built for agronomy researchers and practitioners.</h2>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 border border-white/20 shadow-sm">
              <Search className="w-4 h-4 text-emerald-300" />
              <input
                type="text"
                placeholder="Search crops, soil, irrigation..."
                className="bg-transparent text-sm outline-none w-56 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {contentTypes.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
                <div className="rounded-2xl bg-emerald-500/15 w-12 h-12 flex items-center justify-center border border-emerald-400/30">
                  <item.icon className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Library Grid */}
      <section className="py-16 bg-[#0a0d10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Latest Insights</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">Curated knowledge, with measurable outcomes.</h2>
            </div>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              View all publications
            </Button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {libraryItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-emerald-500/20 bg-white/5 p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{item.tag}</p>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-200">
                  <TrendingUp className="w-4 h-4" />
                  {item.trend}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs text-white/50">AI verified</span>
                  <Button size="sm" className="bg-emerald-500 text-black hover:bg-emerald-400">
                    Read
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contributor Workflow */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Verification Workflow</p>
              <h2 className="text-3xl sm:text-4xl font-semibold mt-3">Every post goes through AI integrity checks.</h2>
              <p className="mt-4 text-white/60">
                Contributors are verified before they can publish. Each article, report,
                photo story, or video is scanned for accuracy, safety, and policy compliance
                before it is approved.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Identity and expertise verification",
                  "Automated agronomy fact-checks",
                  "Human editorial approval for high-impact posts",
                  "Continuous re-validation on updates",
                ].map((step) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3 shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    <span className="text-sm text-white/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                  <BookOpen className="w-6 h-6 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Contributor Dashboard</h3>
                  <p className="text-sm text-white/60">Login for verified agro authors</p>
                </div>
              </div>

              <form className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/60">Email</label>
                  <input
                    type="email"
                    placeholder="name@greenduty.com"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60">Verification ID</label>
                  <input
                    type="text"
                    placeholder="GD-EDU-XXXX"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60">Password</label>
                  <input
                    type="password"
                    placeholder="********"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400/40"
                  />
                </div>
                <Button className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
                  Access Contributor Workspace
                </Button>
                <p className="text-xs text-white/60 text-center">
                  Need verification?{" "}
                  <Link href="/register" className="text-emerald-200 underline underline-offset-4">
                    Apply for access
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-500/20 via-white/5 to-emerald-800/30 text-white px-10 py-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold">Publish trusted agro knowledge.</h2>
              <p className="mt-4 text-white/70">
                Share field intelligence, insights, and educational assets with the GreenDuty
                community. Every submission is validated for quality and safety.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-emerald-500 text-black hover:bg-emerald-400">
                Submit a report
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Talk to the team
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
