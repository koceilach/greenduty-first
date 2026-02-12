"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Clock, MessageSquare, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "contact@GreenDuty.com",
    href: "mailto:contact@GreenDuty.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+213 555 123 456",
    href: "tel:+213555123456",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Algiers, Algeria",
    href: "#",
  },
  {
    icon: Clock,
    label: "Working Hours",
    value: "Sun - Thu: 9AM - 5PM",
    href: "#",
  },
];

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Contact Studio
          </span>
          <h2 className="mb-4 mt-5 text-4xl font-bold text-foreground text-balance md:text-5xl">
            Contact Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions or want to collaborate? We would love to hear from you.
            Reach out and let us build a greener future together.
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -24, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <aside className="relative h-full overflow-hidden rounded-[30px] border border-white/12 bg-white/5 p-6 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.34)] sm:p-7">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-emerald-400/12 blur-3xl" />
                <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-400/15 text-emerald-100">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Let us talk</h3>
                    <p className="text-sm text-slate-300">Designing answers for your eco mission</p>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Support Window</p>
                  <p className="mt-1 text-sm text-slate-200">Sun - Thu, 9:00 AM to 5:00 PM</p>
                </div>

                <div className="space-y-3.5">
                  {contactInfo.map((item, index) => (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.08 }}
                      className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:border-emerald-300/35 hover:bg-white/[0.08]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-200 group-hover:border-emerald-300/35 group-hover:text-emerald-100">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-sm font-medium text-slate-100">
                          {item.value}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-200" />
                    </motion.a>
                  ))}
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">Follow Us</p>
                  <div className="flex flex-wrap gap-2">
                    {["Facebook", "Twitter", "Instagram", "LinkedIn"].map((social) => (
                      <motion.a
                        key={social}
                        href="#"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:border-emerald-300/35 hover:text-emerald-100"
                        title={social}
                      >
                        {social}
                      </motion.a>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-[30px] border border-white/12 bg-white/5 p-6 backdrop-blur-md shadow-[0_22px_52px_rgba(0,0,0,0.34)] md:p-8"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-8 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute bottom-0 right-6 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-slate-200">
                    Response under 24h
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-slate-200">
                    Partnership-friendly
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-slate-200">
                    Community support
                  </span>
                </div>

                <h3 className="mb-6 text-2xl font-semibold text-slate-100">Send us a message</h3>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Your Name
                    </label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <label htmlFor="subject" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="h-11 border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 backdrop-blur-sm"
                  />
                </div>

                <div className="mb-6 space-y-2">
                  <label htmlFor="message" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="resize-none border-white/15 bg-white/[0.07] text-slate-100 placeholder:text-slate-400 backdrop-blur-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 font-semibold text-emerald-950 transition hover:from-emerald-300 hover:to-green-500"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 rounded-full border-2 border-emerald-950/30 border-t-emerald-950"
                      />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
