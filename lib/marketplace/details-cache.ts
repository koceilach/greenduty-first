type GDMarketplaceSellerProfileSnapshot = {
  id: string;
  username: string | null;
  store_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

export type GDMarketplaceDetailsSnapshot = {
  id: string;
  seller_id?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  price_dzd?: number | null;
  category?: string | null;
  plant_type?: string | null;
  urgency?: string | null;
  image_url?: string | null;
  wilaya?: string | null;
  stock_quantity?: number | null;
  seller_profile?: GDMarketplaceSellerProfileSnapshot | null;
};

const GD_MARKETPLACE_DETAILS_CACHE_KEY_PREFIX = "gd:marketplace:details:";

const GD_getKey = (id: string) =>
  `${GD_MARKETPLACE_DETAILS_CACHE_KEY_PREFIX}${id}`;

export const GD_saveMarketplaceDetailsSnapshot = (
  snapshot: GDMarketplaceDetailsSnapshot | null | undefined
) => {
  if (typeof window === "undefined") return;
  const id = snapshot?.id?.trim();
  if (!id) return;
  try {
    window.sessionStorage.setItem(GD_getKey(id), JSON.stringify(snapshot));
  } catch {
    // Ignore cache write failures (private mode/storage limits).
  }
};

export const GD_getMarketplaceDetailsSnapshot = (
  id: string | null | undefined
): GDMarketplaceDetailsSnapshot | null => {
  if (typeof window === "undefined") return null;
  const normalizedId = id?.trim();
  if (!normalizedId) return null;
  try {
    const raw = window.sessionStorage.getItem(GD_getKey(normalizedId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GDMarketplaceDetailsSnapshot | null;
    if (!parsed || parsed.id !== normalizedId) return null;
    return parsed;
  } catch {
    return null;
  }
};
