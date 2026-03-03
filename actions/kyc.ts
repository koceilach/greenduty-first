"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type KycActionResult = {
  ok: boolean;
  error: string | null;
  requestId?: string;
};

const KYC_BUCKET = "kyc-documents";
const MAX_KYC_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeFilename = (rawName: string) => {
  const cleaned = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return cleaned || "kyc-document";
};

const extensionFromMime = (mimeType: string) => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
};

const ensureValidUuid = (value: string, fieldName: string) => {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }
};

async function isMarketplaceAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  actorId: string
) {
  const { data: rpcData, error: rpcError } = await supabase.rpc("is_marketplace_admin");
  if (!rpcError) return rpcData === true;

  const { data: profile, error: profileError } = await supabase
    .from("marketplace_profiles")
    .select("role")
    .eq("id", actorId)
    .maybeSingle();

  if (profileError) {
    return false;
  }

  return profile?.role === "admin";
}

export async function submitKycRequest(formData: FormData): Promise<KycActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be logged in to submit KYC." };
  }

  const document = formData.get("document");
  if (!(document instanceof File) || document.size <= 0) {
    return { ok: false, error: "Please select a valid ID image." };
  }

  if (!ALLOWED_MIME_TYPES.has(document.type)) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed: JPG, PNG, WEBP.",
    };
  }

  if (document.size > MAX_KYC_IMAGE_BYTES) {
    return {
      ok: false,
      error: "File is too large. Maximum size is 6MB.",
    };
  }

  const { data: pendingRequest, error: pendingError } = await supabase
    .from("kyc_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) {
    return { ok: false, error: pendingError.message };
  }

  if (pendingRequest) {
    return {
      ok: false,
      error: "You already have a pending KYC request under review.",
    };
  }

  const safeName = sanitizeFilename(document.name);
  const inferredExt = safeName.includes(".")
    ? safeName.split(".").pop() || extensionFromMime(document.type)
    : extensionFromMime(document.type);
  const objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${inferredExt}`;

  const { error: uploadError } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(objectPath, document, {
      contentType: document.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: createdRow, error: insertError } = await supabase
    .from("kyc_requests")
    .insert({
      user_id: user.id,
      status: "pending",
      document_url: objectPath,
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from(KYC_BUCKET).remove([objectPath]);
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/market-place");
  revalidatePath("/market-place/profile");

  return {
    ok: true,
    error: null,
    requestId: createdRow.id as string,
  };
}

export async function approveKyc(
  requestId: string,
  userId: string
): Promise<KycActionResult> {
  try {
    ensureValidUuid(requestId, "requestId");
    ensureValidUuid(userId, "userId");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid input.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: actor },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !actor) {
    return { ok: false, error: "Authentication required." };
  }

  const admin = await isMarketplaceAdmin(supabase, actor.id);
  if (!admin) {
    return { ok: false, error: "Admin access required." };
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("kyc_requests")
    .select("id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return { ok: false, error: requestError.message };
  }

  if (!requestRow) {
    return { ok: false, error: "KYC request not found." };
  }

  if (requestRow.user_id !== userId) {
    return {
      ok: false,
      error: "Request/user mismatch. Approval aborted.",
    };
  }

  const { error: updateRequestError } = await supabase
    .from("kyc_requests")
    .update({ status: "approved" })
    .eq("id", requestId)
    .eq("user_id", userId);

  if (updateRequestError) {
    return { ok: false, error: updateRequestError.message };
  }

  const { error: verifyError } = await supabase
    .from("marketplace_profiles")
    .update({ is_verified: true })
    .eq("id", userId);

  if (verifyError) {
    await supabase
      .from("kyc_requests")
      .update({ status: "pending" })
      .eq("id", requestId)
      .eq("user_id", userId);

    return {
      ok: false,
      error: `Request was approved, but profile verification failed: ${verifyError.message}`,
    };
  }

  revalidatePath("/market-place");
  revalidatePath("/market-place/admin");
  revalidatePath(`/market-place/profile/${userId}`);

  return {
    ok: true,
    error: null,
    requestId,
  };
}
