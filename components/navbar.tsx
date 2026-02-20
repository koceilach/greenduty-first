"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  GraduationCap,
  AlertTriangle,
  Truck,
  Menu,
  X,
  Globe,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { usePrefetch } from "@/lib/ux/use-prefetch";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

type NavDropdownItem = {
  labelKey: string;
  href: string;
};

type NavLinkItem = {
  labelKey: string;
  href: string;
  dropdown?: NavDropdownItem[];
};

const navLinks: NavLinkItem[] = [
  { labelKey: "nav.home", href: "#home" },
  { labelKey: "nav.quick.marketplace", href: "/market-place" },
  { labelKey: "nav.about", href: "#about" },
  {
    labelKey: "nav.services",
    href: "#services",
    dropdown: [
      { labelKey: "nav.services.pollution", href: "#pollution" },
      { labelKey: "nav.services.agromarket", href: "#agromarket" },
      { labelKey: "nav.services.logistics", href: "#logistics" },
      { labelKey: "nav.services.edu", href: "#education" },
    ],
  },
  { labelKey: "nav.contact", href: "#contact" },
];

const quickAccessIcons = [
  {
    icon: MapPin,
    labelKey: "nav.quick.marketplace",
    href: "/market-place",
    bgColor: "hover:bg-emerald-500/10",
    iconColor: "group-hover:text-emerald-500",
  },
  {
    icon: GraduationCap,
    labelKey: "nav.quick.education",
    href: "#education",
    bgColor: "hover:bg-blue-500/10",
    iconColor: "group-hover:text-blue-500",
  },
  {
    icon: AlertTriangle,
    labelKey: "nav.quick.pollution",
    href: "#pollution",
    bgColor: "hover:bg-amber-500/10",
    iconColor: "group-hover:text-amber-500",
  },
  {
    icon: Truck,
    labelKey: "nav.quick.logistics",
    href: "#logistics",
    bgColor: "hover:bg-primary/10",
    iconColor: "group-hover:text-primary",
  },
] as const;

const localeCycleOrder: Locale[] = ["en", "fr", "ar"];

const localeMeta: Record<Locale, { short: string; label: string }> = {
  en: { short: "EN", label: "English" },
  fr: { short: "FR", label: "Français" },
  ar: { short: "AR", label: "العربية" },
};

