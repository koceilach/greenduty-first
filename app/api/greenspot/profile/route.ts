import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const NAME_COOLDOWN_DAYS = 14;
const NAME_COOLDOWN_MS = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

type ProfileRow = {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  name_last_changed_at?: string | null;
  account_tier?: string | null;
  verification_status?: string | null;
  updated_at?: string | null;
};

type ProfileCapabilities = {
  source: "greenspot" | "legacy";
  hasFullName: boolean;
  hasUsername: boolean;
  hasBio: boolean;
  hasNameLastChangedAt: boolean;
};

type LoadedProfile = {
  row: ProfileRow;
  capabilities: ProfileCapabilities;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

const isSchemaMismatch = (message: string) =>
  /column .* does not exist|relation .* does not exist|schema cache|table .* does not exist/i.test(
    message
  );

const getFallbackName = (user: User) =>
  user.user_metadata?.full_name ||
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  "GreenSpot Member";

const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 60);

const normalizeBio = (value: string) => value.trim().slice(0, 280);

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNameTimestamps = (
  row: ProfileRow,
  capabilities: ProfileCapabilities
) => {
  const lastChangedAt =
    parseDate(row.name_last_changed_at) ??
    (!capabilities.hasNameLastChangedAt ? parseDate(row.updated_at) : null);

  if (!lastChangedAt) {
    return {
      lastChangedAt: null,
      nextAvailableAt: null,
      canChangeNow: true,
    };
  }

  const nextAvailableAt = new Date(lastChangedAt.getTime() + NAME_COOLDOWN_MS);
  const canChangeNow = Date.now() >= nextAvailableAt.getTime();

  return {
    lastChangedAt,
    nextAvailableAt,
    canChangeNow,
  };
};

const buildProfilePayload = (user: User, loaded: LoadedProfile) => {
  const displayName =
    loaded.row.full_name || loaded.row.username || getFallbackName(user);
  const avatarFallback =
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
  const { lastChangedAt, nextAvailableAt, canChangeNow } = getNameTimestamps(
    loaded.row,
    loaded.capabilities
  );

  return {
    profile: {
      id: user.id,
      name: displayName,
      email: loaded.row.email ?? user.email ?? null,
      username: loaded.row.username ?? null,
      fullName: loaded.row.full_name ?? null,
      avatarUrl: loaded.row.avatar_url ?? avatarFallback,
      bio: loaded.row.bio ?? null,
      accountTier: loaded.row.account_tier ?? "basic",
      verificationStatus: loaded.row.verification_status ?? "unverified",
      nameLastChangedAt: lastChangedAt ? lastChangedAt.toISOString() : null,
      nextNameChangeAt: nextAvailableAt ? nextAvailableAt.toISOString() : null,
      canChangeName: canChangeNow,
      source: loaded.capabilities.source,
    },
    namePolicy: {
      cooldownDays: NAME_COOLDOWN_DAYS,
      canChangeNow,
      lastChangedAt: lastChangedAt ? lastChangedAt.toISOString() : null,
      nextAvailableAt: nextAvailableAt ? nextAvailableAt.toISOString() : null,
    },
  };
};

