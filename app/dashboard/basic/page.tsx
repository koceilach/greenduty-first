"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RequireRole } from "@/lib/auth/guard"

export default function BasicDashboardPage() {
  return (
    <RequireRole roles={["basic_account", "admin"]}>
      <main className="min-h-screen gd-page-bg text-white">
        <Navbar />
        <section className="pt-28 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
              <h1 className="text-3xl font-semibold">Basic Account Dashboard</h1>
              <p className="mt-2 text-white/60">
                Limited access to reporting and educational content.
              </p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </RequireRole>
  )
}
