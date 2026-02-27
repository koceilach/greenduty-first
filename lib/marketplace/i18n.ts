import type { Locale } from "@/lib/i18n/translations";
import marketplaceI18n from "./marketplace-i18n.generated.json";

const GD_MARKET_TRANSLATIONS = {
  fr: marketplaceI18n.fr as Record<string, string>,
  ar: marketplaceI18n.ar as Record<string, string>,
} as const;

export const GD_MARKET_LOCALES: Locale[] = ["en", "fr", "ar"];

export const GD_MARKET_LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  ar: "AR",
};

const GD_MARKET_ENTITY_VARIANTS = (text: string) => {
  const decoded = text
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const encoded = text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return [text, decoded, encoded];
};

export function GD_translateMarketplaceText(locale: Locale, text: string) {
  if (locale === "en") return text;
  const map = GD_MARKET_TRANSLATIONS[locale];
  for (const variant of GD_MARKET_ENTITY_VARIANTS(text)) {
    const translated = map[variant];
    if (translated) return translated;
  }
  return text;
}
