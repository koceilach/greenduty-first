import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const notificationId = Number(id);
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return NextResponse.json({ error: "Invalid notification id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        read?: boolean;
      }
    | null;

  if (body?.read === true) {
    const { data, error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });
    if (error) {
      const status = error.message.toLowerCase().includes("not found") ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ ok: true, result: data ?? null });
  }

  if (body?.read === false) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: false, read_at: null })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  return NextResponse.json({ error: "Provide read=true or read=false." }, { status: 400 });
}
