"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  EduPostReportRow,
  EduReportStatus,
  MarketDisputeRow,
  MarketDisputeStatus,
  ModerationActionResult,
  ModerationDashboardPayload,
  ModerationDashboardResult,
  ModerationUserProfile,
  PlatformRole,
  SellerRequestDecision,
  SellerRequestRow,
  UserModerationAction,
} from "@/lib/moderation/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const isValidUuid = (value: string) => UUID_RE.test(value);
const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());
const isValidBanDays = (value: number) => Number.isInteger(value) && value >= 1 && value <= 7;

const normalizeRole = (value: string | null | undefined): PlatformRole => {
  const role = String(value ?? "user").toLowerCase();
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderator";
  return "user";
};

const normalizeDisputeStatus = (value: string | null | undefined): MarketDisputeStatus => {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "reviewing") return "reviewing";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "closed";
  return "pending";
};

const normalizeEduStatus = (value: string | null | undefined): EduReportStatus => {
  const status = String(value ?? "open").toLowerCase();
  if (status === "reviewed") return "reviewed";
  if (status === "dismissed") return "dismissed";
  if (status === "action_taken") return "action_taken";
  return "open";
};

const normalizeSellerRequestStatus = (
  value: string | null | undefined
): "pending" | "approved" | "denied" => {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "approved") return "approved";
  if (status === "denied") return "denied";
  return "pending";
};

const toDisplayName = (row?: {
  full_name?: string | null;
  username?: string | null;
  id?: string | null;
} | null) => {
  const full = row?.full_name?.trim();
  if (full) return full;
  const username = row?.username?.trim();
  if (username) return username;
  return row?.id ? row.id.slice(0, 8) : "Unknown";
};

async function requireModeratorActor(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<{ userId: string; role: PlatformRole }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const role = normalizeRole(profile.role);
  if (role !== "moderator" && role !== "admin") {
    throw new Error("Moderator or admin access required");
  }

  return { userId: user.id, role };
}

async function getProfilesMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  ids: string[]
) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => isValidUuid(id))));
  if (uniqueIds.length === 0) {
    return new Map<string, ModerationUserProfile>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, role, is_banned")
    .in("id", uniqueIds);

  const map = new Map<string, ModerationUserProfile>();
  for (const row of (data ?? []) as Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    role: string | null;
    is_banned: boolean | null;
  }>) {
    map.set(row.id, {
      id: row.id,
      fullName: toDisplayName(row),
      username: row.username?.trim() || row.id.slice(0, 8),
      avatarUrl: row.avatar_url ?? null,
      role: normalizeRole(row.role),
      isBanned: row.is_banned === true,
    });
  }

  return map;
}

