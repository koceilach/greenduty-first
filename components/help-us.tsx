"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Bug, ImagePlus, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";

const BUG_REPORT_ACCESS_KEY = "596f3b3d-6cf5-4841-831a-3a8ea4f65090";

export function HelpUs() {
  const { t, locale } = useI18n();
  const isArabic = locale === "ar";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"success" | "error" | null>(null);
  const attachmentLabel = selectedAttachmentName ?? t("landing.help.form.attachment.none");
  const panelPoints = useMemo(
    () => [
      t("landing.help.panel.point1"),
      t("landing.help.panel.point2"),
      t("landing.help.panel.point3"),
    ],
    [t]
  );

  const labelClass = isArabic
    ? "text-[11px] font-semibold tracking-normal text-slate-400 light:text-slate-600"
    : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 light:text-slate-600";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult("");
    setResultType(null);
    setIsSubmitting(true);

    try {
      const payload = new FormData(event.currentTarget);
      payload.append("access_key", BUG_REPORT_ACCESS_KEY);
      payload.append("subject", t("landing.help.form.subject"));
      payload.append("from_name", t("landing.help.form.fromName"));

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as { success?: boolean; message?: string };

      if (data.success) {
        setResultType("success");
        setResult(t("landing.help.form.result.success"));
        setFormData({ name: "", email: "", message: "" });
        setSelectedAttachmentName(null);
        event.currentTarget.reset();
      } else {
        setResultType("error");
        setResult(data.message || t("landing.help.form.result.error"));
      }
    } catch {
      setResultType("error");
      setResult(t("landing.help.form.result.network"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="help-us"
      dir={isArabic ? "rtl" : "ltr"}
      className={`relative scroll-mt-24 overflow-hidden bg-transparent py-12 sm:py-16 lg:py-24 ${
        isArabic ? "text-right" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-200 light:text-emerald-700 ${
              isArabic ? "tracking-normal" : "uppercase tracking-[0.22em]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("landing.help.badge")}
          </span>
          <h2 className="mb-4 mt-5 text-balance text-3xl font-bold text-slate-100 light:text-slate-900 sm:text-4xl md:text-5xl">
            {t("landing.help.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-base leading-relaxed text-slate-300 light:text-slate-600 sm:text-lg">
            {t("landing.help.subtitle")}
          </p>
        </motion.div>

        <div className={`grid gap-7 sm:gap-8 ${isArabic ? "lg:grid-cols-[1.12fr_0.88fr]" : "lg:grid-cols-[0.88fr_1.12fr]"}`}>
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.05] p-5 backdrop-blur-sm light:border-slate-300/70 light:bg-white/70 sm:p-6"
          >
            <div className="pointer-events-none absolute -left-10 top-2 h-40 w-40 rounded-full bg-emerald-400/18 blur-3xl light:bg-emerald-400/12" />
            <div className="relative z-10">
              <div className={`mb-4 flex items-center gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/35 text-emerald-200 light:border-emerald-500/35 light:text-emerald-700">
                  <Bug className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p
                    className={`text-[11px] text-emerald-200 light:text-emerald-700 ${
                      isArabic ? "tracking-normal" : "uppercase tracking-[0.2em]"
                    }`}
                  >
                    {t("landing.help.panel.tag")}
                  </p>
                  <p className="text-sm text-slate-300 light:text-slate-600">
                    {t("landing.help.panel.title")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-y border-white/10 py-4 light:border-slate-300/70">
                {panelPoints.map((line) => (
                  <p
                    key={line}
                    className={`flex items-start gap-2 text-sm leading-relaxed text-slate-200 light:text-slate-700 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 light:bg-emerald-600" />
                    {line}
                  </p>
                ))}
              </div>

              <div className={`mt-4 inline-flex items-center gap-2 text-xs text-slate-300 light:text-slate-600 ${isArabic ? "flex-row-reverse" : ""}`}>
                <ShieldCheck className="h-4 w-4 text-emerald-300 light:text-emerald-700" />
                {t("landing.help.panel.privacy")}
              </div>
            </div>
          </motion.aside>

          <motion.form
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6 md:p-8 light:border-slate-300/70 light:bg-white/70"
          >
            <div className="relative z-10">
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="bug-name" className={labelClass}>
                    {t("landing.help.form.name.label")}
                  </label>
                  <Input
                    id="bug-name"
                    name="name"
                    dir={isArabic ? "rtl" : "ltr"}
                    required
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder={t("landing.help.form.name.placeholder")}
                    className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="bug-email" className={labelClass}>
                    {t("landing.help.form.email.label")}
                  </label>
                  <Input
                    id="bug-email"
                    name="email"
                    type="email"
                    dir="ltr"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    placeholder={t("landing.help.form.email.placeholder")}
                    className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <label htmlFor="bug-message" className={labelClass}>
                  {t("landing.help.form.message.label")}
                </label>
                <Textarea
                  id="bug-message"
                  name="message"
                  dir={isArabic ? "rtl" : "ltr"}
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                  placeholder={t("landing.help.form.message.placeholder")}
                  className="resize-none border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 light:border-slate-300/80 light:bg-white light:text-slate-900 light:placeholder:text-slate-500"
                />
              </div>

              <div className="mb-6 space-y-2">
                <label htmlFor="bug-attachment" className={labelClass}>
                  {t("landing.help.form.attachment.label")}
                </label>
                <label
                  htmlFor="bug-attachment"
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-300/45 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-400/14 light:border-emerald-500/35 light:bg-emerald-500/10 light:text-emerald-700 ${
                    isArabic ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className={`inline-flex min-w-0 items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                    <ImagePlus className="h-4 w-4" />
                    <span className="max-w-[170px] truncate text-xs sm:max-w-[320px] sm:text-sm">
                      {attachmentLabel}
                    </span>
                  </span>
                  <span
                    className={`rounded-full border border-emerald-300/40 px-3 py-1 text-[11px] font-semibold light:border-emerald-500/35 ${
                      isArabic ? "tracking-normal" : "uppercase tracking-[0.14em]"
                    }`}
                  >
                    {t("landing.help.form.attachment.browse")}
                  </span>
                </label>
                <input
                  id="bug-attachment"
                  type="file"
                  name="attachment"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedAttachmentName(file ? file.name : null);
                  }}
                />
                <p className="text-[11px] text-slate-400 light:text-slate-600">
                  {t("landing.help.form.attachment.hint")}
                </p>
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
                    {t("landing.help.form.submitting")}
                  </span>
                ) : (
                  <span className={`flex items-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                    <Send className="h-4 w-4" />
                    {t("landing.help.form.submit")}
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
          </motion.form>
        </div>
      </div>
    </section>
  );
}
