"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RequireRole } from "@/lib/auth/guard"

export default function AdminDashboardPage() {
  return (
    <RequireRole roles={["admin"]}>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white">
        <Navbar />
        <section className="pt-28 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
              <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
              <p className="mt-2 text-white/60">
                Review academic verification requests and manage subscriptions.
              </p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </RequireRole>
  )
}
