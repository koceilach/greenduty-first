"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { supabase } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type ReportStatus = "open" | "reviewed" | "dismissed" | "action_taken";

type ModerationReport = {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  actionNote: string | null;
  post: {
    id: string;
    title: string;
    body: string | null;
    ownerId: string;
    status: string;
  } | null;
  reporter: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  reviewer: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
};

type AuditItem = {
  id: string;
  reportId: string;
  action: string;
  note: string | null;
  actorId: string;
  createdAt: string;
  actorName: string;
};

type SanctionItem = {
  id: string;
  userId: string;
  sanctionType: string;
  reason: string;
  active: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  userName: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

const statusStyles: Record<ReportStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  reviewed: "bg-sky-100 text-sky-700",
  dismissed: "bg-slate-100 text-slate-600",
  action_taken: "bg-rose-100 text-rose-700",
};

const statusLabel: Record<ReportStatus, string> = {
  open: "Open",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
  action_taken: "Action Taken",
};

const touch = "active:scale-[0.97] transition-all duration-200";

const toDisplayName = (profile?: ProfileRow | null) => {
  const full = profile?.full_name?.trim();
  if (full) return full;
  const username = profile?.username?.trim();
  if (username) return username;
  return "User";
};

export default function EducationModerationPage() {
  const [loading, setLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [auditByReport, setAuditByReport] = useState<Record<string, AuditItem[]>>({});
  const [activeSanctions, setActiveSanctions] = useState<SanctionItem[]>([]);
  const [noteByReport, setNoteByReport] = useState<Record<string, string>>({});
  const [sanctionTypeByReport, setSanctionTypeByReport] = useState<Record<string, string>>({});
  const [sanctionDaysByReport, setSanctionDaysByReport] = useState<Record<string, string>>({});
  const [actingReportId, setActingReportId] = useState<string | null>(null);

  const loadModerationData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setAdminAllowed(false);
      setReports([]);
      setAuditByReport({});
      setActiveSanctions([]);
      setLoading(false);
      return;
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      "is_platform_admin",
      { p_user_id: user.id }
    );
    if (adminError || !isAdmin) {
      setAdminAllowed(false);
      setReports([]);
      setAuditByReport({});
      setActiveSanctions([]);
      setLoading(false);
      return;
    }
    setAdminAllowed(true);

    const { data: reportRows, error: reportError } = await supabase
      .from("edu_post_reports")
      .select(
        "id,post_id,reporter_id,reason,status,created_at,reviewed_at,reviewed_by,action_note"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (reportError) {
      setError(reportError.message);
      setLoading(false);
      return;
    }

    const rows =
      (reportRows as Array<{
        id: string;
        post_id: string;
        reporter_id: string;
        reason: string;
        status: ReportStatus;
        created_at: string;
        reviewed_at: string | null;
        reviewed_by: string | null;
        action_note: string | null;
      }>) ?? [];

    const reportIds = rows.map((row) => row.id);
    const postIds = Array.from(new Set(rows.map((row) => row.post_id).filter(Boolean)));
    const profileIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [row.reporter_id, row.reviewed_by])
          .filter((id): id is string => Boolean(id))
      )
    );

    const [postsResult, profilesResult, auditsResult, sanctionsResult] = await Promise.all([
      postIds.length
        ? supabase
            .from("edu_posts")
            .select("id,title,body,user_id,status")
            .in("id", postIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      profileIds.length
        ? supabase
            .from("profiles")
            .select("id,full_name,username,avatar_url")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      reportIds.length
        ? supabase
            .from("edu_post_report_audit")
            .select("id,report_id,action,note,actor_id,created_at")
            .in("report_id", reportIds)
            .order("created_at", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase
        .from("edu_user_sanctions")
        .select("id,user_id,sanction_type,reason,active,starts_at,ends_at,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const postsById = new Map(
      ((postsResult.data ?? []) as Array<{
        id: string;
        title: string;
        body: string | null;
        user_id: string;
        status: string;
      }>).map((post) => [post.id, post])
    );

    const profilesById = new Map(
      ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    const mappedReports: ModerationReport[] = rows.map((row) => {
      const post = postsById.get(row.post_id);
      const reporterProfile = profilesById.get(row.reporter_id);
      const reviewerProfile = row.reviewed_by ? profilesById.get(row.reviewed_by) : null;
      return {
        id: row.id,
        postId: row.post_id,
        reporterId: row.reporter_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        actionNote: row.action_note,
        post: post
          ? {
              id: post.id,
              title: post.title,
              body: post.body,
              ownerId: post.user_id,
              status: post.status,
            }
          : null,
        reporter: reporterProfile
          ? {
              id: reporterProfile.id,
              fullName: toDisplayName(reporterProfile),
              username: reporterProfile.username?.trim() || reporterProfile.id.slice(0, 8),
              avatarUrl: reporterProfile.avatar_url ?? null,
            }
          : null,
        reviewer: reviewerProfile
          ? {
              id: reviewerProfile.id,
              fullName: toDisplayName(reviewerProfile),
              username: reviewerProfile.username?.trim() || reviewerProfile.id.slice(0, 8),
              avatarUrl: reviewerProfile.avatar_url ?? null,
            }
          : null,
      };
    });
    setReports(mappedReports);

    const auditMap: Record<string, AuditItem[]> = {};
    for (const row of (auditsResult.data ??
      []) as Array<{
      id: string;
      report_id: string;
      action: string;
      note: string | null;
      actor_id: string;
      created_at: string;
    }>) {
      const actorProfile = profilesById.get(row.actor_id);
      const item: AuditItem = {
        id: row.id,
        reportId: row.report_id,
        action: row.action,
        note: row.note,
        actorId: row.actor_id,
        createdAt: row.created_at,
        actorName: toDisplayName(actorProfile),
      };
      if (!auditMap[row.report_id]) {
        auditMap[row.report_id] = [item];
      } else {
        auditMap[row.report_id].push(item);
      }
    }
    setAuditByReport(auditMap);

    const sanctionProfileIds = Array.from(
      new Set(
        ((sanctionsResult.data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)
      )
    );
    let sanctionProfiles = profilesById;
    if (sanctionProfileIds.length) {
      const missing = sanctionProfileIds.filter((id) => !sanctionProfiles.has(id));
      if (missing.length) {
        const { data: extraProfiles } = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url")
          .in("id", missing);
        sanctionProfiles = new Map([
          ...Array.from(sanctionProfiles.entries()),
          ...((extraProfiles ?? []) as ProfileRow[]).map(
            (row): [string, ProfileRow] => [row.id, row]
          ),
        ]);
      }
    }

    const mappedSanctions: SanctionItem[] = ((sanctionsResult.data ??
      []) as Array<{
      id: string;
      user_id: string;
      sanction_type: string;
      reason: string;
      active: boolean;
      starts_at: string;
      ends_at: string | null;
      created_at: string;
    }>).map((sanction) => {
      const profile = sanctionProfiles.get(sanction.user_id);
      return {
        id: sanction.id,
        userId: sanction.user_id,
        sanctionType: sanction.sanction_type,
        reason: sanction.reason,
        active: sanction.active,
        startsAt: sanction.starts_at,
        endsAt: sanction.ends_at,
        createdAt: sanction.created_at,
        userName: toDisplayName(profile),
      };
    });
    setActiveSanctions(mappedSanctions);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadModerationData();
  }, [loadModerationData]);

  const runReportAction = useCallback(
    async (
      reportId: string,
      action: "reviewed" | "dismissed" | "action_taken",
      options?: { applySanction?: boolean }
    ) => {
      const note = noteByReport[reportId]?.trim() || null;
      const sanctionType = sanctionTypeByReport[reportId] || null;
      const sanctionDaysRaw = sanctionDaysByReport[reportId]?.trim() || "";
      const sanctionDays = sanctionDaysRaw.length ? Number(sanctionDaysRaw) : null;
      setActingReportId(reportId);

      const { error: actionError } = await supabase.rpc("edu_review_post_report", {
        p_report_id: reportId,
        p_action: action,
        p_note: note,
        p_apply_sanction: Boolean(options?.applySanction),
        p_sanction_type: options?.applySanction ? sanctionType : null,
        p_sanction_days:
          options?.applySanction && Number.isFinite(sanctionDays) && sanctionDays && sanctionDays > 0
            ? sanctionDays
            : null,
      });

      if (actionError) {
        setError(actionError.message);
        setActingReportId(null);
        return;
      }

      setError(null);
      setActingReportId(null);
      await loadModerationData();
    },
    [loadModerationData, noteByReport, sanctionDaysByReport, sanctionTypeByReport]
  );

  const openReports = useMemo(
    () => reports.filter((report) => report.status === "open"),
    [reports]
  );

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6">
        <EduSidebar side="left" />

        <main className="min-w-0 space-y-4">
          <section className="rounded-[2rem] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Education Moderation
                </p>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">
                  Reports & Sanctions Cockpit
                </h1>
              </div>
              <div className="inline-flex h-11 items-center rounded-full bg-emerald-100 px-4 text-xs font-semibold text-emerald-700">
                {openReports.length} open reports
              </div>
            </div>
          </section>

          {loading ? (
            <section className="grid min-h-[50vh] place-items-center rounded-[2rem] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Loading moderation queue...
              </div>
            </section>
          ) : !adminAllowed ? (
            <section className="rounded-[2rem] bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
              <p className="mt-3 text-sm font-semibold text-slate-800">Admin access required</p>
              <p className="mt-1 text-sm text-slate-500">
                This moderation dashboard is only available to platform admins.
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              {error && (
                <div className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              {reports.length === 0 ? (
                <div className="rounded-[2rem] bg-white p-8 text-center text-sm text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  No reports yet.
                </div>
              ) : (
                reports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-[2rem] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Reported Post
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {report.post?.title ?? "Deleted post"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Reporter: @{report.reporter?.username ?? report.reporterId.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{report.reason}</p>
                      </div>
                      <span
                        className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold ${statusStyles[report.status]}`}
                      >
                        {statusLabel[report.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <textarea
                        value={noteByReport[report.id] ?? report.actionNote ?? ""}
                        onChange={(event) =>
                          setNoteByReport((prev) => ({
                            ...prev,
                            [report.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full rounded-3xl bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Moderator note..."
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <select
                          value={sanctionTypeByReport[report.id] ?? "warn"}
                          onChange={(event) =>
                            setSanctionTypeByReport((prev) => ({
                              ...prev,
                              [report.id]: event.target.value,
                            }))
                          }
                          className="h-11 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="warn">Warn</option>
                          <option value="mute_education">Mute EDU</option>
                          <option value="suspend_education">Suspend EDU</option>
                          <option value="ban_education">Ban EDU</option>
                        </select>
                        <input
                          value={sanctionDaysByReport[report.id] ?? ""}
                          onChange={(event) =>
                            setSanctionDaysByReport((prev) => ({
                              ...prev,
                              [report.id]: event.target.value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          placeholder="Days"
                          className="h-11 w-20 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void runReportAction(report.id, "reviewed");
                        }}
                        disabled={actingReportId === report.id}
                        className={`inline-flex h-11 items-center gap-2 rounded-full bg-sky-100 px-4 text-xs font-semibold text-sky-700 disabled:opacity-60 ${touch}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void runReportAction(report.id, "dismissed");
                        }}
                        disabled={actingReportId === report.id}
                        className={`inline-flex h-11 items-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-semibold text-slate-700 disabled:opacity-60 ${touch}`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void runReportAction(report.id, "action_taken");
                        }}
                        disabled={actingReportId === report.id}
                        className={`inline-flex h-11 items-center gap-2 rounded-full bg-rose-100 px-4 text-xs font-semibold text-rose-700 disabled:opacity-60 ${touch}`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Archive post
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void runReportAction(report.id, "action_taken", {
                            applySanction: true,
                          });
                        }}
                        disabled={actingReportId === report.id}
                        className={`inline-flex h-11 items-center gap-2 rounded-full bg-amber-100 px-4 text-xs font-semibold text-amber-700 disabled:opacity-60 ${touch}`}
                      >
                        {actingReportId === report.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        Archive + sanction
                      </button>
                    </div>

                    {auditByReport[report.id]?.length ? (
                      <div className="mt-3 rounded-3xl bg-slate-100 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Audit Trail
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {auditByReport[report.id].slice(0, 4).map((audit) => (
                            <p key={audit.id} className="text-xs text-slate-600">
                              <span className="font-semibold text-slate-800">
                                {audit.action}
                              </span>{" "}
                              by {audit.actorName} - {new Date(audit.createdAt).toLocaleString()}
                              {audit.note ? ` - ${audit.note}` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </section>
          )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <section className="rounded-[2rem] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Active Sanctions
              </div>
              <div className="mt-3 space-y-2">
                {activeSanctions.length ? (
                  activeSanctions.map((sanction) => (
                    <div key={sanction.id} className="rounded-3xl bg-slate-100 p-3">
                      <p className="text-xs font-semibold text-slate-800">{sanction.userName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {sanction.sanctionType}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{sanction.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No active sanctions.</p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
      <MobileBottomNav />
    </div>
  );
}
