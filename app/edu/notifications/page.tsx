import Link from "next/link";
import { Bell, CheckCircle2, MessageCircle, ShieldAlert } from "lucide-react";
import { EduNavbar } from "@/components/edu/Navbar";

const notifications = [
  {
    id: "n1",
    title: "AI Verification Complete",
    description: "Your post “Soil health check in 60 seconds” is now Verified.",
    time: "2h ago",
    icon: CheckCircle2,
    accent: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "n2",
    title: "Comment Received",
    description: "Eco Atlas commented on your crop rotation post.",
    time: "5h ago",
    icon: MessageCircle,
    accent: "text-sky-600 bg-sky-50",
  },
  {
    id: "n3",
    title: "Needs Review",
    description: "AI flagged a claim in your water capture post for expert review.",
    time: "1d ago",
    icon: ShieldAlert,
    accent: "text-amber-600 bg-amber-50",
  },
];

export default function EduNotificationsPage() {
  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">Updates about your EDU activity and AI review.</p>
          </div>
          <Link
            href="/edu"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          Back to EDU
        </Link>
        </div>

        <div className="mt-6 space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Bell className="h-4 w-4" />
            Notification settings
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage which EDU alerts you receive for verification, comments, and saves.
          </p>
          <button className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:text-[#1E7F43] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Manage settings
          </button>
        </div>
      </div>
    </div>
  );
}
