"use client";

import { motion } from "framer-motion";
import { ShoppingBag, Truck, Trash2, ArrowRight, User, GraduationCap, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  {
    id: 1,
    title: "Sellers",
    description:
      "Join our marketplace and reach thousands of eco-conscious buyers. Sell your agricultural products, seeds, and sustainable goods.",
    icon: ShoppingBag,
    benefits: ["Direct access to buyers", "Zero commission on first 100 sales", "Marketing support"],
  },
  {
    id: 2,
    title: "Transporters",
    description:
      "Partner with us to deliver goods sustainably. Earn while contributing to eco-friendly logistics across Algeria.",
    icon: Truck,
    benefits: ["Flexible schedules", "Competitive rates", "Route optimization"],
  },
  {
    id: 3,
    title: "Cleaners",
    description:
      "Be a hero in your community. Join cleanup campaigns, report pollution, and earn rewards for environmental action.",
    icon: Trash2,
    benefits: ["Community recognition", "Reward points system", "Environmental impact"],
  },
  {
    id: 4,
    title: "Users",
    description:
      "Create an account to explore our ecosystem. Track pollution, discover local products, and connect with the green community.",
    icon: User,
    benefits: ["Access all features", "Personalized dashboard", "Community forums"],
  },
  {
    id: 5,
    title: "Students",
    description:
      "Learn about sustainability and environmental science. Access exclusive courses, workshops, and earn certificates.",
    icon: GraduationCap,
    benefits: ["Free courses access", "Certificates & badges", "Internship opportunities"],
  },
];

const panelVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.48,
      ease: "easeOut",
    },
  }),
};

const roleTones = [
  {
    badge: "border-emerald-300/35 bg-emerald-400/14 text-emerald-100",
    iconWrap: "border-emerald-300/35 bg-emerald-400/16 text-emerald-100",
    glow: "from-emerald-400/18 to-cyan-300/0",
  },
  {
    badge: "border-cyan-300/30 bg-cyan-400/12 text-cyan-100",
    iconWrap: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
    glow: "from-cyan-400/16 to-sky-300/0",
  },
  {
    badge: "border-amber-300/30 bg-amber-400/12 text-amber-100",
    iconWrap: "border-amber-300/30 bg-amber-400/15 text-amber-100",
    glow: "from-amber-400/16 to-orange-300/0",
  },
  {
    badge: "border-violet-300/30 bg-violet-400/12 text-violet-100",
    iconWrap: "border-violet-300/30 bg-violet-400/15 text-violet-100",
    glow: "from-violet-400/16 to-indigo-300/0",
  },
  {
    badge: "border-rose-300/30 bg-rose-400/12 text-rose-100",
    iconWrap: "border-rose-300/30 bg-rose-400/15 text-rose-100",
    glow: "from-rose-400/16 to-pink-300/0",
  },
];

export function WorkWithUs() {
  const totalBenefits = roles.reduce((sum, role) => sum + role.benefits.length, 0);

  return (
    <section id="team" className="bg-transparent py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Team Network
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Work With Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join the modern green workforce and collaborate through focused roles
            designed for measurable environmental impact.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.aside
            custom={0}
            variants={panelVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/5 p-6 backdrop-blur-md shadow-[0_20px_46px_rgba(0,0,0,0.3)] sm:p-7"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 top-6 h-52 w-52 rounded-full bg-emerald-400/14 blur-3xl" />
              <div className="absolute -bottom-20 right-2 h-56 w-56 rounded-full bg-cyan-300/12 blur-3xl" />
            </div>

            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                Collaboration Hub
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-100 sm:text-3xl">
                Build Your Impact Role
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Pick a role, plug into our ecosystem, and contribute directly to cleaner
                cities, healthier green zones, and community growth.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Open Roles</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">{roles.length}</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Skill Tracks</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">{totalBenefits}+</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Choose the role that fits your strengths",
                  "Contribute through guided missions and tools",
                  "Track your verified impact over time",
                ].map((step, idx) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/14 text-xs font-semibold text-emerald-100">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-200">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-white/10 pt-5">
                <Button className="h-11 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-6 text-sm font-semibold text-emerald-950 hover:from-emerald-300 hover:to-green-500">
                  Start Collaboration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.aside>

          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((role, i) => {
              const tone = roleTones[i % roleTones.length];
              const singularRole = role.title.endsWith("s")
                ? role.title.slice(0, -1)
                : role.title;
              const featured = i === 0;

              return (
            <motion.div
              key={role.id}
              custom={i + 1}
              variants={panelVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-300/35 hover:bg-white/[0.07] ${
                featured ? "sm:col-span-2" : ""
              }`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone.badge}`}>
                    {featured ? "Featured Role" : "Role"}
                  </span>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone.iconWrap}`}>
                    <role.icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="mb-2 text-xl font-semibold text-slate-100">{role.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-300">
                {role.description}
                </p>

                <div className="mb-5 flex flex-wrap gap-2">
                  {role.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-200"
                    >
                      <Check className="h-3 w-3 text-emerald-300" />
                      {benefit}
                    </span>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="h-10 w-full rounded-xl border-white/20 bg-white/[0.04] text-slate-100 transition-all duration-300 hover:border-emerald-300/55 hover:bg-emerald-400/18 hover:text-emerald-50"
                >
                  Join as {singularRole}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
