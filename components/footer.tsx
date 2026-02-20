"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Leaf,
  Sparkles,
  Instagram,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

const companyLinks = [
  { id: "about", href: "#about" },
  { id: "services", href: "#services" },
  { id: "community", href: "#discord-community" },
  { id: "contact", href: "#contact" },
] as const;

const supportLinks = [
  { id: "help", href: "#" },
  { id: "tweet", href: "#" },
  { id: "status", href: "#" },
  { id: "feedback", href: "#" },
] as const;

const productLinks = [
  { id: "courses", href: "/education" },
  { id: "greenspot", href: "/greenspot" },
  { id: "market", href: "/market-place" },
  { id: "reported", href: "/reported-area" },
] as const;

const socialLinks = [
  {
    icon: Instagram,
    href: "https://www.instagram.com/greenduty2025?igsh=MXllZnk0cnZyNnk2",
    id: "instagram",
  },
] as const;

const contactItems = [
  { id: "phone", icon: Phone },
  { id: "email", icon: Mail },
  { id: "address", icon: MapPin },
] as const;

const legalLinks = ["privacy", "terms", "legal", "sitemap"] as const;

export function Footer() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  const translatedCompanyLinks = useMemo(
    () =>
      companyLinks.map((link) => ({
        ...link,
        label: t(`landing.footer.links.company.${link.id}`),
      })),
    [t]
  );

  const translatedSupportLinks = useMemo(
    () =>
      supportLinks.map((link) => ({
        ...link,
        label: t(`landing.footer.links.support.${link.id}`),
      })),
    [t]
  );

  const translatedProductLinks = useMemo(
    () =>
      productLinks.map((link) => ({
        ...link,
        label: t(`landing.footer.links.products.${link.id}`),
      })),
    [t]
  );

  const translatedSocialLinks = useMemo(
    () =>
      socialLinks.map((social) => ({
        ...social,
        label: t(`landing.footer.social.${social.id}`),
      })),
    [t]
  );

  const translatedContactItems = useMemo(
    () =>
      contactItems.map((item) => ({
        ...item,
        value: t(`landing.footer.contact.${item.id}`),
      })),
    [t]
  );

  const translatedLegalLinks = useMemo(
    () =>
      legalLinks.map((linkId) => ({
        id: linkId,
        label: t(`landing.footer.legal.${linkId}`),
      })),
    [t]
  );

  return (
    <footer className={`relative px-4 pb-8 pt-14 sm:px-6 lg:px-8 ${isArabic ? "text-right" : ""}`}>
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[22px] border border-white/10 bg-white/5 text-slate-100 shadow-[0_24px_65px_rgba(0,0,0,0.35)] backdrop-blur-md light:border-slate-300/70 light:bg-white/75 light:text-slate-900 light:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
        <div className="px-4 pb-6 pt-6 sm:px-8 sm:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[14px] border border-white/15 bg-white/10 px-5 py-6 text-slate-100 shadow-[0_16px_40px_rgba(16,185,129,0.2)] backdrop-blur-md sm:px-7 light:border-slate-300/70 light:bg-white/80 light:text-slate-900"
          >
            <div className={`flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between ${isArabic ? "lg:flex-row-reverse" : ""}`}>
              <div className={`flex items-center gap-4 ${isArabic ? "flex-row-reverse text-right" : ""}`}>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/16 light:bg-emerald-100">
                  <Leaf className="h-8 w-8 text-white light:text-emerald-700" />
                  <Sparkles
                    className={`absolute -top-1 h-4 w-4 text-white/90 light:text-emerald-600 ${
                      isArabic ? "-left-1" : "-right-1"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/75 light:text-slate-500">
                    {t("landing.footer.bulletin.title")}
                  </p>
                  <p className="mt-1 text-sm text-white/80 light:text-slate-600">
                    {t("landing.footer.bulletin.subtitle")}
                  </p>
                </div>
              </div>

              <div className={`w-full max-w-md ${isArabic ? "text-right" : ""}`}>
                <h3 className="text-base font-semibold leading-snug sm:text-lg">
                  {t("landing.footer.newsletter.title")}
                </h3>
                <p className="mt-2 text-xs text-white/75">{t("landing.footer.newsletter.copy")}</p>
                <form
                  className={`mt-3 flex flex-col gap-2 ${isArabic ? "sm:flex-row-reverse" : "sm:flex-row"}`}
                  onSubmit={(event) => event.preventDefault()}
                >
                  <input
                    type="email"
                    dir="ltr"
                    placeholder={t("landing.footer.newsletter.placeholder")}
                    className="h-9 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-200/95 light:border-slate-300 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-full bg-gradient-to-r from-emerald-400 to-green-600 px-5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-300 hover:to-green-500 light:text-white"
                  >
                    {t("landing.footer.newsletter.button")}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
            <div className="sm:col-span-2 md:col-span-1">
              <div className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-200 light:text-emerald-700">
                  <Leaf className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-slate-100 light:text-slate-900">
                  {t("landing.footer.brand.title")}
                </h4>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 light:text-slate-600">
                {t("landing.footer.brand.copy")}
              </p>

              <div className="mt-4 flex items-center gap-2">
                {translatedSocialLinks.map((social) => (
                  <motion.a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20 light:bg-slate-200/80 light:text-slate-700 light:hover:bg-slate-300/80"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 light:text-slate-500">
                {t("landing.footer.columns.company")}
              </h5>
              <ul className="mt-3 space-y-2.5">
                {translatedCompanyLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white light:text-slate-600 light:hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 light:text-slate-500">
                {t("landing.footer.columns.support")}
              </h5>
              <ul className="mt-3 space-y-2.5">
                {translatedSupportLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white light:text-slate-600 light:hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 light:text-slate-500">
                {t("landing.footer.columns.links")}
              </h5>
              <ul className="mt-3 space-y-2.5">
                {translatedProductLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white light:text-slate-600 light:hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 light:text-slate-500">
                {t("landing.footer.columns.contact")}
              </h5>
              <ul className="mt-3 space-y-3 text-sm text-slate-300 light:text-slate-600">
                {translatedContactItems.map((item) => (
                  <li key={item.id} className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                    <item.icon className="h-4 w-4 text-emerald-300 light:text-emerald-600" />
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/12 light:bg-slate-300/70" />

        <div
          className={`flex flex-col gap-3 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:px-8 light:text-slate-500 ${
            isArabic ? "sm:flex-row-reverse sm:justify-between" : "sm:justify-between"
          }`}
        >
          <p>{t("landing.footer.copyright")}</p>
          <div className="flex flex-wrap items-center gap-4">
            {translatedLegalLinks.map((link) => (
              <Link key={link.id} href="#" className="transition hover:text-white light:hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
