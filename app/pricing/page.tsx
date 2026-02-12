"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  CreditCard,
  Globe,
  GraduationCap,
  ShieldCheck,
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/components/auth-provider"
import { supabaseClient } from "@/lib/supabase/client"

type Interval = "monthly" | "yearly"
type Currency = "DZD" | "EUR" | "USD"

const planData = [
  {
    id: "basic_account",
    name: "Basic",
    description: "Default account for all users",
    prices: {
      DZD: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 },
      USD: { monthly: 0, yearly: 0 },
    },
    features: [
      "Limited pollution reporting",
      "Limited GreenSpot submissions",
      "Educational content access",
      "Usage limits apply",
    ],
  },
  {
    id: "pro_account",
    name: "Pro",
    description: "Active users & volunteers",
    prices: {
      DZD: { monthly: 1200, yearly: 12000 },
      EUR: { monthly: 9, yearly: 90 },
      USD: { monthly: 10, yearly: 100 },
    },
    features: [
      "Unlimited pollution reports",
      "Unlimited GreenSpot submissions",
      "Priority report processing",
      "Full access to Green Duty Edu",
      "Certificates & eco-badges",
      "Personal impact dashboard",
    ],
  },
  {
    id: "impact_account",
    name: "Impact",
    description: "Researchers, NGOs, institutions",
    prices: {
      DZD: { monthly: 2500, yearly: 25000 },
      EUR: { monthly: 19, yearly: 190 },
      USD: { monthly: 20, yearly: 200 },
    },
    features: [
      "Advanced analytics",
      "Bulk reporting",
      "Data export (PDF / CSV)",
      "Long-term impact tracking",
      "Team collaboration",
      "Research-ready datasets",
    ],
  },
]

const paymentMethods = [
  { label: "Visa / MasterCard", icon: CreditCard },
  { label: "PayPal", icon: Globe },
  { label: "ECCP / CCP", icon: ShieldCheck },
  { label: "BaridiMob", icon: ShieldCheck },
  { label: "EDAHABIA", icon: ShieldCheck },
]

const planToTier = {
  basic_account: "basic",
  pro_account: "pro",
  impact_account: "impact",
} as const

const tierToPlan = {
  basic: "basic_account",
  pro: "pro_account",
  impact: "impact_account",
} as const

export default function PricingPage() {
  const router = useRouter()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [interval, setInterval] = useState<Interval>("monthly")
  const [currency, setCurrency] = useState<Currency>("DZD")
  const [activePlan, setActivePlan] = useState<string>("basic_account")
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (profile?.account_tier) {
      const mapped = tierToPlan[profile.account_tier as keyof typeof tierToPlan]
      if (mapped) setActivePlan(mapped)
    }
  }, [profile?.account_tier])

  const handleSelectPlan = async (planId: string) => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }

    const tier = planToTier[planId as keyof typeof planToTier]
    if (!tier) return

    setBusyPlan(planId)
    setError(null)

    const { error: updateError } = await supabaseClient
      .from("marketplace_profiles")
      .update({ account_tier: tier })
      .eq("id", user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setActivePlan(planId)
      await refreshProfile()
    }

    setBusyPlan(null)
  }

  const symbol = useMemo(() => {
    if (currency === "DZD") return "DA"
    if (currency === "EUR") return "EUR"
    return "$"
  }, [currency])

  return (
    <main className="min-h-screen gd-page-bg text-white">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
              Pricing & Plans
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold">
              {t("pricing.title")}
            </h1>
            <p className="mt-4 text-white/60 max-w-2xl mx-auto">
              Monthly or yearly billing, local Algerian payments, and international options.
            </p>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </div>

          <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`px-4 py-2 rounded-full text-sm ${
                  interval === "monthly" ? "bg-emerald-500 text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {t("pricing.toggle.monthly")}
              </button>
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={`px-4 py-2 rounded-full text-sm ${
                  interval === "yearly" ? "bg-emerald-500 text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {t("pricing.toggle.yearly")}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">{t("pricing.currency")}</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="DZD">DZD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planData.map((plan) => {
              const price = plan.prices[currency][interval]
              const isActive = activePlan === plan.id
              const isBusy = busyPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">{plan.description}</p>
                      <h3 className="text-xl font-semibold mt-1">{plan.name}</h3>
                    </div>
                    {plan.id === "impact_account" && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
                        Professional
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-3xl font-semibold">
                      {price} {symbol}
                      <span className="text-sm text-white/60">
                        {interval === "monthly" ? " / month" : " / year"}
                      </span>
                    </p>
                  </div>

                  <ul className="mt-6 space-y-2 text-sm text-white/60">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`mt-6 w-full ${
                      isActive
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
                    disabled={loading || isBusy}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isBusy ? "Updating..." : isActive ? "Active plan" : "Select plan"}
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="mt-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/15 p-3 border border-emerald-400/30">
                  <GraduationCap className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Academic verification</p>
                  <h3 className="text-lg font-semibold mt-1">
                    {t("pricing.academic.title")}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/60">
                Upload proof of enrollment or research credentials. Approved students receive
                Pro access, and approved researchers receive Impact access.
              </p>
              <Button asChild className="mt-4 bg-emerald-500 text-black hover:bg-emerald-400">
                <Link href="/account/verification">{t("pricing.academic.button")}</Link>
              </Button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-white/60">Payment methods</p>
              <div className="mt-4 space-y-2 text-sm">
                {paymentMethods.map((method) => (
                  <div key={method.label} className="flex items-center gap-2">
                    <method.icon className="w-4 h-4 text-emerald-300" />
                    <span className="text-white/60">{method.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/60">
                Payment integrations are stubbed until provider keys are configured.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
