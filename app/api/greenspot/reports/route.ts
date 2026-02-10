import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GreenspotProfileRow = {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  name_last_changed_at?: string | null;
  role?: string | null;
  account_tier?: string | null;
  verification_status?: string | null;
};

type GreenspotReportRow = {
  id: string;
  user_id: string;
  area?: string | null;
  location_name?: string | null;
  category?: string | null;
  waste_type?: string | null;
  description?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url?: string | null;
  photos?: string[] | null;
  user_name?: string | null;
  user_avatar?: string | null;
  verified_count?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type LegacyPublicReportRow = {
  id: string;
  user_id: string;
  location_name?: string | null;
  category?: string | null;
  region?: string | null;
  description?: string | null;
  photos?: string[] | null;
  status?: string | null;
  created_at?: string | null;
};

type ReportClaimRow = {
  report_id: string;
  accepted_by_name?: string | null;
};

type ReportResponse = {
  id: string;
  user_id: string;
  area: string;
  lat: number;
  lng: number;
  waste_type: string;
  notes: string;
  user_name: string;
  user_avatar: string | null;
  verified_count: number;
  status: string;
  image_url: string | null;
  created_at: string;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type CreateInput = {
  title: string;
  description: string;
  category: string;
  expert: string;
  imageUrl: string | null;
  lat: number;
  lng: number;
};

type NormalizeOptions = {
  allowFallbackCoords?: boolean;
  forcedCoordinates?: { lat: number; lng: number };
};

const ALGIERS_CENTER = { lat: 36.7538, lng: 3.0588 };
const NAME_COOLDOWN_DAYS = 14;
const NAME_COOLDOWN_MS = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const REPORT_SELECT_FIELDS =
  "id, user_id, area, location_name, category, waste_type, description, notes, lat, lng, image_url, photos, user_name, user_avatar, verified_count, status, created_at";
const ACCEPTED_STATUS_PREFIX = "Accepted by";

const isSchemaMismatch = (message: string) =>
  /column .* does not exist|relation .* does not exist|schema cache|table .* does not exist/i.test(
    message
  );
const isPermissionIssue = (message: string) =>
  /permission denied|not allowed|row-level security/i.test(message);

const getFallbackName = (user: User) =>
  user.user_metadata?.full_name ||
  user.user_metadata?.username ||
  user.email?.split("@")[0] ||
  "GreenSpot Member";

const normalizeStatus = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "Pending";
  if (normalized === "pending") return "Pending";
  if (normalized === "verified") return "Verified";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "needs planting") return "Needs Planting";
  return value!;
};

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

const hasCoordinateValue = (value: unknown): value is number | string =>
  value !== null && value !== undefined && Number.isFinite(Number(value));

const jitterCoordinatesFromId = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) % 100000;
  }
  const latOffset = ((hash % 200) - 100) * 0.00035;
  const lngOffset = (((Math.floor(hash / 200) % 200) - 100) * 0.00035);
  return {
    lat: ALGIERS_CENTER.lat + latOffset,
    lng: ALGIERS_CENTER.lng + lngOffset,
  };
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mergeRowsById = <T extends { id: string; created_at?: string | null }>(
  ...collections: Array<T[] | null | undefined>
) => {
  const byId = new Map<string, T>();
  collections.forEach((rows) => {
    (rows ?? []).forEach((row) => {
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
      }
    });
  });
  return Array.from(byId.values()).sort((left, right) => {
    const leftDate = Date.parse(left.created_at ?? "");
    const rightDate = Date.parse(right.created_at ?? "");
    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
    if (Number.isNaN(leftDate)) return 1;
    if (Number.isNaN(rightDate)) return -1;
    return rightDate - leftDate;
  });
};

const toAcceptedStatus = (value?: string | null) => {
  const acceptedBy = (value ?? "").trim() || "Community Member";
  return `${ACCEPTED_STATUS_PREFIX} ${acceptedBy}`;
};

