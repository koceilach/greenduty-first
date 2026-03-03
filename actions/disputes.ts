"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
  type AdminDisputeRow,
  type AdminDisputesResult,
  type DisputeStatus,
  type OpenDisputeResult,
  type ResolveDisputeResult,
} from "@/lib/marketplace/disputes";

const DISPUTE_BUCKET = "dispute-evidence";
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EVIDENCE_SIZE_BYTES = 7 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertUuid = (value: string, fieldName: string) => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }
};

const sanitizeFilename = (rawName: string) => {
  const cleaned = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return cleaned || "evidence";
};

const resolveExtension = (file: File) => {
  const safeName = sanitizeFilename(file.name);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "";
  if (ext) return ext;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "bin";
};

const firstRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

async function isDisputeAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  userEmail?: string | null
) {
  const { data: adminCheck, error: adminCheckError } = await supabase.rpc(
    "is_dispute_center_admin"
  );
  if (!adminCheckError && adminCheck === true) {
    return true;
  }

  const { data: profile, error: profileError } = await supabase
    .from("marketplace_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileError && profile?.role === "admin") {
    return true;
  }

  const email = String(userEmail ?? "").toLowerCase();
  if (email === "osgamer804@gmail.com") {
    return true;
  }

  return false;
}

export async function openDispute(formData: FormData): Promise<OpenDisputeResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Please log in to open a dispute." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const evidenceField = formData.get("evidence");
  const evidenceFile = evidenceField instanceof File && evidenceField.size > 0 ? evidenceField : null;

  try {
    assertUuid(productId, "productId");
    assertUuid(sellerId, "sellerId");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid dispute payload.",
    };
  }

  if (!DISPUTE_REASONS.includes(reason as (typeof DISPUTE_REASONS)[number])) {
    return { ok: false, error: "Please choose a valid dispute reason." };
  }

  if (description.length < 15) {
    return {
      ok: false,
      error: "Please provide more details (minimum 15 characters).",
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("marketplace_items")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (itemError || !item) {
    return { ok: false, error: "Product not found." };
  }

  if (item.seller_id !== sellerId) {
    return {
      ok: false,
      error: "Seller mismatch for the selected product.",
    };
  }

  if (user.id === sellerId) {
    return { ok: false, error: "You cannot open a dispute against yourself." };
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("disputes")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("product_id", productId)
    .in("status", ["pending", "reviewing"])
    .maybeSingle();

  if (duplicateError) {
    return { ok: false, error: duplicateError.message };
  }

  if (duplicate) {
    return {
      ok: false,
      error: "An open dispute already exists for this product.",
    };
  }

  let evidencePath: string | null = null;
  if (evidenceFile) {
    if (!ALLOWED_MIME_TYPES.has(evidenceFile.type)) {
      return {
        ok: false,
        error: "Unsupported evidence format. Allowed: JPG, PNG, WEBP.",
      };
    }

    if (evidenceFile.size > MAX_EVIDENCE_SIZE_BYTES) {
      return {
        ok: false,
        error: "Evidence file is too large. Max size is 7MB.",
      };
    }

    const ext = resolveExtension(evidenceFile);
    evidencePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(DISPUTE_BUCKET)
      .upload(evidencePath, evidenceFile, {
        upsert: false,
        contentType: evidenceFile.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      return {
        ok: false,
        error: `Evidence upload failed: ${uploadError.message}`,
      };
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("disputes")
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      product_id: productId,
      reason,
      description,
      status: "pending",
      evidence_url: evidencePath,
    })
    .select("id")
    .single();

  if (insertError) {
    if (evidencePath) {
      await supabase.storage.from(DISPUTE_BUCKET).remove([evidencePath]);
    }
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/market-place");
  revalidatePath("/market-place/orders");
  revalidatePath("/market-place/admin/disputes");

  return {
    ok: true,
    error: null,
    disputeId: inserted.id as string,
  };
}

export async function getAdminDisputes(): Promise<AdminDisputesResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      error: "Authentication required.",
      disputes: [],
    };
  }

  const admin = await isDisputeAdmin(supabase, user.id, user.email ?? null);
  if (!admin) {
    return {
      ok: false,
      error: "Admin access required.",
      disputes: [],
    };
  }

  const { data, error } = await supabase
    .from("disputes")
    .select(
      "id, buyer_id, seller_id, product_id, reason, description, status, evidence_url, admin_notes, created_at, updated_at, buyer:marketplace_profiles!disputes_buyer_id_fkey(id, username, email, avatar_url), seller:marketplace_profiles!disputes_seller_id_fkey(id, username, email, avatar_url, role), product:marketplace_items!disputes_product_id_fkey(id, title, image_url, price_dzd)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message,
      disputes: [],
    };
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const buyerRaw = firstRelation(
      row.buyer as
        | {
            id: string;
            username: string | null;
            email: string | null;
            avatar_url: string | null;
          }
        | Array<{
            id: string;
            username: string | null;
            email: string | null;
            avatar_url: string | null;
          }>
        | null
    );

    const sellerRaw = firstRelation(
      row.seller as
        | {
            id: string;
            username: string | null;
            email: string | null;
            avatar_url: string | null;
            role: string | null;
          }
        | Array<{
            id: string;
            username: string | null;
            email: string | null;
            avatar_url: string | null;
            role: string | null;
          }>
        | null
    );

    const productRaw = firstRelation(
      row.product as
        | {
            id: string;
            title: string | null;
            image_url: string | null;
            price_dzd: number | null;
          }
        | Array<{
            id: string;
            title: string | null;
            image_url: string | null;
            price_dzd: number | null;
          }>
        | null
    );

    return {
      id: String(row.id ?? ""),
      buyer_id: String(row.buyer_id ?? ""),
      seller_id: String(row.seller_id ?? ""),
      product_id: String(row.product_id ?? ""),
      reason: String(row.reason ?? ""),
      description: String(row.description ?? ""),
      status: String(row.status ?? "pending") as DisputeStatus,
      evidence_url: (row.evidence_url as string | null) ?? null,
      evidence_signed_url: null,
      admin_notes: (row.admin_notes as string | null) ?? null,
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      buyer: buyerRaw
        ? {
            id: buyerRaw.id,
            username: buyerRaw.username,
            email: buyerRaw.email,
            avatar_url: buyerRaw.avatar_url,
          }
        : null,
      seller: sellerRaw
        ? {
            id: sellerRaw.id,
            username: sellerRaw.username,
            email: sellerRaw.email,
            avatar_url: sellerRaw.avatar_url,
            role: sellerRaw.role,
          }
        : null,
      product: productRaw
        ? {
            id: productRaw.id,
            title: productRaw.title,
            image_url: productRaw.image_url,
            price_dzd: productRaw.price_dzd,
          }
        : null,
    } satisfies AdminDisputeRow;
  });

  const evidencePaths = rows
    .map((row) => row.evidence_url)
    .filter((path): path is string => Boolean(path));

  const signedMap = new Map<string, string>();
  if (evidencePaths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from(DISPUTE_BUCKET)
      .createSignedUrls(evidencePaths, 60 * 60);

    for (const signed of signedData ?? []) {
      if (signed.path && signed.signedUrl) {
        signedMap.set(signed.path, signed.signedUrl);
      }
    }
  }

  const disputes: AdminDisputeRow[] = rows.map((row) => ({
    ...row,
    evidence_signed_url: row.evidence_url ? signedMap.get(row.evidence_url) ?? null : null,
  }));

  return {
    ok: true,
    error: null,
    disputes,
  };
}

