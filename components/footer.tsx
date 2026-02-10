"use client";

import { motion } from "framer-motion";
import {
  Leaf,
  Sparkles,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";

const companyLinks = [
  { name: "About Us", href: "#" },
  { name: "Services", href: "#" },
  { name: "Community", href: "#" },
  { name: "Testimonials", href: "#" },
];

const supportLinks = [
  { name: "Help Center", href: "#" },
  { name: "Tweet Us", href: "#" },
  { name: "Status", href: "#" },
  { name: "Feedback", href: "#" },
];

const productLinks = [
  { name: "Courses", href: "#" },
  { name: "GreenSpot Tracker", href: "#" },
  { name: "Service", href: "#" },
  { name: "Add-On", href: "#" },
];

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="relative px-4 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[22px] border border-white/10 bg-white/5 text-slate-100 shadow-[0_24px_65px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="px-4 pb-6 pt-6 sm:px-8 sm:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[14px] border border-white/15 bg-white/10 px-5 py-6 text-slate-100 shadow-[0_16px_40px_rgba(16,185,129,0.2)] backdrop-blur-md sm:px-7"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/16">
                  <Leaf className="h-8 w-8 text-white" />
                  <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-white/90" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/75">
                    GreenDuty Bulletin
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    Weekly updates on verified planting missions
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md">
                <h3 className="text-base font-semibold leading-snug sm:text-lg">
                  Subscribe to our newsletter to get updates to our latest collections
                </h3>
                <p className="mt-2 text-xs text-white/75">
                  Get 30% off on your first order just by subscribing.
                </p>
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <input
                    type="email"
                    placeholder="Enter your mail"
                    className="h-9 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-300/70"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-full bg-gradient-to-r from-emerald-400 to-green-600 px-5 text-sm font-semibold text-emerald-950 transition hover:from-emerald-300 hover:to-green-500"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
              <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-200">
                  <Leaf className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-slate-100">
                  Stay Clean
                </h4>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do tempor.
              </p>

              <div className="mt-4 flex items-center gap-2">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Company
              </h5>
              <ul className="mt-3 space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Support
              </h5>
              <ul className="mt-3 space-y-2.5">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Links
              </h5>
              <ul className="mt-3 space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Contact Us
              </h5>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-300" />
                  <span>(+1) 98765 4321 54</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-300" />
                  <span>support@mail.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-300" />
                  <span>Algiers, Algeria</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/12" />

        <div className="flex flex-col gap-3 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>(c) 2026 Copyright by GreenDuty. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="#" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="#" className="transition hover:text-white">
              Terms of Use
            </Link>
            <Link href="#" className="transition hover:text-white">
              Legal
            </Link>
            <Link href="#" className="transition hover:text-white">
              Site Map
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