const fetchReportClaimMap = async (
  supabase: SupabaseServerClient,
  reportIds: string[]
) => {
  if (reportIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("greenspot_report_claims")
    .select("report_id, accepted_by_name")
    .in("report_id", reportIds);

  if (error) {
    if (isSchemaMismatch(error.message) || isPermissionIssue(error.message)) {
      return new Map<string, string>();
    }
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ReportClaimRow[]).map((claim) => [
      claim.report_id,
      (claim.accepted_by_name ?? "").trim() || "Community Member",
    ])
  );
};

const applyClaimStatuses = (
  reports: ReportResponse[],
  claimMap: Map<string, string>
) =>
  reports.map((report) => {
    const acceptedBy = claimMap.get(report.id);
    if (!acceptedBy) return report;
    return {
      ...report,
      status: toAcceptedStatus(acceptedBy),
    };
  });

const buildMePayload = (user: User, profile?: GreenspotProfileRow | null) => ({
  ...(() => {
    const lastChangedAt = parseDate(profile?.name_last_changed_at);
    const nextNameChangeAt = lastChangedAt
      ? new Date(lastChangedAt.getTime() + NAME_COOLDOWN_MS)
      : null;
    return {
      nameLastChangedAt: lastChangedAt ? lastChangedAt.toISOString() : null,
      nextNameChangeAt: nextNameChangeAt ? nextNameChangeAt.toISOString() : null,
      canChangeName: !nextNameChangeAt || nextNameChangeAt.getTime() <= Date.now(),
      nameCooldownDays: NAME_COOLDOWN_DAYS,
    };
  })(),
  id: user.id,
  name: profile?.full_name || profile?.username || getFallbackName(user),
  email: profile?.email ?? user.email ?? null,
  avatarUrl: profile?.avatar_url ?? null,
  bio: profile?.bio ?? null,
  accountTier: profile?.account_tier ?? "basic",
  verificationStatus: profile?.verification_status ?? "unverified",
});