export async function getDashboardData(): Promise<ModerationDashboardResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const actor = await requireModeratorActor(supabase);

    const [sellerRes, disputeRes, eduRes] = await Promise.all([
      supabase
        .from("seller_requests")
        .select(
          "id, user_id, requested_store_name, requested_bio, status, admin_note, created_at, reviewed_at, reviewed_by"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("market_disputes")
        .select(
          "id, source_dispute_id, buyer_id, seller_id, product_id, reason, description, status, evidence_url, admin_notes, created_at, updated_at"
        )
        .in("status", ["pending", "reviewing"])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("edu_post_reports")
        .select(
          "id, post_id, reporter_id, post_author_id, reason, details, status, action_note, created_at, reviewed_at, reviewed_by"
        )
        .in("status", ["open", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (sellerRes.error) throw new Error(sellerRes.error.message);
    if (disputeRes.error) throw new Error(disputeRes.error.message);
    if (eduRes.error) throw new Error(eduRes.error.message);

    const sellerRows = (sellerRes.data ?? []) as Array<{
      id: string;
      user_id: string;
      requested_store_name: string | null;
      requested_bio: string | null;
      status: string;
      admin_note: string | null;
      created_at: string;
      reviewed_at: string | null;
      reviewed_by: string | null;
    }>;

    const disputeRows = (disputeRes.data ?? []) as Array<{
      id: string;
      source_dispute_id: string | null;
      buyer_id: string;
      seller_id: string;
      product_id: string | null;
      reason: string;
      description: string;
      status: string;
      evidence_url: string | null;
      admin_notes: string | null;
      created_at: string;
      updated_at: string;
    }>;

    const eduRows = (eduRes.data ?? []) as Array<{
      id: string;
      post_id: string;
      reporter_id: string;
      post_author_id: string | null;
      reason: string;
      details: string | null;
      status: string;
      action_note: string | null;
      created_at: string;
      reviewed_at: string | null;
      reviewed_by: string | null;
    }>;

    const profileIds = [
      ...sellerRows.map((row) => row.user_id),
      ...sellerRows.map((row) => row.reviewed_by).filter((id): id is string => Boolean(id)),
      ...disputeRows.flatMap((row) => [row.buyer_id, row.seller_id]),
      ...eduRows.flatMap((row) => [row.reporter_id, row.post_author_id, row.reviewed_by]),
    ].filter((id): id is string => Boolean(id));

    const profilesMap = await getProfilesMap(supabase, profileIds);

    const sellerUserIds = Array.from(new Set(sellerRows.map((row) => row.user_id)));
    const { data: marketplaceProfiles } = sellerUserIds.length
      ? await supabase
          .from("marketplace_profiles")
          .select("id, role, store_name")
          .in("id", sellerUserIds)
      : { data: [] };

    const marketplaceMap = new Map(
      ((marketplaceProfiles ?? []) as Array<{ id: string; role: string | null; store_name: string | null }>).map((row) => [
        row.id,
        { storeName: row.store_name, marketplaceRole: row.role },
      ])
    );

    const productIds = Array.from(
      new Set(disputeRows.map((row) => row.product_id).filter((id): id is string => Boolean(id)))
    );

    const { data: productRows } = productIds.length
      ? await supabase
          .from("marketplace_items")
          .select("id, title, image_url, price_dzd")
          .in("id", productIds)
      : { data: [] };

    const productsMap = new Map(
      ((productRows ?? []) as Array<{
        id: string;
        title: string | null;
        image_url: string | null;
        price_dzd: number | null;
      }>).map((row) => [row.id, row])
    );

    const postIds = Array.from(new Set(eduRows.map((row) => row.post_id).filter(Boolean)));
    const { data: postRows } = postIds.length
      ? await supabase
          .from("edu_posts")
          .select("id, title, body, status, created_at")
          .in("id", postIds)
      : { data: [] };

    const postsMap = new Map(
      ((postRows ?? []) as Array<{
        id: string;
        title: string | null;
        body: string | null;
        status: string;
        created_at: string;
      }>).map((row) => [row.id, row])
    );

    const reportAuthorIds = Array.from(
      new Set(eduRows.map((row) => row.post_author_id).filter((id): id is string => Boolean(id)))
    );
    const reelsByAuthor = new Map<
      string,
      Array<{ id: string; caption: string; videoUrl: string; createdAt: string }>
    >();
    if (reportAuthorIds.length > 0) {
      const { data: reelRows, error: reelsError } = await supabase
        .from("edu_reels")
        .select("id, author_id, caption, video_url, created_at")
        .in("author_id", reportAuthorIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (reelsError) {
        const message = reelsError.message.toLowerCase();
        if (!message.includes("edu_reels") && !message.includes("does not exist")) {
          throw new Error(reelsError.message);
        }
      } else {
        for (const reel of (reelRows ?? []) as Array<{
          id: string;
          author_id: string;
          caption: string | null;
          video_url: string;
          created_at: string;
        }>) {
          const current = reelsByAuthor.get(reel.author_id);
          if (current && current.length >= 4) {
            continue;
          }
          const mapped = {
            id: reel.id,
            caption: reel.caption?.trim() || "",
            videoUrl: reel.video_url,
            createdAt: reel.created_at,
          };
          if (current) {
            current.push(mapped);
          } else {
            reelsByAuthor.set(reel.author_id, [mapped]);
          }
        }
      }
    }

    const evidencePaths = disputeRows
      .map((row) => row.evidence_url)
      .filter((value): value is string => Boolean(value && !/^https?:\/\//i.test(value)));

    const signedUrls = new Map<string, string>();
    if (evidencePaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("dispute-evidence")
        .createSignedUrls(evidencePaths, 60 * 30);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) {
          signedUrls.set(item.path, item.signedUrl);
        }
      }
    }

    const sellerRequests: SellerRequestRow[] = sellerRows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      requestedStoreName: row.requested_store_name,
      requestedBio: row.requested_bio,
      status: normalizeSellerRequestStatus(row.status),
      adminNote: row.admin_note,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      requester: profilesMap.get(row.user_id) ?? null,
      requesterMarketplace: marketplaceMap.get(row.user_id) ?? null,
    }));

    const marketDisputes: MarketDisputeRow[] = disputeRows.map((row) => {
      const resolvedEvidence = row.evidence_url
        ? /^https?:\/\//i.test(row.evidence_url)
          ? row.evidence_url
          : signedUrls.get(row.evidence_url) ?? null
        : null;

      const product = row.product_id ? productsMap.get(row.product_id) ?? null : null;

      return {
        id: row.id,
        sourceDisputeId: row.source_dispute_id,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        productId: row.product_id,
        reason: row.reason,
        description: row.description,
        status: normalizeDisputeStatus(row.status),
        evidenceUrl: resolvedEvidence,
        adminNotes: row.admin_notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        buyer: profilesMap.get(row.buyer_id) ?? null,
        seller: profilesMap.get(row.seller_id) ?? null,
        product: product
          ? {
              id: product.id,
              title: product.title ?? "Untitled product",
              imageUrl: product.image_url ?? null,
              priceDzd: product.price_dzd,
            }
          : null,
      };
    });

    const eduReports: EduPostReportRow[] = eduRows.map((row) => {
      const post = postsMap.get(row.post_id) ?? null;
      return {
        id: row.id,
        postId: row.post_id,
        reporterId: row.reporter_id,
        postAuthorId: row.post_author_id,
        reason: row.reason,
        details: row.details,
        status: normalizeEduStatus(row.status),
        actionNote: row.action_note,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        reporter: profilesMap.get(row.reporter_id) ?? null,
        postAuthor: row.post_author_id ? profilesMap.get(row.post_author_id) ?? null : null,
        post: post
          ? {
              id: post.id,
              title: post.title ?? "Untitled post",
              body: post.body,
              status: post.status,
              createdAt: post.created_at,
            }
          : null,
        reels: row.post_author_id ? reelsByAuthor.get(row.post_author_id) ?? [] : [],
      };
    });

    const payload: ModerationDashboardPayload = {
      actorId: actor.userId,
      actorRole: actor.role,
      sellerRequests,
      marketDisputes,
      eduReports,
    };

    return {
      ok: true,
      payload,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : "Unable to load moderation dashboard",
    };
  }
}

export async function handleSellerRequest(
  requestId: string,
  status: SellerRequestDecision
): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(requestId)) {
      return { ok: false, error: "Invalid request ID" };
    }

    if (status !== "approved" && status !== "denied") {
      return { ok: false, error: "Invalid request status" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_handle_seller_request", {
      p_request_id: requestId,
      p_status: status,
      p_admin_note: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/market-place/admin");
    revalidatePath("/market-place/seller-onboarding");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to handle seller request",
    };
  }
}

