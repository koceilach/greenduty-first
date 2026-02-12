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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { usePrefetch } from "@/lib/ux/use-prefetch";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Marketplace", href: "/market-place" },
  { name: "About", href: "#about" },
  { 
    name: "Services", 
    href: "#services",
    dropdown: [
      { name: "Pollution Tracker", href: "#pollution" },
      { name: "AgroMarket", href: "#agromarket" },
      { name: "Logistics", href: "#logistics" },
      { name: "GreenDuty Edu", href: "#education" },
    ]
  },
  { name: "Contact", href: "#contact" },
];

const quickAccessIcons = [
  { icon: MapPin, label: "Marketplace", href: "/market-place", bgColor: "hover:bg-emerald-500/10", iconColor: "group-hover:text-emerald-500" },
  { icon: GraduationCap, label: "Education", href: "#education", bgColor: "hover:bg-blue-500/10", iconColor: "group-hover:text-blue-500" },
  { icon: AlertTriangle, label: "Pollution", href: "#pollution", bgColor: "hover:bg-amber-500/10", iconColor: "group-hover:text-amber-500" },
  { icon: Truck, label: "Logistics", href: "#logistics", bgColor: "hover:bg-primary/10", iconColor: "group-hover:text-primary" },
];

export function Navbar() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"EN" | "AR">("EN");
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("Global");
  const prefetch = usePrefetch();

  const dynamicLinks = useMemo(() => {
    return [...navLinks];
  }, []);

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

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8"
    >
      <div
        className={`mx-auto mt-3 max-w-6xl transition-all duration-500 ${
          scrolled
            ? "gd-navbar rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
            : "gd-navbar gd-navbar--transparent rounded-2xl border border-transparent bg-white/[0.02] backdrop-blur-xl"
        }`}
      >
        <nav className="px-4 sm:px-5">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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
                  <span className="gd-navbar-logo-title text-[15px] font-bold tracking-tight text-foreground">GreenDuty</span>
                  <span className="gd-navbar-logo-subtitle mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{country}</span>
                </div>
              </Link>
            </motion.div>

            {/* Desktop Navigation - Center pill */}
            <div className="hidden lg:flex items-center">
              <div className="gd-navbar-pill flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-1">
                {dynamicLinks.map((link) => (
                  <div
                    key={link.name}
                    className="relative"
                    onMouseEnter={() => link.dropdown && setActiveDropdown(link.name)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link
                        href={link.href}
                        {...prefetch(link.href)}
                        className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground/80 transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground"
                      >
                        {link.name}
                        {link.dropdown && (
                          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${activeDropdown === link.name ? "rotate-180" : ""}`} />
                        )}
                      </Link>
                    </motion.div>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {link.dropdown && activeDropdown === link.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="gd-navbar-dropdown absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
                        >
                          {link.dropdown.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              {...prefetch(item.href)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground/80 transition-all duration-150 hover:bg-white/[0.08] hover:text-foreground"
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

            {/* Right side controls */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Quick Access Icons */}
              <div className="gd-navbar-icons flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
                {quickAccessIcons.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    {...prefetch(item.href)}
                    className={`group rounded-full p-2 transition-all duration-200 ${item.bgColor}`}
                    title={item.label}
                  >
                    <item.icon className={`h-3.5 w-3.5 text-muted-foreground/60 transition-colors duration-200 ${item.iconColor}`} />
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="gd-navbar-divider mx-1 h-5 w-px bg-white/[0.08]" />

              {/* Language toggle */}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <button
                  onClick={() => setLanguage(language === "EN" ? "AR" : "EN")}
                  className="gd-navbar-lang flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-muted-foreground/70 transition-all hover:bg-white/[0.07] hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {language}
                </button>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="gd-navbar-mobile-btn lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-all hover:bg-white/[0.08]"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-4 w-4 text-foreground" />
              ) : (
                <Menu className="h-4 w-4 text-foreground" />
              )}
            </motion.button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="gd-navbar-mobile-border lg:hidden overflow-hidden border-t border-white/[0.06]"
            >
              <div className="space-y-1 px-3 py-3">
                {dynamicLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    {...prefetch(link.href)}
                    className="gd-navbar-mobile-link flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/80 transition-all hover:bg-white/[0.06] hover:text-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>{link.name}</span>
                    {link.dropdown && <ChevronDown className="h-3.5 w-3.5" />}
                  </Link>
                ))}

                <div className="gd-navbar-mobile-border mt-3 border-t border-white/[0.06] pt-3">
                  <p className="px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50 mb-2">Quick Access</p>
                  <div className="flex items-center gap-1.5 px-1">
                    {quickAccessIcons.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        {...prefetch(item.href)}
                        className="gd-navbar-mobile-qa flex flex-1 items-center justify-center rounded-xl bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.08]"
                        title={item.label}
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="gd-navbar-mobile-border mt-3 border-t border-white/[0.06] px-1 pt-3">
                  <button
                    onClick={() => setLanguage(language === "EN" ? "AR" : "EN")}
                    className="gd-navbar-lang flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 text-xs font-medium text-muted-foreground/70 transition-all hover:bg-white/[0.06]"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {language === "EN" ? "English" : "العربية"}
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
