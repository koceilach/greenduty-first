import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const isSchemaMismatch = (message: string) =>
  /column .* does not exist|relation .* does not exist|schema cache|table .* does not exist/i.test(
    message
  )

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

  const { data: currentTask, error: currentTaskError } = await supabase
    .from("greenspot_care_tasks")
    .select("id, status, greenspot_report_id, plant_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (currentTaskError) {
    return NextResponse.json({ error: currentTaskError.message }, { status: 500 })
  }
  if (!currentTask) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (photoUrl) updates.photo_url = photoUrl
  if (status !== undefined) {
    updates.completed_at = status === "done" ? new Date().toISOString() : null
  }

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

  let reportCompleted = false
  let completionNotice: string | null = null

  const transitionedToDone = currentTask.status !== "done" && status === "done"
  const reportId = currentTask.greenspot_report_id

  if (transitionedToDone && reportId) {
    const { count, error: remainingError } = await supabase
      .from("greenspot_care_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("greenspot_report_id", reportId)
      .neq("status", "done")

    if (!remainingError && (count ?? 0) === 0) {
      const { data: reportRow, error: reportLoadError } = await supabase
        .from("greenspot_reports")
        .select("id, user_id, lifecycle_state")
        .eq("id", reportId)
        .maybeSingle()

      if (!reportLoadError && reportRow) {
        const previousState = reportRow.lifecycle_state ?? "in_progress"
        const { error: reportUpdateError } = await supabase
          .from("greenspot_reports")
          .update({
            lifecycle_state: "completed",
            completed_at: new Date().toISOString(),
            completed_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId)

        if (!reportUpdateError) {
          reportCompleted = true
          completionNotice = "All care tasks for this report are complete."

          const lifecycleInsert = await supabase.from("report_lifecycle_events").insert({
            report_id: reportId,
            actor_user_id: user.id,
            action: "report.completed",
            previous_state: previousState,
            next_state: "completed",
            metadata: {
              source: "care_task_completion",
              task_id: id,
              plant_name: currentTask.plant_name ?? null,
            },
          })

          if (
            lifecycleInsert.error &&
            !isSchemaMismatch(lifecycleInsert.error.message)
          ) {
            console.warn(
              "Lifecycle event insert failed:",
              lifecycleInsert.error.message
            )
          }

          const notifyResult = await supabase.rpc("push_notification", {
            p_user_id: user.id,
            p_type: "care.completed",
            p_title: "Care cycle completed",
            p_body: "Great work. All reminder tasks for one report are now marked as done.",
            p_dedupe_key: `care:completed:${reportId}:${user.id}`,
            p_metadata: { report_id: reportId },
          })

          if (
            notifyResult.error &&
            !isSchemaMismatch(notifyResult.error.message)
          ) {
            console.warn(
              "Completion notification failed:",
              notifyResult.error.message
            )
          }
        } else if (!isSchemaMismatch(reportUpdateError.message)) {
          console.warn(
            "Report completion lifecycle update failed:",
            reportUpdateError.message
          )
        }
      } else if (reportLoadError && !isSchemaMismatch(reportLoadError.message)) {
        console.warn("Report lifecycle lookup failed:", reportLoadError.message)
      }
    } else if (remainingError && !isSchemaMismatch(remainingError.message)) {
      console.warn("Remaining care-task count failed:", remainingError.message)
    }
  }

  return NextResponse.json({ ok: true, reportCompleted, completionNotice })
}