const getProfileFromTable = async (
  supabase: SupabaseServerClient,
  table: "greenspot_profiles" | "marketplace_profiles",
  user: User,
  source: "greenspot" | "legacy"
): Promise<LoadedProfile> => {
  let hasFullName = true;
  let hasBio = true;
  let hasNameLastChangedAt = true;

  const selectExtended =
    "id, email, username, full_name, avatar_url, bio, name_last_changed_at, account_tier, verification_status, updated_at";
  const selectWithoutCooldown =
    "id, email, username, full_name, avatar_url, bio, account_tier, verification_status, updated_at";
  const selectWithoutBio =
    "id, email, username, full_name, avatar_url, account_tier, verification_status, updated_at";
  const selectWithoutFullName =
    "id, email, username, avatar_url, account_tier, verification_status, updated_at";

  let request = await supabase.from(table).select(selectExtended).eq("id", user.id).maybeSingle();

  if (request.error && isSchemaMismatch(request.error.message)) {
    hasNameLastChangedAt = false;
    request = await supabase
      .from(table)
      .select(selectWithoutCooldown)
      .eq("id", user.id)
      .maybeSingle();
  }

  if (request.error && isSchemaMismatch(request.error.message)) {
    hasBio = false;
    request = await supabase
      .from(table)
      .select(selectWithoutBio)
      .eq("id", user.id)
      .maybeSingle();
  }

  if (request.error && isSchemaMismatch(request.error.message)) {
    hasFullName = false;
    request = await supabase
      .from(table)
      .select(selectWithoutFullName)
      .eq("id", user.id)
      .maybeSingle();
  }

  if (request.error) {
    throw new Error(request.error.message);
  }

  let row = (request.data as ProfileRow | null) ?? null;
  if (!row) {
    const fallbackName = getFallbackName(user);
    const seed: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? null,
      username: fallbackName,
      avatar_url:
        user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    };

    if (hasFullName) {
      seed.full_name = user.user_metadata?.full_name ?? fallbackName;
    }
    if (hasBio) {
      seed.bio = null;
    }
    if (hasNameLastChangedAt) {
      seed.name_last_changed_at = null;
    }

    const upsertResult = await supabase.from(table).upsert(seed, { onConflict: "id" });
    if (upsertResult.error && !isSchemaMismatch(upsertResult.error.message)) {
      throw new Error(upsertResult.error.message);
    }

    row = {
      id: user.id,
      email: user.email ?? null,
      username: fallbackName,
      full_name: hasFullName ? (user.user_metadata?.full_name ?? fallbackName) : null,
      avatar_url:
        (user.user_metadata?.avatar_url as string | null | undefined) ??
        (user.user_metadata?.picture as string | null | undefined) ??
        null,
      bio: hasBio ? null : undefined,
      account_tier: "basic",
      verification_status: "unverified",
      name_last_changed_at: hasNameLastChangedAt ? null : undefined,
    };
  }

  return {
    row,
    capabilities: {
      source,
      hasFullName,
      hasUsername: true,
      hasBio,
      hasNameLastChangedAt,
    },
  };
};

