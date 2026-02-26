type BuildOAuthRedirectOptions = {
  siteUrl?: string | null;
  origin?: string | null;
  callbackPath?: string;
  fallbackPath?: string;
};

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const normalizeNextPath = (nextPath: string, fallbackPath: string) => {
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/")) return fallbackPath;
  return trimmed;
};

const normalizeBase = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimTrailingSlashes(trimmed);
};

export function buildOAuthRedirect(
  nextPath: string,
  options: BuildOAuthRedirectOptions = {}
) {
  const fallbackPath = options.fallbackPath ?? "/";
  const safeNextPath = normalizeNextPath(nextPath, fallbackPath);
  const baseUrl = normalizeBase(options.siteUrl) ?? normalizeBase(options.origin);

  if (!baseUrl) return undefined;

  const callbackPath = options.callbackPath ?? "/auth/callback";
  const normalizedCallbackPath = callbackPath.startsWith("/")
    ? callbackPath
    : `/${callbackPath}`;

  return `${baseUrl}${normalizedCallbackPath}?next=${encodeURIComponent(
    safeNextPath
  )}`;
}
