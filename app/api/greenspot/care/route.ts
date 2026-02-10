import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { buildCareSchedule } from "@/lib/greenspot/care"

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
  const status = searchParams.get("status")
  if (userId && userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let query = supabase
    .from("greenspot_care_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { userId, plantName, plantType, latitude, longitude, reportId } = body

  if (userId && userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!plantName || !plantType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const tasks = buildCareSchedule({
    plantName,
    plantType,
    latitude,
    longitude,
  })

  const rows = tasks.map((task) => ({
    user_id: user.id,
    greenspot_report_id: reportId ?? null,
    plant_name: plantName,
    task_type: task.task_type,
    due_at: task.due_at,
    description: task.description,
    tips: task.tips,
    status: task.status,
  }))

  const { error } = await supabase.from("greenspot_care_tasks").insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