export async function takeActionOnUser(
  targetUserId: string,
  action: UserModerationAction
): Promise<ModerationActionResult> {
  if (!isValidUuid(targetUserId)) {
    return { ok: false, error: "Invalid target user ID" };
  }

  if (action !== "ban_user" && action !== "delete_post" && action !== "ban_seller") {
    return { ok: false, error: "Invalid moderation action" };
  }

  const supabase = await createServerSupabaseClient();
  await requireModeratorActor(supabase);

  const { data: targetProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError || !targetProfile) {
    return { ok: false, error: "Target user not found" };
  }

  if (normalizeRole(targetProfile.role) === "admin") {
    throw new Error("Unauthorized: Cannot take action against an Admin");
  }

  const { error } = await supabase.rpc("mod_take_user_action", {
    p_target_user_id: targetUserId,
    p_action: action,
    p_reason: null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/mod-dashboard");
  revalidatePath("/education/moderation");
  revalidatePath("/market-place/admin");

  return { ok: true, error: null };
}

export async function deleteEducationPost(postId: string): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(postId)) {
      return { ok: false, error: "Invalid post ID" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_delete_education_post", {
      p_post_id: postId,
      p_reason: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/education");
    revalidatePath("/education/moderation");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete education post",
    };
  }
}