const loadProfileWithFallback = async (
  greenspotClient: SupabaseServerClient,
  publicClient: SupabaseServerClient,
  user: User
): Promise<LoadedProfile> => {
  try {
    return await getProfileFromTable(
      greenspotClient,
      "greenspot_profiles",
      user,
      "greenspot"
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile.";
    if (!isSchemaMismatch(message)) {
      throw new Error(message);
    }
  }

  return await getProfileFromTable(
    publicClient,
    "marketplace_profiles",
    user,
    "legacy"
  );
};

const applyProfilePatch = async (
  loaded: LoadedProfile,
  user: User,
  changes: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  },
  greenspotClient: SupabaseServerClient,
  publicClient: SupabaseServerClient
) => {
  const currentName =
    loaded.row.full_name || loaded.row.username || getFallbackName(user);
  const nextName = changes.name;
  const wantsNameChange =
    typeof nextName === "string" && nextName.length > 0 && nextName !== currentName;

  if (wantsNameChange) {
    const { nextAvailableAt, canChangeNow } = getNameTimestamps(
      loaded.row,
      loaded.capabilities
    );
    if (!canChangeNow && nextAvailableAt) {
      return NextResponse.json(
        {
          error: `Name can be changed every ${NAME_COOLDOWN_DAYS} days. Next change available on ${nextAvailableAt.toLocaleDateString()}.`,
          nextNameChangeAt: nextAvailableAt.toISOString(),
        },
        { status: 429 }
      );
    }
  }

  const payload: Record<string, unknown> = {};

  if (typeof changes.name === "string" && changes.name.length > 0) {
    if (loaded.capabilities.hasFullName) {
      payload.full_name = changes.name;
    } else if (loaded.capabilities.hasUsername) {
      payload.username = changes.name;
    }

    if (wantsNameChange && loaded.capabilities.hasNameLastChangedAt) {
      payload.name_last_changed_at = new Date().toISOString();
    }
  }

  if (changes.bio !== undefined && loaded.capabilities.hasBio) {
    payload.bio = changes.bio;
  }

  if (changes.avatarUrl !== undefined) {
    payload.avatar_url = changes.avatarUrl;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const targetClient =
    loaded.capabilities.source === "greenspot" ? greenspotClient : publicClient;
  const targetTable =
    loaded.capabilities.source === "greenspot"
      ? "greenspot_profiles"
      : "marketplace_profiles";

  const { error } = await targetClient
    .from(targetTable)
    .update(payload)
    .eq("id", user.id);

  if (error) {
    if (
      loaded.capabilities.source === "greenspot" &&
      isSchemaMismatch(error.message)
    ) {
      const legacyProfile = await getProfileFromTable(
        publicClient,
        "marketplace_profiles",
        user,
        "legacy"
      );

      const legacyPayload: Record<string, unknown> = {};
      if (typeof changes.name === "string" && changes.name.length > 0) {
        if (legacyProfile.capabilities.hasFullName) {
          legacyPayload.full_name = changes.name;
        } else {
          legacyPayload.username = changes.name;
        }
        if (wantsNameChange && legacyProfile.capabilities.hasNameLastChangedAt) {
          legacyPayload.name_last_changed_at = new Date().toISOString();
        }
      }
      if (changes.bio !== undefined && legacyProfile.capabilities.hasBio) {
        legacyPayload.bio = changes.bio;
      }
      if (changes.avatarUrl !== undefined) {
        legacyPayload.avatar_url = changes.avatarUrl;
      }

      if (Object.keys(legacyPayload).length > 0) {
        const { error: legacyError } = await publicClient
          .from("marketplace_profiles")
          .update(legacyPayload)
          .eq("id", user.id);
        if (legacyError) {
          throw new Error(legacyError.message);
        }
      }
      return null;
    }

    throw new Error(error.message);
  }

  return null;
};

export async function GET() {
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
    const loaded = await loadProfileWithFallback(greenspotClient, publicClient, user);
    return NextResponse.json(buildProfilePayload(user, loaded));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const greenspotClient = await createServerSupabaseClient({ schema: "greenspot" });
  const publicClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await greenspotClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        bio?: string | null;
        avatarUrl?: string | null;
      }
    | null;

  const incomingName =
    typeof body?.name === "string" ? normalizeDisplayName(body.name) : undefined;
  const incomingBio =
    typeof body?.bio === "string"
      ? normalizeBio(body.bio)
      : body?.bio === null
        ? null
        : undefined;
  const incomingAvatarUrl =
    typeof body?.avatarUrl === "string"
      ? body.avatarUrl.trim()
      : body?.avatarUrl === null
        ? null
        : undefined;

  if (incomingName !== undefined && incomingName.length < 2) {
    return NextResponse.json(
      { error: "Display name must be at least 2 characters." },
      { status: 400 }
    );
  }

  if (incomingBio !== undefined && incomingBio !== null && incomingBio.length > 280) {
    return NextResponse.json(
      { error: "Bio must be 280 characters or less." },
      { status: 400 }
    );
  }

  if (
    incomingAvatarUrl !== undefined &&
    incomingAvatarUrl !== null &&
    incomingAvatarUrl.length > 0 &&
    !/^https?:\/\//i.test(incomingAvatarUrl)
  ) {
    return NextResponse.json(
      { error: "Avatar URL must be an absolute http(s) URL." },
      { status: 400 }
    );
  }

  if (
    incomingName === undefined &&
    incomingBio === undefined &&
    incomingAvatarUrl === undefined
  ) {
    return NextResponse.json({ error: "No profile changes received." }, { status: 400 });
  }

  try {
    const loaded = await loadProfileWithFallback(greenspotClient, publicClient, user);
    const guard = await applyProfilePatch(
      loaded,
      user,
      {
        name: incomingName,
        bio: incomingBio,
        avatarUrl: incomingAvatarUrl,
      },
      greenspotClient,
      publicClient
    );

    if (guard) {
      return guard;
    }

    const refreshed = await loadProfileWithFallback(greenspotClient, publicClient, user);
    return NextResponse.json(buildProfilePayload(user, refreshed));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
