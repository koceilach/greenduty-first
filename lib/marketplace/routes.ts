export const GD_getMarketplaceProductDetailsHref = (
  itemId: string | number | null | undefined
) => {
  const normalized = String(itemId ?? "").trim();
  if (!normalized) return "/market-place/product";
  return `/market-place/product/${encodeURIComponent(normalized)}`;
};

export const GD_decodeMarketplaceProductId = (
  rawId: string | null | undefined
) => {
  if (!rawId) return null;
  try {
    const decoded = decodeURIComponent(rawId).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    const normalized = rawId.trim();
    return normalized.length > 0 ? normalized : null;
  }
};
