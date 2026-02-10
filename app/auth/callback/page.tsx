"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabaseClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const finalize = async () => {
      await supabaseClient.auth.getSession()
      const params = new URLSearchParams(window.location.search)
      const next = params.get("next") || "/greenspot"
      router.replace(next)
    }
    finalize()
  }, [router])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_#0b0f12,_#0a0d10_55%,_#0b0f12)] text-white flex items-center justify-center">
      <p className="text-sm text-white/70">Finalizing sign-in...</p>
    </main>
  )
}
