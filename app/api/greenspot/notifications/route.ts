import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  dedupe_key: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const rawLimit = Number(url.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 40;

  let query = supabase
    .from("notifications")
    .select(
      "id, user_id, type, title, body, dedupe_key, metadata, is_read, read_at, created_at",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCountResult = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (unreadCountResult.error) {
    return NextResponse.json(
      { error: unreadCountResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notifications: (data ?? []) as NotificationRow[],
    total: count ?? (data ?? []).length,
    unread: unreadCountResult.count ?? 0,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient({ schema: "greenspot" });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
      }
    | null;

  if (body?.action !== "mark_all_read") {
    return NextResponse.json(
      { error: 'Unsupported action. Use action="mark_all_read".' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? { ok: true, updated: 0 }) as {
    ok?: boolean;
    updated?: number;
  };

  return NextResponse.json({
    ok: result.ok !== false,
    updated: Number(result.updated ?? 0),
  });
}