const normalizeReportRow = (
  row: GreenspotReportRow,
  profileMap: Map<string, GreenspotProfileRow>,
  options: NormalizeOptions = {}
): ReportResponse | null => {
  const relatedProfile = profileMap.get(row.user_id);
  const displayName =
    relatedProfile?.full_name ||
    relatedProfile?.username ||
    row.user_name ||
    "Community Member";
  const firstPhoto = Array.isArray(row.photos) ? row.photos[0] ?? null : null;
  const parsedCoordinates =
    parseCoordinates(row.area) ||
    parseCoordinates(row.location_name) ||
    parseCoordinates(row.notes) ||
    parseCoordinates(row.description);

  let coords =
    options.forcedCoordinates ??
    (hasCoordinateValue(row.lat) &&
    hasCoordinateValue(row.lng) &&
    Number(row.lat) >= -90 &&
    Number(row.lat) <= 90 &&
    Number(row.lng) >= -180 &&
    Number(row.lng) <= 180
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null);

  if (!coords) {
    coords = parsedCoordinates;
  }

  // Protect against legacy bad data where null coordinates were coerced to 0,0.
  if (
    coords &&
    Math.abs(coords.lat) < 0.0000001 &&
    Math.abs(coords.lng) < 0.0000001 &&
    parsedCoordinates
  ) {
    coords = parsedCoordinates;
  }

  if (!coords && options.allowFallbackCoords) {
    coords = jitterCoordinatesFromId(row.id);
  }

  if (!coords) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    area:
      row.area ||
      row.location_name ||
      `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    lat: coords.lat,
    lng: coords.lng,
    waste_type: row.waste_type || row.category || "General",
    notes: row.notes || row.description || "",
    user_name: displayName,
    user_avatar: relatedProfile?.avatar_url || row.user_avatar || null,
    verified_count: row.verified_count ?? 0,
    status: normalizeStatus(row.status),
    image_url: row.image_url || firstPhoto,
    created_at: row.created_at || new Date().toISOString(),
  };
};

const ensureProfile = async (
  supabase: SupabaseServerClient,
  user: User
) => {
  let hasBio = true;
  let hasNameLastChangedAt = true;

  let profileQuery = await supabase
    .from("greenspot_profiles")
    .select(
      "id, email, username, full_name, avatar_url, bio, name_last_changed_at, role, account_tier, verification_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileQuery.error && isSchemaMismatch(profileQuery.error.message)) {
    hasNameLastChangedAt = false;
    profileQuery = await supabase
      .from("greenspot_profiles")
      .select(
        "id, email, username, full_name, avatar_url, bio, role, account_tier, verification_status"
      )
      .eq("id", user.id)
      .maybeSingle();
  }

  if (profileQuery.error && isSchemaMismatch(profileQuery.error.message)) {
    hasBio = false;
    profileQuery = await supabase
      .from("greenspot_profiles")
      .select(
        "id, email, username, full_name, avatar_url, role, account_tier, verification_status"
      )
      .eq("id", user.id)
      .maybeSingle();
  }

  const existingProfile = profileQuery.data;
  const profileError = profileQuery.error;

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (existingProfile) {
    return existingProfile as GreenspotProfileRow;
  }

  const fallbackName = getFallbackName(user);
  const seedProfile = {
    id: user.id,
    email: user.email ?? null,
    username: fallbackName,
    full_name: user.user_metadata?.full_name ?? fallbackName,
    avatar_url:
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    ...(hasBio ? { bio: null } : {}),
    ...(hasNameLastChangedAt ? { name_last_changed_at: null } : {}),
    role: "member",
    account_tier: "basic",
    verification_status: "unverified",
  };

  const { error: upsertError } = await supabase
    .from("greenspot_profiles")
    .upsert(seedProfile, { onConflict: "id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return seedProfile as GreenspotProfileRow;
};

const getLegacyProfile = async (
  supabase: SupabaseServerClient,
  user: User
): Promise<GreenspotProfileRow | null> => {
  const extended = await supabase
    .from("marketplace_profiles")
    .select(
      "id, email, username, full_name, avatar_url, bio, name_last_changed_at, role, account_tier, verification_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!extended.error) {
    if (extended.data) return extended.data as GreenspotProfileRow;
    return {
      id: user.id,
      email: user.email ?? null,
      username: getFallbackName(user),
      full_name: getFallbackName(user),
      avatar_url:
        user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      bio: null,
      name_last_changed_at: null,
      account_tier: "basic",
      verification_status: "unverified",
    };
  }

  if (!isSchemaMismatch(extended.error.message)) {
    throw new Error(extended.error.message);
  }

  let base = await supabase
    .from("marketplace_profiles")
    .select("id, email, username, avatar_url, bio, role")
    .eq("id", user.id)
    .maybeSingle();

  if (base.error && isSchemaMismatch(base.error.message)) {
    base = await supabase
      .from("marketplace_profiles")
      .select("id, email, username, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
  }

  if (base.error) {
    throw new Error(base.error.message);
  }
  if (base.data) {
    return {
      ...(base.data as GreenspotProfileRow),
      full_name:
        (base.data as { full_name?: string | null }).full_name ??
        (base.data as { username?: string | null }).username ??
        getFallbackName(user),
      bio: (base.data as { bio?: string | null }).bio ?? null,
      name_last_changed_at: null,
      account_tier: "basic",
      verification_status: "unverified",
    };
  }

  return {
    id: user.id,
    email: user.email ?? null,
    username: getFallbackName(user),
    full_name: getFallbackName(user),
    avatar_url:
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    bio: null,
    name_last_changed_at: null,
    account_tier: "basic",
    verification_status: "unverified",
  };
};

const fetchLegacyProfileMap = async (
  supabase: SupabaseServerClient,
  userIds: string[]
) => {
  if (userIds.length === 0) return new Map<string, GreenspotProfileRow>();

  const request = await supabase
    .from("marketplace_profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", userIds);

  if (!request.error) {
    return new Map(
      (request.data ?? []).map((profile) => [profile.id, profile as GreenspotProfileRow])
    );
  }
  if (isPermissionIssue(request.error.message)) {
    return new Map<string, GreenspotProfileRow>();
  }

  if (!isSchemaMismatch(request.error.message)) {
    throw new Error(request.error.message);
  }

  const fallbackRequest = await supabase
    .from("marketplace_profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  if (fallbackRequest.error) {
    if (isPermissionIssue(fallbackRequest.error.message)) {
      return new Map<string, GreenspotProfileRow>();
    }
    throw new Error(fallbackRequest.error.message);
  }

  return new Map(
    (fallbackRequest.data ?? []).map((profile) => [
      profile.id,
      {
        ...(profile as GreenspotProfileRow),
        full_name:
          (profile as { full_name?: string | null }).full_name ??
          (profile as { username?: string | null }).username ??
          "Community Member",
      },
    ])
  );
};

const loadLegacyReports = async (
  supabase: SupabaseServerClient,
  user?: User | null
) => {
  const meProfile = user ? await getLegacyProfile(supabase, user) : null;

  const { data, error } = await supabase
    .from("greenspot_reports")
    .select(
      "id, user_id, location_name, category, region, description, photos, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as LegacyPublicReportRow[];
  const ids = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const profileMap = await fetchLegacyProfileMap(supabase, ids);
  if (user && meProfile) profileMap.set(user.id, meProfile);

  const reports = rows
    .map((row) =>
      normalizeReportRow(
        {
          id: row.id,
          user_id: row.user_id,
          area: row.location_name || row.region || "Unknown area",
          location_name: row.location_name || null,
          category: row.category || "General",
          waste_type: row.category || "General",
          description: row.description || "",
          notes: row.description || "",
          photos: row.photos ?? [],
          image_url: Array.isArray(row.photos) ? row.photos[0] ?? null : null,
          status: row.status || "pending",
          created_at: row.created_at || new Date().toISOString(),
          verified_count: 0,
        },
        profileMap,
        { allowFallbackCoords: false }
      )
    )
    .filter((row): row is ReportResponse => Boolean(row));

  return {
    reports,
    me: user ? buildMePayload(user, meProfile) : null,
  };
};

const createLegacyReport = async (
  supabase: SupabaseServerClient,
  user: User,
  input: CreateInput
) => {
  const meProfile = await getLegacyProfile(supabase, user);
  const displayName =
    meProfile?.full_name || meProfile?.username || getFallbackName(user);
  const notes = input.expert
    ? `${input.description} [Expert: ${input.expert}]`
    : input.description;

  const { data, error } = await supabase
    .from("greenspot_reports")
    .insert({
      user_id: user.id,
      location_name: `${input.title} (${input.lat.toFixed(4)}, ${input.lng.toFixed(
        4
      )})`,
      category: input.category,
      region: `GPS ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
      access_level: "Public",
      description: notes,
      photos: input.imageUrl ? [input.imageUrl] : [],
      status: "pending",
    })
    .select("id, user_id, location_name, category, region, description, photos, status, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profileMap = new Map<string, GreenspotProfileRow>();
  if (meProfile) profileMap.set(user.id, meProfile);

  const normalized = normalizeReportRow(
    {
      id: data.id,
      user_id: data.user_id,
      area: data.location_name || data.region || input.title,
      location_name: data.location_name,
      category: data.category || input.category,
      waste_type: data.category || input.category,
      description: data.description || notes,
      notes: data.description || notes,
      photos: data.photos ?? (input.imageUrl ? [input.imageUrl] : []),
      image_url: input.imageUrl,
      user_name: displayName,
      user_avatar: meProfile?.avatar_url ?? null,
      status: data.status || "pending",
      created_at: data.created_at || new Date().toISOString(),
      verified_count: 0,
    },
    profileMap,
    {
      allowFallbackCoords: true,
      forcedCoordinates: { lat: input.lat, lng: input.lng },
    }
  );

  if (!normalized) {
    throw new Error("Failed to normalize legacy report.");
  }

  return normalized;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const isPublicFeed = requestUrl.searchParams.get("public") === "1";
  const greenspotClient = await createServerSupabaseClient({ schema: "greenspot" });
  const publicClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await greenspotClient.auth.getUser();

  const activeUser = !authError && user ? user : null;
  const greenspotFeedClient = isPublicFeed
    ? await createServerSupabaseClient({ schema: "greenspot", useSession: false })
    : greenspotClient;
  const legacyFeedClient = isPublicFeed
    ? await createServerSupabaseClient({ useSession: false })
    : publicClient;
  const legacyFeedUser = isPublicFeed ? null : activeUser;

  if (!isPublicFeed && !activeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let meProfile: GreenspotProfileRow | null = null;
    if (activeUser) {
      try {
        meProfile = await ensureProfile(greenspotClient, activeUser);
      } catch (profileError) {
        const profileMessage =
          profileError instanceof Error
            ? profileError.message
            : "Failed to load profile.";
        if (!isPublicFeed || (!isSchemaMismatch(profileMessage) && !isPermissionIssue(profileMessage))) {
          throw profileError;
        }
      }
    }

    const { data: initialReportRows, error: initialReportsError } = await greenspotFeedClient
      .from("greenspot_reports")
      .select(REPORT_SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .limit(500);
    let reportRows = (initialReportRows ?? []) as GreenspotReportRow[];
    let reportsError = initialReportsError;

    if (isPublicFeed && activeUser) {
      const authResult = await greenspotClient
        .from("greenspot_reports")
        .select(REPORT_SELECT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!authResult.error) {
        reportRows = mergeRowsById(
          reportRows,
          (authResult.data ?? []) as GreenspotReportRow[]
        );
        reportsError = null;
      } else if (reportsError && isPermissionIssue(reportsError.message)) {
        reportRows = (authResult.data ?? []) as GreenspotReportRow[];
        reportsError = authResult.error;
      }
    }

    if (reportsError) {
      if (isSchemaMismatch(reportsError.message)) {
        const legacyPayload = await loadLegacyReports(legacyFeedClient, legacyFeedUser);
        return NextResponse.json(legacyPayload);
      }
      return NextResponse.json({ error: reportsError.message }, { status: 500 });
    }

    const profileMap = new Map<string, GreenspotProfileRow>();
    if (activeUser && meProfile) {
      profileMap.set(activeUser.id, meProfile);
    }
    let reports = reportRows
      .map((row) =>
        normalizeReportRow(row, profileMap, { allowFallbackCoords: false })
      )
      .filter((row): row is ReportResponse => Boolean(row));

    if (isPublicFeed && reports.length === 0) {
      const legacyCollections: ReportResponse[][] = [];

      try {
        const legacyAnonPayload = await loadLegacyReports(legacyFeedClient, null);
        if (legacyAnonPayload.reports.length > 0) {
          legacyCollections.push(legacyAnonPayload.reports);
        }
      } catch {}

      if (activeUser) {
        try {
          const legacyAuthPayload = await loadLegacyReports(publicClient, activeUser);
          if (legacyAuthPayload.reports.length > 0) {
            legacyCollections.push(legacyAuthPayload.reports);
          }
        } catch {}
      }

      if (legacyCollections.length > 0) {
        reports = mergeRowsById(...legacyCollections);
      }
    }

    const claimFeedClient = activeUser ? greenspotClient : greenspotFeedClient;
    const claimMap = await fetchReportClaimMap(
      claimFeedClient,
      reports.map((report) => report.id)
    );
    if (claimMap.size > 0) {
      reports = applyClaimStatuses(reports, claimMap);
    }

    return NextResponse.json({
      reports,
      me: activeUser ? buildMePayload(activeUser, meProfile) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reports.";

    if (isSchemaMismatch(message)) {
      try {
        const legacyPayload = await loadLegacyReports(legacyFeedClient, legacyFeedUser);
        return NextResponse.json(legacyPayload);
      } catch (legacyError) {
        const legacyMessage =
          legacyError instanceof Error
            ? legacyError.message
            : "Failed to load legacy reports.";
        return NextResponse.json({ error: legacyMessage }, { status: 500 });
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const greenspotClient = await createServerSupabaseClient({ schema: "greenspot" });
  const publicClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await greenspotClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        title?: string;
        description?: string;
        category?: string;
        expert?: string;
        imageUrl?: string | null;
        lat?: number;
        lng?: number;
      }
    | null;

  const input: CreateInput = {
    title: payload?.title?.trim() ?? "",
    description: payload?.description?.trim() ?? "",
    category: payload?.category?.trim() ?? "",
    expert: payload?.expert?.trim() ?? "",
    imageUrl:
      typeof payload?.imageUrl === "string" && payload.imageUrl.trim().length > 0
        ? payload.imageUrl.trim()
        : null,
    lat: Number(payload?.lat),
    lng: Number(payload?.lng),
  };

  if (!input.title || !input.description || !input.category) {
    return NextResponse.json(
      { error: "Title, description, and category are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return NextResponse.json(
      { error: "Valid coordinates are required." },
      { status: 400 }
    );
  }
  if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
    return NextResponse.json(
      { error: "Coordinates are outside valid bounds." },
      { status: 400 }
    );
  }

  const createFromLegacySchema = async () => {
    const report = await createLegacyReport(publicClient, user, input);
    return NextResponse.json({ report }, { status: 201 });
  };

  try {
    const meProfile = await ensureProfile(greenspotClient, user);
    const displayName =
      meProfile.full_name || meProfile.username || getFallbackName(user);
    const notes = input.expert
      ? `${input.description} [Expert: ${input.expert}]`
      : input.description;

    const { data: inserted, error: insertError } = await greenspotClient
      .from("greenspot_reports")
      .insert({
        user_id: user.id,
        area: `${input.title} (${input.lat.toFixed(4)}, ${input.lng.toFixed(4)})`,
        location_name: input.title,
        category: input.category,
        waste_type: input.category,
        access_level: "Public",
        description: input.description,
        notes,
        lat: input.lat,
        lng: input.lng,
        photos: input.imageUrl ? [input.imageUrl] : [],
        image_url: input.imageUrl,
        user_name: displayName,
        user_avatar: meProfile.avatar_url ?? null,
        verified_count: 0,
        status: "pending",
      })
      .select(
        "id, user_id, area, location_name, category, waste_type, description, notes, lat, lng, image_url, photos, user_name, user_avatar, verified_count, status, created_at"
      )
      .single();

    if (insertError) {
      if (isSchemaMismatch(insertError.message)) {
        return await createFromLegacySchema();
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const profileMap = new Map([[user.id, meProfile]]);
    const normalizedReport = normalizeReportRow(
      inserted as GreenspotReportRow,
      profileMap,
      { allowFallbackCoords: true }
    );

    if (!normalizedReport) {
      return NextResponse.json(
        { error: "Report was created but returned invalid coordinates." },
        { status: 500 }
      );
    }

    // Keep legacy table in sync for projects still reading from public schema.
    const { error: legacySyncError } = await publicClient
      .from("greenspot_reports")
      .upsert(
        {
          id: normalizedReport.id,
          user_id: user.id,
          location_name: input.title,
          category: input.category,
          region: `GPS ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
          access_level: "Public",
          description: notes,
          photos: input.imageUrl ? [input.imageUrl] : [],
          status: "pending",
        },
        { onConflict: "id" }
      );
    if (
      legacySyncError &&
      !isSchemaMismatch(legacySyncError.message) &&
      !isPermissionIssue(legacySyncError.message)
    ) {
      console.warn("Legacy GreenSpot report sync failed:", legacySyncError.message);
    }

    return NextResponse.json({ report: normalizedReport }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create report.";

    if (isSchemaMismatch(message)) {
      try {
        return await createFromLegacySchema();
      } catch (legacyError) {
        const legacyMessage =
          legacyError instanceof Error
            ? legacyError.message
            : "Failed to create report.";
        return NextResponse.json({ error: legacyMessage }, { status: 500 });
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
