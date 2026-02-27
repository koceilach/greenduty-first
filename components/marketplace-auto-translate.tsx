"use client";

import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";
import { GD_translateMarketplaceText } from "@/lib/marketplace/i18n";

const GD_MARKETPLACE_TRANSLATE_ATTRS = ["placeholder", "title", "aria-label"] as const;
const GD_RUNTIME_TRANSLATE_LIMIT = 160;
const GD_RUNTIME_TEXT_MAX_LENGTH = 260;
const GD_FRENCH_HINT_WORDS =
  /\b(vendeur|acheteur|produit|produits|ferme|semence|semences|plante|plantes|animaux|volaille|chevre|vache|poulet|lapin|prix|quantite)\b/i;

const GD_isRuntimeTranslatable = (value: string) => {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (text.length > GD_RUNTIME_TEXT_MAX_LENGTH) return false;
  if (!/[A-Za-z\u0600-\u06FF]/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^[\d\s.,:;()[\]{}%+/\-]+$/.test(text)) return false;
  return true;
};

const GD_shouldRequestRuntimeForLocale = (locale: "en" | "fr" | "ar", raw: string) => {
  if (locale === "fr" || locale === "ar") return true;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (/[\u0600-\u06FF]/.test(text)) return true;
  if (/[^\x00-\x7F]/.test(text)) return true;
  return GD_FRENCH_HINT_WORDS.test(text);
};

