import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { status, photoUrl } = body
  const { id } = await context.params

  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (photoUrl) updates.photo_url = photoUrl
  updates.completed_at = status === "done" ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from("greenspot_care_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
