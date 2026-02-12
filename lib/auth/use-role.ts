"use client"

import { useEffect, useState } from "react"
import type { AccountRole } from "./roles"

export function useAccountRole() {
  const [role, setRole] = useState<AccountRole>("basic_account")

  useEffect(() => {
    const stored = localStorage.getItem("gd_role") as AccountRole | null
    if (stored) {
      setRole(stored)
      return
    }
    setRole("basic_account")
  }, [])

  return role
}