export function MarketplaceAutoTranslate() {
  const { locale } = useI18n();
  const textOriginalRef = useRef(new WeakMap<Text, string>());
  const textAppliedRef = useRef(new WeakMap<Text, string>());
  const attrOriginalRef = useRef(new WeakMap<Element, Map<string, string>>());
  const attrAppliedRef = useRef(new WeakMap<Element, Map<string, string>>());
  const applyingLocaleRef = useRef(false);
  const translateCacheRef = useRef(new Map<string, string>());
  const runtimeCacheRef = useRef(new Map<string, string>());
  const runtimePendingRef = useRef(new Set<string>());
  const runtimeCountRef = useRef(0);
  const scheduleApplyRef = useRef<(() => void) | null>(null);

  const requestRuntimeTranslation = useCallback(
    (raw: string) => {
      if (!GD_shouldRequestRuntimeForLocale(locale, raw)) return;
      if (!GD_isRuntimeTranslatable(raw)) return;

      const cacheKey = `${locale}::${raw}`;
      if (
        runtimeCacheRef.current.has(cacheKey) ||
        runtimePendingRef.current.has(cacheKey) ||
        runtimeCountRef.current >= GD_RUNTIME_TRANSLATE_LIMIT
      ) {
        return;
      }

      runtimePendingRef.current.add(cacheKey);
      runtimeCountRef.current += 1;

      void fetch("/api/marketplace/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: locale,
          text: raw,
        }),
      })
        .then(async (response) => {
          if (!response.ok) return;
          const data = (await response.json()) as { translation?: string };
          const translated = (data.translation ?? "").trim();
          if (!translated || translated === raw) return;
          runtimeCacheRef.current.set(cacheKey, translated);
          translateCacheRef.current.set(cacheKey, translated);
        })
        .finally(() => {
          runtimePendingRef.current.delete(cacheKey);
          scheduleApplyRef.current?.();
        });
    },
    [locale]
  );

  const translateMarketplaceText = useCallback(
    (raw: string) => {
      const cacheKey = `${locale}::${raw}`;
      const cached = translateCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const runtime = runtimeCacheRef.current.get(cacheKey);
      if (runtime) {
        translateCacheRef.current.set(cacheKey, runtime);
        return runtime;
      }

      const translated = GD_translateMarketplaceText(locale, raw);
      if (translated !== raw) {
        translateCacheRef.current.set(cacheKey, translated);
        return translated;
      }

      if (locale === "en" && !GD_shouldRequestRuntimeForLocale(locale, raw)) {
        translateCacheRef.current.set(cacheKey, raw);
        return raw;
      }

      requestRuntimeTranslation(raw);
      translateCacheRef.current.set(cacheKey, raw);
      return raw;
    },
    [locale, requestRuntimeTranslation]
  );

  const translateNodeValue = useCallback(
    (raw: string) => {
      if (locale === "en") return raw;
      const normalized = raw.replace(/\s+/g, " ").trim();
      if (!normalized) return raw;
      const translated = translateMarketplaceText(normalized);
      if (translated === normalized) return raw;
      const leading = raw.match(/^\s*/)?.[0] ?? "";
      const trailing = raw.match(/\s*$/)?.[0] ?? "";
      return `${leading}${translated}${trailing}`;
    },
    [locale, translateMarketplaceText]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    translateCacheRef.current.clear();
    runtimeCountRef.current = 0;

    const shouldSkipTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent) return true;
      if (parent.closest("[data-gd-i18n-skip='1']")) return true;
      const tagName = parent.tagName;
      return (
        tagName === "SCRIPT" ||
        tagName === "STYLE" ||
        tagName === "NOSCRIPT" ||
        tagName === "CODE" ||
        parent.isContentEditable
      );
    };

    const applyLocaleToRoot = (root: ParentNode | null) => {
      if (!root) return;
      const ownerDocument =
        root instanceof Document ? root : root.ownerDocument ?? document;
      const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];

      let currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }

      for (const textNode of textNodes) {
        if (shouldSkipTextNode(textNode)) continue;
        const currentValue = textNode.textContent ?? "";
        const previousOriginal = textOriginalRef.current.get(textNode);
        const previousApplied = textAppliedRef.current.get(textNode);

        if (previousOriginal === undefined) {
          textOriginalRef.current.set(textNode, currentValue);
        } else if (
          currentValue !== previousApplied &&
          currentValue !== previousOriginal
        ) {
          // React updated the source text, so refresh the untranslated baseline.
          textOriginalRef.current.set(textNode, currentValue);
        }

        const original = textOriginalRef.current.get(textNode) ?? "";
        const nextValue = locale === "en" ? original : translateNodeValue(original);
        if (currentValue !== nextValue) {
          textNode.textContent = nextValue;
        }
        textAppliedRef.current.set(textNode, nextValue);
      }

      const elements = (root as ParentNode).querySelectorAll?.(
        "[placeholder], [title], [aria-label]"
      );
      if (!elements) return;

      for (const element of elements) {
        if (element.closest("[data-gd-i18n-skip='1']")) continue;
        let attrMap = attrOriginalRef.current.get(element);
        if (!attrMap) {
          attrMap = new Map<string, string>();
          attrOriginalRef.current.set(element, attrMap);
        }
        let appliedMap = attrAppliedRef.current.get(element);
        if (!appliedMap) {
          appliedMap = new Map<string, string>();
          attrAppliedRef.current.set(element, appliedMap);
        }

        for (const attrName of GD_MARKETPLACE_TRANSLATE_ATTRS) {
          const currentValue = element.getAttribute(attrName);
          if (currentValue === null) continue;
          const previousOriginal = attrMap.get(attrName);
          const previousApplied = appliedMap.get(attrName);

          if (previousOriginal === undefined) {
            attrMap.set(attrName, currentValue);
          } else if (
            currentValue !== previousApplied &&
            currentValue !== previousOriginal
          ) {
            // Keep translated attrs in sync with dynamic source updates.
            attrMap.set(attrName, currentValue);
          }

          const original = attrMap.get(attrName) ?? currentValue;
          const nextValue =
            locale === "en" ? original : translateMarketplaceText(original);
          if (currentValue !== nextValue) {
            element.setAttribute(attrName, nextValue);
          }
          appliedMap.set(attrName, nextValue);
        }
      }
    };

    const applyLocaleEverywhere = () => {
      if (applyingLocaleRef.current) return;
      applyingLocaleRef.current = true;
      try {
        const marketplaceRoot = document.querySelector("[data-gd-marketplace-root='1']");
        applyLocaleToRoot(marketplaceRoot);
        applyLocaleToRoot(document.body);
      } finally {
        applyingLocaleRef.current = false;
      }
    };

    applyLocaleEverywhere();

    let rafId: number | null = null;
    const scheduleApply = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyLocaleEverywhere();
      });
    };
    scheduleApplyRef.current = scheduleApply;

    const observer = new MutationObserver(() => {
      if (applyingLocaleRef.current) return;
      scheduleApply();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...GD_MARKETPLACE_TRANSLATE_ATTRS],
    });

    return () => {
      observer.disconnect();
      scheduleApplyRef.current = null;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [locale, translateMarketplaceText, translateNodeValue]);

  return null;
}
