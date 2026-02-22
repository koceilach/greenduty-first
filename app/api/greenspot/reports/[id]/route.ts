import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildCareSchedule } from "@/lib/greenspot/care";

const isSchemaMismatch = (message: string) =>
  /column .* does not exist|relation .* does not exist|schema cache|table .* does not exist/i.test(
    message
  );
const isPermissionIssue = (message: string) =>
  /permission denied|not allowed|row-level security/i.test(message);
const isUniqueViolation = (message: string) =>
  /duplicate key|unique constraint|violates unique/i.test(message);

const getFallbackName = (user: User) =>
  user.user_metadata?.full_name ||
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  "GreenSpot Member";

const parseCoordinates = (text?: string | null) => {
  if (!text) return null;
  const match = text.match(/(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const cleanAreaLabel = (value?: string | null) => {
  const safe = (value ?? "").trim();
  if (!safe) return "Community Spot";
  return safe
    .replace(/\s*\(-?\d{1,3}(?:\.\d+)?,\s*-?\d{1,3}(?:\.\d+)?\)\s*$/, "")
    .trim();
};

const derivePlantType = (value?: string | null): "Tree" | "Plant" => {
  const normalized = (value ?? "").toLowerCase();
  if (
    normalized.includes("tree") ||
    normalized.includes("logging") ||
    normalized.includes("forest")
  ) {
    return "Tree";
  }
  return "Plant";
};

const resolveDisplayName = async (
  user: User,
  greenspotClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  publicClient: Awaited<ReturnType<typeof createServerSupabaseClient>>
) => {
  const greenspotProfile = await greenspotClient
    .from("greenspot_profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!greenspotProfile.error) {
    return (
      greenspotProfile.data?.full_name ||
      greenspotProfile.data?.username ||
      getFallbackName(user)
    );
  }
  if (!isSchemaMismatch(greenspotProfile.error.message)) {
    throw new Error(greenspotProfile.error.message);
  }

  const legacyProfile = await publicClient
    .from("marketplace_profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!legacyProfile.error) {
    return (
      legacyProfile.data?.full_name ||
      legacyProfile.data?.username ||
      getFallbackName(user)
    );
  }
  if (!isSchemaMismatch(legacyProfile.error.message)) {
    throw new Error(legacyProfile.error.message);
  }

  const fallbackLegacyProfile = await publicClient
    .from("marketplace_profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (fallbackLegacyProfile.error) {
    throw new Error(fallbackLegacyProfile.error.message);
  }

  return fallbackLegacyProfile.data?.username || getFallbackName(user);
};

type AcceptResult = {
  createdTasks: number;
  status: string;
  acceptedBy: string;
};

type ClaimResult = {
  acceptedBy: string;
  status: string;
};

const ensureReportClaim = async (
  reportId: string,
  user: User,
  displayName: string,
  greenspotClient: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<ClaimResult> => {
  const readClaim = () =>
    greenspotClient
      .from("greenspot_report_claims")
      .select("report_id, accepted_by_user_id, accepted_by_name")
      .eq("report_id", reportId)
      .maybeSingle();

  const toStatus = (name: string) => `Accepted by ${name}`;

  let claimQuery = await readClaim();
  if (claimQuery.error) {
    if (isSchemaMismatch(claimQuery.error.message)) {
      throw new Error("Report claim system is unavailable. Apply latest migrations.");
    }
    throw new Error(claimQuery.error.message);
  }

  const claim = claimQuery.data;
  if (claim) {
    const acceptedBy = (claim.accepted_by_name ?? "").trim() || "another user";
    if (claim.accepted_by_user_id !== user.id) {
      throw new Error(`This report has already been accepted by ${acceptedBy}.`);
    }
    return {
      acceptedBy,
      status: toStatus(acceptedBy),
    };
  }

  const insertClaim = await greenspotClient
    .from("greenspot_report_claims")
    .insert({
      report_id: reportId,
      accepted_by_user_id: user.id,
      accepted_by_name: displayName,
    })
    .select("accepted_by_name")
    .maybeSingle();

  if (insertClaim.error) {
    if (isSchemaMismatch(insertClaim.error.message)) {
      throw new Error("Report claim system is unavailable. Apply latest migrations.");
    }
    if (!isUniqueViolation(insertClaim.error.message)) {
      throw new Error(insertClaim.error.message);
    }

    claimQuery = await readClaim();
    if (claimQuery.error) {
      throw new Error(claimQuery.error.message);
    }

    const conflictClaim = claimQuery.data;
    if (!conflictClaim) {
      throw new Error("This report has already been accepted by another user.");
    }
    const acceptedBy = (conflictClaim.accepted_by_name ?? "").trim() || "another user";
    if (conflictClaim.accepted_by_user_id !== user.id) {
      throw new Error(`This report has already been accepted by ${acceptedBy}.`);
    }
    return {
      acceptedBy,
      status: toStatus(acceptedBy),
    };
  }

  const acceptedBy = (insertClaim.data?.accepted_by_name ?? "").trim() || displayName;
  return {
    acceptedBy,
    status: toStatus(acceptedBy),
  };
};

const acceptReportInLegacySchema = async (
  id: string,
  user: User,
  displayName: string,
  greenspotClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  publicClient: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<AcceptResult> => {
  const { data: report, error: reportError } = await publicClient
    .from("greenspot_reports")
    .select("id, user_id, location_name, region, category, status")
    .eq("id", id)
    .maybeSingle();

  if (reportError) {
    throw new Error(reportError.message);
  }
  if (!report) {
    throw new Error("Report not found.");
  }
  if (report.user_id === user.id) {
    throw new Error("You cannot accept your own report.");
  }

  const claim = await ensureReportClaim(id, user, displayName, greenspotClient);
  const acceptedStatus = claim.status;
  const currentStatus = (report.status ?? "").trim();
  const normalizedCurrentStatus = currentStatus.toLowerCase();
  const normalizedAcceptedStatus = acceptedStatus.toLowerCase();

  const existingTasks = await publicClient
    .from("greenspot_care_tasks")
    .select("id")
    .eq("user_id", user.id)
    .eq("greenspot_report_id", id)
    .limit(1);

  if (existingTasks.error) {
    throw new Error(existingTasks.error.message);
  }

  let createdTasks = 0;
  if ((existingTasks.data ?? []).length === 0) {
    const parsedCoordinates =
      parseCoordinates(report.location_name) || parseCoordinates(report.region);
    const plantName = cleanAreaLabel(report.location_name || report.region);
    const plantType = derivePlantType(report.category);
    const schedule = buildCareSchedule({
      plantName,
      plantType,
      latitude: parsedCoordinates?.lat ?? null,
      longitude: parsedCoordinates?.lng ?? null,
    });

    const rows = schedule.map((task) => ({
      user_id: user.id,
      greenspot_report_id: id,
      plant_name: plantName,
      task_type: task.task_type,
      due_at: task.due_at,
      description: task.description,
      tips: task.tips,
      status: task.status,
    }));

    const { error: insertError } = await publicClient
      .from("greenspot_care_tasks")
      .insert(rows);
    if (insertError) {
      throw new Error(insertError.message);
    }
    createdTasks = rows.length;
  }

  if (normalizedCurrentStatus !== normalizedAcceptedStatus) {
    const { error: updateError } = await publicClient
      .from("greenspot_reports")
      .update({ status: acceptedStatus })
      .eq("id", id);

    if (
      updateError &&
      !isPermissionIssue(updateError.message) &&
      !isSchemaMismatch(updateError.message)
    ) {
      throw new Error(updateError.message);
    }
  }

  return {
    createdTasks,
    acceptedBy: claim.acceptedBy,
    status: acceptedStatus,
  };
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing report id." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        action?: string;
        nextState?: string;
        reason?: string;
      }
    | null;

  const action = payload?.action ?? "accept";
  if (action !== "accept" && action !== "set_lifecycle") {
    return NextResponse.json(
      { error: "Unsupported action. Use action=\"accept\" or action=\"set_lifecycle\"." },
      { status: 400 }
    );
  }

  const greenspotClient = await createServerSupabaseClient({ schema: "greenspot" });
  const publicClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await greenspotClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (action === "set_lifecycle") {
      const nextState = payload?.nextState?.trim().toLowerCase() ?? "";
      if (!nextState) {
        return NextResponse.json(
          { error: "nextState is required for action=\"set_lifecycle\"." },
          { status: 400 }
        );
      }

      const transition = await greenspotClient.rpc("transition_report_lifecycle", {
        p_report_id: id,
        p_next_state: nextState,
        p_reason: payload?.reason?.trim() || null,
      });

      if (transition.error) {
        const message = transition.error.message;
        if (isSchemaMismatch(message)) {
          return NextResponse.json(
            { error: "Lifecycle transition function is unavailable. Apply latest GreenSpot migrations." },
            { status: 501 }
          );
        }
        const normalized = message.toLowerCase();
        const statusCode = normalized.includes("report not found")
          ? 404
          : normalized.includes("not authorized")
            ? 403
            : normalized.includes("invalid lifecycle transition") ||
                normalized.includes("invalid lifecycle state")
              ? 400
              : 500;
        return NextResponse.json({ error: message }, { status: statusCode });
      }

      const result = (transition.data ?? {}) as {
        ok?: boolean;
        report_id?: string;
        previous_state?: string;
        next_state?: string;
        status?: string;
        accepted_at?: string | null;
        accepted_by?: string | null;
        in_progress_at?: string | null;
        in_progress_by?: string | null;
        verified_at?: string | null;
        verified_by?: string | null;
        completed_at?: string | null;
        completed_by?: string | null;
        rejected_at?: string | null;
        rejected_by?: string | null;
        rejected_reason?: string | null;
        unchanged?: boolean;
      };

      return NextResponse.json({
        ok: result.ok !== false,
        reportId: result.report_id ?? id,
        previousState: result.previous_state ?? null,
        lifecycleState: result.next_state ?? nextState,
        status: result.status ?? null,
        unchanged: result.unchanged ?? false,
        acceptedAt: result.accepted_at ?? null,
        acceptedBy: result.accepted_by ?? null,
        inProgressAt: result.in_progress_at ?? null,
        inProgressBy: result.in_progress_by ?? null,
        verifiedAt: result.verified_at ?? null,
        verifiedBy: result.verified_by ?? null,
        completedAt: result.completed_at ?? null,
        completedBy: result.completed_by ?? null,
        rejectedAt: result.rejected_at ?? null,
        rejectedBy: result.rejected_by ?? null,
        rejectedReason: result.rejected_reason ?? null,
      });
    }

    const displayName = await resolveDisplayName(user, greenspotClient, publicClient);

    const transactionalAccept = await greenspotClient.rpc(
      "accept_report_transactional",
      { p_report_id: id }
    );

    if (!transactionalAccept.error && transactionalAccept.data) {
      const payload = transactionalAccept.data as {
        report_id?: string;
        accepted_by?: string;
        accepted_by_user_id?: string;
        status?: string;
        lifecycle_state?: string;
        accepted_at?: string;
        created_tasks?: number;
      };

      return NextResponse.json({
        ok: true,
        reportId: payload.report_id ?? id,
        acceptedBy: payload.accepted_by ?? displayName,
        acceptedByUserId: payload.accepted_by_user_id ?? user.id,
        status: payload.status ?? `Accepted by ${displayName}`,
        lifecycleState: payload.lifecycle_state ?? "accepted",
        acceptedAt: payload.accepted_at ?? new Date().toISOString(),
        createdTasks: Number(payload.created_tasks ?? 0),
      });
    }

    if (
      transactionalAccept.error &&
      !isSchemaMismatch(transactionalAccept.error.message)
    ) {
      const message = transactionalAccept.error.message;
      const normalized = message.toLowerCase();
      const statusCode = normalized.includes("report not found")
        ? 404
        : normalized.includes("cannot accept your own report")
          ? 403
          : normalized.includes("already been accepted")
            ? 409
            : 500;
      return NextResponse.json({ error: message }, { status: statusCode });
    }

    const reportQuery = await greenspotClient
      .from("greenspot_reports")
      .select("id, user_id, area, location_name, category, waste_type, lat, lng, status, verified_count, lifecycle_state")
      .eq("id", id)
      .maybeSingle();

    if (reportQuery.error && isSchemaMismatch(reportQuery.error.message)) {
      const result = await acceptReportInLegacySchema(
        id,
        user,
        displayName,
        greenspotClient,
        publicClient
      );
      return NextResponse.json({
        ok: true,
        reportId: id,
        acceptedBy: result.acceptedBy,
        status: result.status,
        createdTasks: result.createdTasks,
      });
    }
    if (reportQuery.error) {
      return NextResponse.json({ error: reportQuery.error.message }, { status: 500 });
    }
    if (!reportQuery.data) {
      const result = await acceptReportInLegacySchema(
        id,
        user,
        displayName,
        greenspotClient,
        publicClient
      );
      return NextResponse.json({
        ok: true,
        reportId: id,
        acceptedBy: result.acceptedBy,
        status: result.status,
        createdTasks: result.createdTasks,
      });
    }

    const report = reportQuery.data;
    if (report.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own report." },
        { status: 403 }
      );
    }
    const claim = await ensureReportClaim(id, user, displayName, greenspotClient);
    const acceptedStatus = claim.status;
    const currentStatus = (report.status ?? "").trim();
    const normalizedCurrentStatus = currentStatus.toLowerCase();
    const normalizedAcceptedStatus = acceptedStatus.toLowerCase();

    const existingTasks = await greenspotClient
      .from("greenspot_care_tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("greenspot_report_id", id)
      .limit(1);

    if (existingTasks.error) {
      if (isSchemaMismatch(existingTasks.error.message)) {
        const result = await acceptReportInLegacySchema(
          id,
          user,
          displayName,
          greenspotClient,
          publicClient
        );
        return NextResponse.json({
          ok: true,
          reportId: id,
          acceptedBy: result.acceptedBy,
          status: result.status,
          createdTasks: result.createdTasks,
        });
      }
      return NextResponse.json({ error: existingTasks.error.message }, { status: 500 });
    }

    let createdTasks = 0;
    if ((existingTasks.data ?? []).length === 0) {
      const plantName = cleanAreaLabel(report.location_name || report.area);
      const plantType = derivePlantType(report.waste_type || report.category);
      const schedule = buildCareSchedule({
        plantName,
        plantType,
        latitude: report.lat ?? null,
        longitude: report.lng ?? null,
      });

      const rows = schedule.map((task) => ({
        user_id: user.id,
        greenspot_report_id: id,
        plant_name: plantName,
        task_type: task.task_type,
        due_at: task.due_at,
        description: task.description,
        tips: task.tips,
        status: task.status,
      }));

      const { error: insertError } = await greenspotClient
        .from("greenspot_care_tasks")
        .insert(rows);
      if (insertError) {
        if (isSchemaMismatch(insertError.message)) {
          const result = await acceptReportInLegacySchema(
            id,
            user,
            displayName,
            greenspotClient,
            publicClient
          );
          return NextResponse.json({
            ok: true,
            reportId: id,
            acceptedBy: result.acceptedBy,
            status: result.status,
            createdTasks: result.createdTasks,
          });
        }
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      createdTasks = rows.length;
    }

    if (normalizedCurrentStatus !== normalizedAcceptedStatus) {
      const currentVerified = Number(report.verified_count ?? 0);
      const nextVerified =
        Number.isFinite(currentVerified) && currentVerified >= 0
          ? currentVerified + 1
          : 1;

      const { error: updateError } = await greenspotClient
        .from("greenspot_reports")
        .update({
          status: acceptedStatus,
          verified_count: nextVerified,
          lifecycle_state: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
          in_progress_at: new Date().toISOString(),
          in_progress_by: user.id,
        })
        .eq("id", id);

      if (
        updateError &&
        !isSchemaMismatch(updateError.message) &&
        !isPermissionIssue(updateError.message)
      ) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      const lifecycleEvent = await greenspotClient
        .from("report_lifecycle_events")
        .insert({
          report_id: id,
          actor_user_id: user.id,
          action: "report.accepted",
          previous_state: report.lifecycle_state ?? "reported",
          next_state: "accepted",
          metadata: {
            accepted_by_name: claim.acceptedBy,
            created_tasks: createdTasks,
          },
        });

      if (
        lifecycleEvent.error &&
        !isSchemaMismatch(lifecycleEvent.error.message) &&
        !isPermissionIssue(lifecycleEvent.error.message)
      ) {
        console.warn(
          "Lifecycle event write failed:",
          lifecycleEvent.error.message
        );
      }
    }

    return NextResponse.json({
      ok: true,
      reportId: id,
      acceptedBy: claim.acceptedBy,
      status: acceptedStatus,
      createdTasks,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to accept this report.";
    const statusCode =
      message.toLowerCase() === "report not found."
        ? 404
        : message.toLowerCase().includes("cannot accept your own report")
          ? 403
        : message.toLowerCase().includes("already been accepted")
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing report id." }, { status: 400 });
  }

  const greenspotClient = await createServerSupabaseClient({ schema: "greenspot" });
  const publicClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await greenspotClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleteFromLegacySchema = async () => {
    const { data: legacyReport, error: legacyReportError } = await publicClient
      .from("greenspot_reports")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (legacyReportError) {
      return NextResponse.json({ error: legacyReportError.message }, { status: 500 });
    }
    if (!legacyReport) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const { data: legacyProfile } = await publicClient
      .from("marketplace_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = legacyProfile?.role === "admin";
    if (legacyReport.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await publicClient
      .from("greenspot_reports")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  };

  const { data: report, error: reportError } = await greenspotClient
    .from("greenspot_reports")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (reportError) {
    if (isSchemaMismatch(reportError.message)) {
      return await deleteFromLegacySchema();
    }
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  if (!report) {
    return await deleteFromLegacySchema();
  }

  const { data: profile, error: profileError } = await greenspotClient
    .from("greenspot_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    if (isSchemaMismatch(profileError.message)) {
      return await deleteFromLegacySchema();
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const isAdmin = profile?.role === "admin";
  if (report.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await greenspotClient
    .from("greenspot_reports")
    .delete()
    .eq("id", id);

  if (deleteError) {
    if (isSchemaMismatch(deleteError.message)) {
      return await deleteFromLegacySchema();
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