export function Navbar() {
  const { profile } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const isArabic = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("Global");
  const prefetch = usePrefetch();

  const dynamicLinks = useMemo(() => {
    return navLinks.map((item) => ({
      ...item,
      name: t(item.labelKey),
      dropdown: item.dropdown?.map((subItem) => ({
        ...subItem,
        name: t(subItem.labelKey),
      })),
    }));
  }, [t]);

  const currentLocale = localeMeta[locale];

  const handleCycleLocale = () => {
    const currentIndex = localeCycleOrder.indexOf(locale);
    const nextLocale = localeCycleOrder[(currentIndex + 1) % localeCycleOrder.length];
    setLocale(nextLocale);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.country_name) {
          setCountry(data.country_name);
        }
      } catch {
        setCountry("Global");
      }
    };
    fetchLocation();
  }, []);

  void profile;

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 right-0 top-0 z-50 px-4 sm:px-6 lg:px-8"
    >
      <div
        className={`mx-auto mt-3 max-w-6xl transition-all duration-500 ${
          scrolled
            ? "gd-navbar rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
            : "gd-navbar gd-navbar--transparent rounded-2xl border border-transparent bg-white/[0.02] backdrop-blur-xl"
        }`}
      >
        <nav className="px-4 sm:px-5">
          <div className="flex h-16 items-center justify-between">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex-shrink-0"
            >
              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/10">
                    <img src="/logo.png" alt="GreenDuty" className="h-7 w-7 object-contain" />
                  </div>
                  <div className="gd-navbar-logo-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-black/30 bg-emerald-400 shadow-sm" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="gd-navbar-logo-title text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    GreenDuty
                  </span>
                  <span className="gd-navbar-logo-subtitle mt-0.5 max-w-[8.5rem] truncate text-[9px] font-medium uppercase tracking-[0.12em] text-gray-600 dark:text-gray-400">
                    {country}
                  </span>
                </div>
              </Link>
            </motion.div>

            <div className="hidden items-center lg:flex">
              <div className="gd-navbar-pill flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-1">
                {dynamicLinks.map((link) => (
                  <div
                    key={link.labelKey}
                    className="relative"
                    onMouseEnter={() => link.dropdown && setActiveDropdown(link.labelKey)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link
                        href={link.href}
                        {...prefetch(link.href)}
                        className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-gray-600 transition-all duration-200 hover:bg-white/[0.08] hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      >
                        {link.name}
                        {link.dropdown && (
                          <ChevronDown
                            className={`h-3 w-3 transition-transform duration-200 ${
                              activeDropdown === link.labelKey ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </Link>
                    </motion.div>

                    <AnimatePresence>
                      {link.dropdown && activeDropdown === link.labelKey && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="gd-navbar-dropdown absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
                        >
                          {link.dropdown.map((item) => (
                            <Link
                              key={item.labelKey}
                              href={item.href}
                              {...prefetch(item.href)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-gray-600 transition-all duration-150 hover:bg-white/[0.08] hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                            >
                              {item.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <div className="gd-navbar-icons flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
                {quickAccessIcons.map((item) => (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    {...prefetch(item.href)}
                    className={`group rounded-full p-2 transition-all duration-200 ${item.bgColor}`}
                    title={t(item.labelKey)}
                  >
                    <item.icon
                      className={`h-3.5 w-3.5 text-gray-600 transition-colors duration-200 dark:text-gray-400 ${item.iconColor}`}
                    />
                  </Link>
                ))}
              </div>

              <div className="gd-navbar-divider mx-1 h-5 w-px bg-white/[0.08]" />

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <button
                  onClick={handleCycleLocale}
                  className="gd-navbar-lang flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-gray-600 transition-all hover:bg-white/[0.07] hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                  aria-label={`Switch language (${currentLocale.label})`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {currentLocale.short}
                </button>
              </motion.div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              className="gd-navbar-mobile-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all hover:bg-white/[0.08] lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
              ) : (
                <Menu className="h-4 w-4 text-gray-900 dark:text-gray-100" />
              )}
            </motion.button>
          </div>
        </nav>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="gd-navbar-mobile-border overflow-hidden border-t border-white/[0.06] lg:hidden"
            >
              <div className={`space-y-1 px-3 py-3 ${isArabic ? "text-right" : ""}`}>
                {dynamicLinks.map((link) => (
                  <Link
                    key={link.labelKey}
                    href={link.href}
                    {...prefetch(link.href)}
                    className={`gd-navbar-mobile-link flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-white/[0.06] hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>{link.name}</span>
                    {link.dropdown && <ChevronDown className="h-3.5 w-3.5" />}
                  </Link>
                ))}

                <div className="gd-navbar-mobile-border mt-3 border-t border-white/[0.06] pt-3">
                  <p
                    className={`mb-2 px-3 text-[10px] font-medium text-gray-600 dark:text-gray-400 ${
                      isArabic ? "" : "uppercase tracking-[0.14em]"
                    }`}
                  >
                    {t("nav.quickAccess")}
                  </p>
                  <div className="flex items-center gap-1.5 px-1">
                    {quickAccessIcons.map((item) => (
                      <Link
                        key={item.labelKey}
                        href={item.href}
                        {...prefetch(item.href)}
                        className="gd-navbar-mobile-qa flex flex-1 items-center justify-center rounded-xl bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.08]"
                        title={t(item.labelKey)}
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="gd-navbar-mobile-border mt-3 border-t border-white/[0.06] px-1 pt-3">
                  <button
                    onClick={handleCycleLocale}
                    className="gd-navbar-lang flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 text-xs font-medium text-gray-600 transition-all hover:bg-white/[0.06] dark:text-gray-300"
                    aria-label={`Switch language (${currentLocale.label})`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {currentLocale.label} ({currentLocale.short})
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
