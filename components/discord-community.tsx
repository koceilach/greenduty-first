"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bolt,
  Clock3,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";

const communityLeaders = [
  { name: "Sara Kunze", reports: "5/8", score: 45, tone: "bg-emerald-400" },
  { name: "Martha Senger", reports: "5/8", score: 19, tone: "bg-rose-400" },
  { name: "Britany Lind II", reports: "5/8", score: 60, tone: "bg-cyan-400" },
];

const featureTiles = [
  {
    title: "Respond faster",
    description: "Coordinate volunteers in real time from one focused Discord space.",
    icon: Bolt,
  },
  {
    title: "Scale community help",
    description: "Turn every report into a shared task that your eco teams can claim.",
    icon: Users,
  },
  {
    title: "Automate moderation",
    description: "Keep threads clean with triage rules, tags, and verification checks.",
    icon: ShieldCheck,
  },
  {
    title: "Launch local missions",
    description: "Publish campaign goals and milestones to keep impact visible.",
    icon: Rocket,
  },
];

export function DiscordCommunity() {
  return (
    <section id="discord-community" className="relative overflow-hidden bg-transparent py-24 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 34, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/5 backdrop-blur-md shadow-[0_30px_70px_rgba(0,0,0,0.4)]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-blue-500/16 blur-3xl" />
            <div className="absolute right-10 top-8 h-60 w-60 rounded-full bg-cyan-400/14 blur-3xl" />
            <div className="absolute bottom-4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>

          <div className="relative border-b border-white/10 px-6 py-5 sm:px-8">
            <span className="inline-flex items-center text-sm text-slate-300">
              GreenDuty Discord community
            </span>
          </div>

          <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="max-w-xl text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
                Build a stronger
                <span className="block text-slate-300">Discord Community flow</span>
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">
                Centralize reporting, volunteer coordination, and response updates in one elegant
                command layer that keeps your environmental operations moving.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-4 py-2 text-xs uppercase tracking-[0.18em] text-emerald-100">
                  Live Operations
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-slate-200">
                  24/7 Community Sync
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/12 bg-black/25 p-4 backdrop-blur-sm">
                <div className="space-y-2.5">
                  {communityLeaders.map((member) => (
                    <div key={member.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <p className="truncate text-xs text-slate-200">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.reports}</p>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${member.tone}`}
                          style={{ width: `${member.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-200/20 bg-gradient-to-b from-[#2058b8]/58 to-[#0b1634]/65 p-5 shadow-[0_0_40px_rgba(56,189,248,0.22)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/90">Performance</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] text-cyan-100">
                    <Clock3 className="h-3 w-3" />
                    Due in 3 days
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-semibold text-white">67%</p>
                  <p className="text-xs text-cyan-100/80">efficiency based on key indicators</p>
                </div>

                <div className="h-28 overflow-hidden rounded-2xl border border-white/12 bg-black/20 p-3">
                  <svg viewBox="0 0 300 90" className="h-full w-full">
                    <path
                      d="M0 75 C28 70, 38 56, 65 58 C88 61, 95 43, 120 48 C145 54, 155 35, 180 40 C200 44, 208 30, 230 37 C252 44, 265 27, 300 33"
                      fill="none"
                      stroke="rgba(52,211,153,0.95)"
                      strokeWidth="2"
                    />
                    <path
                      d="M0 81 C28 76, 40 70, 65 73 C90 76, 99 60, 124 66 C150 72, 164 55, 188 59 C212 63, 230 46, 252 52 C270 56, 280 44, 300 47"
                      fill="none"
                      stroke="rgba(250,204,21,0.9)"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-cyan-100/85">
                  <span>Assignees 5/8</span>
                  <span>Tasks 31%</span>
                  <span>Performance 67%</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="relative grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4">
            {featureTiles.map((tile, index) => (
              <motion.div
                key={tile.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:border-white/10 last:sm:border-r-0"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-100">
                  <tile.icon className="h-4 w-4" />
                </div>
                <p className="text-xl font-medium text-slate-100">{tile.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{tile.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="#"
            whileHover={{ x: 4 }}
            className="absolute right-6 top-5 hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-emerald-300/35 hover:text-emerald-100 sm:inline-flex"
          >
            Join Discord
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
