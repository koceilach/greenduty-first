"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";

const contactInfoConfig = [
  {
    id: "email",
    icon: Mail,
    labelKey: "landing.contact.info.email.label",
    valueKey: "landing.contact.info.email.value",
    href: "mailto:support@greenduty.org",
  },
  {
    id: "phone",
    icon: Phone,
    labelKey: "landing.contact.info.phone.label",
    valueKey: "landing.contact.info.phone.value",
    href: "tel:+213555123456",
  },
  {
    id: "address",
    icon: MapPin,
    labelKey: "landing.contact.info.address.label",
    valueKey: "landing.contact.info.address.value",
    href: "#",
  },
  {
    id: "hours",
    icon: Clock,
    labelKey: "landing.contact.info.hours.label",
    valueKey: "landing.contact.info.hours.value",
    href: "#",
  },
] as const;

const socialPlatforms = ["instagram"] as const;
const INSTAGRAM_URL = "https://www.instagram.com/greenduty2025?igsh=MXllZnk0cnZyNnk2";

export function Contact() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";
  const labelClass = isArabic
    ? "text-[11px] font-semibold tracking-normal text-slate-400 light:text-slate-600"
    : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 light:text-slate-600";
  const WEB3FORMS_ACCESS_KEY =
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ??
    "eb159c4c-a2d4-4127-8642-f204c4693243";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"success" | "error" | null>(null);

  const contactInfo = useMemo(
    () =>
      contactInfoConfig.map((item) => ({
        ...item,
        label: t(item.labelKey),
        value: t(item.valueKey),
      })),
    [t]
  );

  const highlights = useMemo(
    () => [
      t("landing.contact.highlights.response"),
      t("landing.contact.highlights.partnership"),
      t("landing.contact.highlights.community"),
    ],
    [t]
  );

  const socialLinks = useMemo(
    () =>
      socialPlatforms.map((platform) => ({
        id: platform,
        label: t(`landing.contact.social.${platform}`),
        href: INSTAGRAM_URL,
      })),
    [t]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult("");
    setResultType(null);
    setIsSubmitting(true);

    try {
      const formDataPayload = new FormData(e.currentTarget);
      formDataPayload.append("access_key", WEB3FORMS_ACCESS_KEY);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formDataPayload,
      });

      const data = (await response.json()) as { success?: boolean; message?: string };
      if (data.success) {
        setResultType("success");
        setResult(t("landing.contact.form.result.success"));
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setResultType("error");
        setResult(data.message ? `${t("landing.contact.form.result.errorPrefix")} ${data.message}` : t("landing.contact.form.result.errorFallback"));
      }
    } catch {
      setResultType("error");
      setResult(t("landing.contact.form.result.networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className={`relative scroll-mt-24 overflow-hidden bg-transparent py-12 sm:py-16 lg:py-24 ${
        isArabic ? "text-right" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 light:text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("landing.contact.badge")}
          </span>
          <h2 className="mb-4 mt-5 text-balance text-3xl font-bold text-slate-100 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.contact.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 light:text-slate-600">
            {t("landing.contact.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-7 sm:gap-8 xl:grid-cols-[0.86fr_1.14fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className={`border-emerald-300/45 ${
                isArabic ? "border-r-2 pr-4 sm:pr-6" : "border-l-2 pl-4 sm:pl-6"
              }`}
            >
              <div className={`mb-6 flex items-center gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/35 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 light:text-slate-900">
                    {t("landing.contact.panel.title")}
                  </h3>
                  <p className="text-sm text-slate-300 light:text-slate-600">
                    {t("landing.contact.panel.subtitle")}
                  </p>
                </div>
              </div>

              <div className="space-y-1 border-y border-white/10 light:border-slate-300/70">
                {contactInfo.map((item, index) => (
                  <motion.a
                    key={item.id}
                    href={item.href}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                    className={`group grid grid-cols-[auto_1fr] items-center gap-3 border-b border-white/10 py-3 last:border-b-0 sm:grid-cols-[auto_1fr_auto] light:border-slate-300/70 ${
                      isArabic ? "pl-1" : "pr-1"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-slate-200 group-hover:border-emerald-300/35 group-hover:text-emerald-100 light:border-slate-400/60 light:text-slate-600 light:group-hover:border-emerald-500/40 light:group-hover:text-emerald-700">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block break-words text-sm font-medium text-slate-100 light:text-slate-900">
                        {item.value}
                      </span>
                    </span>
                    <ArrowUpRight
                      className={`hidden h-4 w-4 text-slate-400 transition group-hover:text-emerald-200 sm:block light:text-slate-500 light:group-hover:text-emerald-700 ${
                        isArabic ? "-scale-x-100" : ""
                      }`}
                    />
                  </motion.a>
                ))}
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-400 light:text-slate-600">
                  {t("landing.contact.follow")}
                </p>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-xs font-medium text-slate-200 transition hover:text-emerald-100 light:text-slate-700 light:hover:text-emerald-700"
                      title={social.label}
                    >
                      {social.label}
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6 md:p-8 light:border-slate-300/70 light:bg-white/70"
            >
              <div className="relative z-10">
                <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className={`inline-flex items-center gap-2 text-[11px] text-slate-200 light:text-slate-700 ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 light:bg-emerald-600" />
                      {item}
                    </span>
                  ))}
                </div>

                <h3 className="mb-6 text-2xl font-semibold text-slate-100 light:text-slate-900">
                  {t("landing.contact.form.title")}
                </h3>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className={labelClass}
                    >
                      {t("landing.contact.form.name.label")}
                    </label>
                    <Input
                      id="name"
                      name="name"
                      dir={isArabic ? "rtl" : "ltr"}
                      placeholder={t("landing.contact.form.name.placeholder")}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className={labelClass}
                    >
                      {t("landing.contact.form.email.label")}
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      dir="ltr"
                      placeholder={t("landing.contact.form.email.placeholder")}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <label
                    htmlFor="subject"
                    className={labelClass}
                  >
                    {t("landing.contact.form.subject.label")}
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    dir={isArabic ? "rtl" : "ltr"}
                    placeholder={t("landing.contact.form.subject.placeholder")}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                  />
                </div>

                <div className="mb-6 space-y-2">
                  <label
                    htmlFor="message"
                    className={labelClass}
                  >
                    {t("landing.contact.form.message.label")}
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    dir={isArabic ? "rtl" : "ltr"}
                    placeholder={t("landing.contact.form.message.placeholder")}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="resize-none border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-full border border-emerald-300/40 bg-emerald-400/18 px-5 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-200/70 hover:bg-emerald-400/28 sm:w-auto light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 light:hover:bg-emerald-500/20"
                >
                  {isSubmitting ? (
                    <span className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 rounded-full border-2 border-emerald-100/30 border-t-emerald-100 light:border-emerald-700/30 light:border-t-emerald-700"
                      />
                      {t("landing.contact.form.submitting")}
                    </span>
                  ) : (
                    <span className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                      <Send className="h-4 w-4" />
                      {t("landing.contact.form.submit")}
                    </span>
                  )}
                </Button>

                {result && (
                  <p
                    className={`mt-3 text-sm ${
                      resultType === "success"
                        ? "text-emerald-200 light:text-emerald-700"
                        : "text-rose-200 light:text-rose-700"
                    }`}
                  >
                    {result}
                  </p>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
