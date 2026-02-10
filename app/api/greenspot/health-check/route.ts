import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { analyzeHealthStub } from "@/lib/greenspot/health"

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const plantName = form.get("plantName") as string | null
  const file = form.get("photo") as File | null
  const reportId = form.get("reportId") as string | null

  if (!plantName || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const result = analyzeHealthStub(file.name)
  const now = new Date().toISOString()

  const { data: insertData, error } = await supabase
    .from("greenspot_health_checks")
    .insert({
      user_id: user.id,
      greenspot_report_id: reportId ?? null,
      plant_name: plantName,
      status: result.status,
      issues: result.issues,
      actions: result.actions,
      checked_at: now,
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (result.status !== "Healthy") {
    const taskType = result.status === "Overwatering" ? "seasonal_care" : "watering"
    await supabase.from("greenspot_care_tasks").insert({
      user_id: user.id,
      greenspot_report_id: reportId ?? null,
      plant_name: plantName,
      task_type: taskType,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      description: `Follow-up after health check: ${result.status}.`,
      tips: result.actions.join(" "),
      status: "not_done",
    })
  }

  return NextResponse.json({ ok: true, health: insertData })
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (userId && userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("greenspot_health_checks")
    .select("*")
    .eq("user_id", user.id)
    .order("checked_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ checks: data ?? [] })
}