export async function resolveDispute(
  disputeId: string,
  newStatus: DisputeStatus,
  adminNotes: string
): Promise<ResolveDisputeResult> {
  try {
    assertUuid(disputeId, "disputeId");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid dispute ID.",
    };
  }

  if (!DISPUTE_STATUSES.includes(newStatus)) {
    return { ok: false, error: "Invalid dispute status." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Authentication required." };
  }

  const admin = await isDisputeAdmin(supabase, user.id, user.email ?? null);
  if (!admin) {
    return { ok: false, error: "Admin access required." };
  }

  const nextNotes = adminNotes.trim();

  const { error } = await supabase
    .from("disputes")
    .update({
      status: newStatus,
      admin_notes: nextNotes.length > 0 ? nextNotes : null,
    })
    .eq("id", disputeId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/market-place/admin/disputes");
  revalidatePath("/market-place/admin");

  return { ok: true, error: null };
}

export async function banSellerFromDispute(
  disputeId: string,
  adminNotes: string
): Promise<ResolveDisputeResult> {
  try {
    assertUuid(disputeId, "disputeId");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid dispute ID.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Authentication required." };
  }

  const admin = await isDisputeAdmin(supabase, user.id, user.email ?? null);
  if (!admin) {
    return { ok: false, error: "Admin access required." };
  }

  const { data: dispute, error: disputeError } = await supabase
    .from("disputes")
    .select("id, seller_id, admin_notes")
    .eq("id", disputeId)
    .maybeSingle();

  if (disputeError || !dispute) {
    return { ok: false, error: "Dispute not found." };
  }

  const { data: sellerProfile, error: sellerError } = await supabase
    .from("marketplace_profiles")
    .select("id, role")
    .eq("id", dispute.seller_id)
    .maybeSingle();

  if (sellerError || !sellerProfile) {
    return { ok: false, error: "Seller profile not found." };
  }

  if (sellerProfile.role === "admin") {
    return { ok: false, error: "Admin accounts cannot be banned through this action." };
  }

  const { error: demoteError } = await supabase
    .from("marketplace_profiles")
    .update({
      role: "buyer",
      store_name: null,
    })
    .eq("id", dispute.seller_id);

  if (demoteError) {
    return { ok: false, error: demoteError.message };
  }

  const banLog = `Seller blocked from selling by admin ${user.id} on ${new Date().toISOString()}.`;
  const mergedNotes = [
    dispute.admin_notes?.trim(),
    adminNotes.trim() || null,
    banLog,
  ]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join("\n\n");

  const { error: updateDisputeError } = await supabase
    .from("disputes")
    .update({
      status: "closed",
      admin_notes: mergedNotes,
    })
    .eq("id", disputeId);

  if (updateDisputeError) {
    return {
      ok: false,
      error: `Seller role changed, but dispute update failed: ${updateDisputeError.message}`,
    };
  }

  revalidatePath("/market-place/admin/disputes");
  revalidatePath("/market-place/admin");
  revalidatePath("/market-place");

  return { ok: true, error: null };
}