export async function deleteEducationReel(reelId: string): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(reelId)) {
      return { ok: false, error: "Invalid reel ID" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_delete_education_reel", {
      p_reel_id: reelId,
      p_reason: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/education");
    revalidatePath("/education/moderation");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete education reel",
    };
  }
}

export async function banEducationUserForDays(
  targetUserId: string,
  days: number,
  reason: string
): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(targetUserId)) {
      return { ok: false, error: "Invalid target user ID" };
    }
    if (!isValidBanDays(days)) {
      return { ok: false, error: "Ban duration must be between 1 and 7 days" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return { ok: false, error: "Target user not found" };
    }

    if (normalizeRole(targetProfile.role) === "admin") {
      throw new Error("Unauthorized: Cannot take action against an Admin");
    }

    const { error } = await supabase.rpc("mod_ban_education_user", {
      p_target_user_id: targetUserId,
      p_days: days,
      p_reason: reason.trim() || null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/education");
    revalidatePath("/education/moderation");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to apply timed education ban",
    };
  }
}

export async function deleteMarketplaceProduct(productId: string): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(productId)) {
      return { ok: false, error: "Invalid product ID" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_delete_marketplace_product", {
      p_product_id: productId,
      p_reason: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/market-place");
    revalidatePath("/market-place/admin");
    revalidatePath("/market-place/admin/disputes");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete marketplace product",
    };
  }
}

export async function updateMarketDisputeStatus(
  disputeId: string,
  status: MarketDisputeStatus,
  adminNotes: string
): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(disputeId)) {
      return { ok: false, error: "Invalid dispute ID" };
    }

    if (!["pending", "reviewing", "resolved", "closed"].includes(status)) {
      return { ok: false, error: "Invalid dispute status" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_update_market_dispute", {
      p_dispute_id: disputeId,
      p_status: status,
      p_admin_notes: adminNotes.trim() || null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/market-place/admin/disputes");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update market dispute",
    };
  }
}

export async function updateEduReportStatus(
  reportId: string,
  status: EduReportStatus,
  adminNotes: string
): Promise<ModerationActionResult> {
  try {
    if (!isValidUuid(reportId)) {
      return { ok: false, error: "Invalid report ID" };
    }

    if (!["open", "reviewed", "dismissed", "action_taken"].includes(status)) {
      return { ok: false, error: "Invalid report status" };
    }

    const supabase = await createServerSupabaseClient();
    await requireModeratorActor(supabase);

    const { error } = await supabase.rpc("mod_update_edu_post_report", {
      p_report_id: reportId,
      p_status: status,
      p_admin_notes: adminNotes.trim() || null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/education/moderation");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update education report",
    };
  }
}

export async function setStaffPasswordByEmail(
  email: string,
  newPassword: string
): Promise<ModerationActionResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, error: "Enter a valid email address" };
    }

    if (newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters" };
    }

    const supabase = await createServerSupabaseClient();
    const actor = await requireModeratorActor(supabase);
    if (actor.role !== "admin") {
      return { ok: false, error: "Only admins can set staff passwords" };
    }

    const adminSupabase = createAdminSupabaseClient();

    let foundUserId: string | null = null;
    let page = 1;
    while (page <= 20 && !foundUserId) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      const match = data.users.find(
        (user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail
      );

      if (match) {
        foundUserId = match.id;
        break;
      }

      if (data.users.length < 1000) {
        break;
      }

      page += 1;
    }

    if (!foundUserId) {
      return { ok: false, error: "No account found for that email" };
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", foundUserId)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return { ok: false, error: "Target profile not found" };
    }

    const targetRole = normalizeRole(targetProfile.role);
    if (targetRole !== "moderator" && targetRole !== "admin") {
      return {
        ok: false,
        error: "Password can only be set for moderator/admin accounts",
      };
    }

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(foundUserId, {
      password: newPassword,
    });

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    revalidatePath("/mod-dashboard");
    revalidatePath("/mod-dashboard/login");

    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to set staff password",
    };
  }
}
