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
    <main className="min-h-screen gd-page-bg--blue text-white flex items-center justify-center">
      <p className="text-sm text-white/70">Finalizing sign-in...</p>
    </main>
  )
}
