"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Brain,
  Camera,
  Check,
  Clock3,
  ChevronDown,
  Crown,
  Droplets,
  Flower2,
  Home,
  ImagePlus,
  MapPin,
  Plus,
  LogOut,
  Search,
  SendHorizontal,
  Sparkles,
  Sprout,
  Trophy,
  Trees,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useGreenspotProfile } from "@/lib/greenspot/use-greenspot-profile";
import { greenspotClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
});

const sidebarItems = [
  { key: "home", label: "Home", icon: Home },
  { key: "dashboard", label: "Intelligent Dashboard", icon: BarChart3 },
  { key: "reminders", label: "Reminders", icon: Bell },
  { key: "profile", label: "Profile", icon: UserRound },
] as const;

const reportCategories = [
  { key: "watering", label: "Watering", icon: Droplets },
  { key: "planting", label: "Planting", icon: Sprout },
  { key: "tree-planting", label: "Tree Planting", icon: Trees },
  { key: "flower-planting", label: "Flower Planting", icon: Flower2 },
] as const;

const expertOptions = [
  { value: "planting-team", label: "Planting Team" },
  { value: "irrigation-team", label: "Irrigation Team" },
  { value: "arborist-team", label: "Arborist Team" },
  { value: "floral-team", label: "Floral Team" },
] as const;

type CategoryKey = (typeof reportCategories)[number]["key"];
type CategorySelection = CategoryKey | null;
type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
};
type AiGardenPlan = {
  beforeImageUrl: string;
  designImageUrl: string;
  suggestedPlants: string[];
  summary: string;
};
type AiMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  imageUrl?: string;
  gardenPlan?: AiGardenPlan;
};
type AiBackendResponse = {
  inScope: boolean;
  reply: string;
  summary: string;
  suggestedPlants: string[];
  designImageUrl: string | null;
};
type ReportItem = {
  id: string;
  user_id: string;
  area: string;
  lat: number;
  lng: number;
  waste_type: string;
  notes: string;
  user_name: string;
  user_avatar?: string | null;
  verified_count: number;
  status: string;
  image_url?: string | null;
  created_at?: string;
};
type ReportProfilePayload = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  fullName?: string | null;
  username?: string | null;
  nameLastChangedAt?: string | null;
  nextNameChangeAt?: string | null;
  canChangeName?: boolean;
  nameCooldownDays?: number;
  accountTier: string | null;
  verificationStatus: string | null;
};
type ReportApiResponse = {
  reports: ReportItem[];
  me: ReportProfilePayload | null;
};
type CareReminderTask = {
  id: string;
  user_id: string;
  greenspot_report_id?: string | null;
  plant_name: string;
  task_type: string;
  due_at: string;
  description: string;
  tips?: string | null;
  status: "not_done" | "done";
  photo_url?: string | null;
  completed_at?: string | null;
};
type ReportAcceptResponse = {
  ok?: boolean;
  reportId?: string;
  acceptedBy?: string;
  status?: string;
  createdTasks?: number;
  error?: string;
};
type ProfileRouteResponse = {
  profile: ReportProfilePayload & {
    source?: "greenspot" | "legacy";
  };
  namePolicy?: {
    cooldownDays?: number;
    canChangeNow?: boolean;
    lastChangedAt?: string | null;
    nextAvailableAt?: string | null;
  };
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read file as data URL."));
    };
    reader.onerror = () => reject(new Error("Failed to read file as data URL."));
    reader.readAsDataURL(file);
  });

const particleField = Array.from({ length: 36 }, (_, index) => ({
  left: `${(index * 17 + 9) % 100}%`,
  top: `${(index * 29 + 13) % 100}%`,
  size: (index % 3) + 2,
  duration: 8 + (index % 5) * 2,
  delay: (index % 7) * 0.5,
}));

const isStorageBucketMissing = (message: string | null | undefined) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("bucket") && normalized.includes("not found");
};

export default function ReportedGreenPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const { profile, refreshProfile } = useGreenspotProfile(user);
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const aiImageInputRef = useRef<HTMLInputElement | null>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const expertMenuRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobPreviewUrlRef = useRef<string | null>(null);
  const profileAvatarObjectUrlRef = useRef<string | null>(null);
  const aiBlobUrlsRef = useRef<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ReportProfilePayload | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiPendingImage, setAiPendingImage] = useState<string | null>(null);
  const [aiPendingImageName, setAiPendingImageName] = useState<string | null>(null);
  const [aiPendingImageData, setAiPendingImageData] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: "ai-welcome",
      role: "assistant",
      text: "I am your GreenDuty botany assistant powered by the backend AI service. Ask me about trees, plants, flowers, agronomy, and seeds, or upload an area photo for a garden concept.",
    },
  ]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [reportFormError, setReportFormError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategorySelection>(null);
  const [expert, setExpert] = useState("planting-team");
  const [expertMenuOpen, setExpertMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileBioDraft, setProfileBioDraft] = useState("");
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);
  const [reminderTab, setReminderTab] = useState<"opportunities" | "active" | "completed">(
    "opportunities"
  );
  const [reminderTasks, setReminderTasks] = useState<CareReminderTask[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [remindersNotice, setRemindersNotice] = useState<string | null>(null);
  const [dueReminderCount, setDueReminderCount] = useState(0);
  const [confirmingReportId, setConfirmingReportId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const activeTheme = mounted ? theme ?? "green" : "green";
  const isLight = activeTheme === "light";
  const isGreen = activeTheme === "green";
  const mapTheme = activeTheme === "light" ? "light" : "dark";
  const glowOverlay =
    isLight
      ? "radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.1),transparent_40%),radial-gradient(circle_at_84%_74%,rgba(56,189,248,0.08),transparent_38%)"
      : isGreen
        ? "radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.2),transparent_38%),radial-gradient(circle_at_84%_74%,rgba(34,197,94,0.16),transparent_36%)"
        : "radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.14),transparent_38%),radial-gradient(circle_at_84%_74%,rgba(56,189,248,0.12),transparent_36%)";
  const shadeOverlay =
    isLight
      ? "linear-gradient(180deg,rgba(241,248,244,0.18),rgba(241,248,244,0.06),rgba(241,248,244,0.24))"
      : isGreen
        ? "linear-gradient(180deg,rgba(3,26,20,0.22),rgba(3,26,20,0.08),rgba(2,14,10,0.42))"
        : "linear-gradient(180deg,rgba(2,16,22,0.28),rgba(2,16,22,0.14),rgba(1,8,12,0.44))";
  const pageThemeClass = isLight
    ? "bg-[#eaf3ef] text-slate-900"
    : isGreen
      ? "bg-[#06211a] text-emerald-50"
      : "bg-[#02080b] text-white";
  const glassPanelClass = isLight
    ? "border border-slate-900/10 bg-white/68 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
    : isGreen
      ? "border border-emerald-200/14 bg-emerald-950/42 shadow-[0_16px_34px_rgba(0,0,0,0.34)]"
      : "border border-white/10 bg-slate-900/52 shadow-[0_16px_34px_rgba(0,0,0,0.36)]";
  const navShellClass = "bg-transparent";
  const leftNavShellClass = isLight
    ? "border-slate-900/16 bg-white/88 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
    : "border-white/18 bg-[#111416]/86 shadow-[0_18px_38px_rgba(0,0,0,0.46)]";
  const leftNavItemClass = isLight
    ? "text-slate-700 hover:bg-slate-900/8 hover:text-slate-900"
    : "text-white hover:bg-white/14 hover:text-white";
  const leftNavItemActiveClass = isLight
    ? "bg-slate-900 text-slate-50 shadow-[0_8px_18px_rgba(15,23,42,0.24)]"
    : "border border-white/24 bg-white/18 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)]";
  const leftNavIconClass = isLight
    ? "bg-slate-900/8 text-slate-700 group-hover:bg-emerald-500/16 group-hover:text-emerald-800"
    : "bg-black/30 text-white group-hover:bg-white/18 group-hover:text-white";
  const leftNavIconActiveClass = isLight
    ? "bg-white/16 text-slate-50"
    : "bg-white/22 text-white";
  const iconWrapClass = isLight
    ? "border border-slate-900/10 bg-white/84"
    : "border border-white/12 bg-white/[0.12]";
  const primaryTextClass = isLight ? "text-slate-900" : "text-white";
  const secondaryTextClass = isLight ? "text-slate-700" : "text-white/80";
  const tertiaryTextClass = isLight ? "text-slate-500" : "text-white/60";
  const searchShellClass = isLight
    ? "border border-slate-900/12 bg-white/78 shadow-[0_10px_24px_rgba(15,23,42,0.12)] focus-within:border-emerald-500/35 focus-within:ring-2 focus-within:ring-emerald-500/20"
    : "border border-white/14 bg-black/30 shadow-[0_12px_28px_rgba(0,0,0,0.32)] focus-within:border-emerald-300/35 focus-within:ring-2 focus-within:ring-emerald-300/20";
  const profileChipClass = isLight
    ? "border-slate-900/12 bg-white/76 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
    : "border-white/14 bg-black/30 shadow-[0_12px_28px_rgba(0,0,0,0.34)]";
  const inputClass = isLight
    ? "bg-slate-900/10 text-slate-900 placeholder:text-slate-500"
    : "bg-white/10 text-white placeholder:text-white/40";
  const mediaButtonClass = isLight
    ? "bg-slate-900/10 text-slate-700 hover:bg-slate-900/14"
    : "bg-white/10 text-white/85 hover:bg-white/15";
  const reportPanelShellClass = isLight
    ? "bg-white/94 shadow-[0_22px_50px_rgba(15,23,42,0.18)]"
    : isGreen
      ? "bg-emerald-950/88 shadow-[0_26px_60px_rgba(0,0,0,0.58)]"
      : "bg-slate-950/88 shadow-[0_26px_60px_rgba(0,0,0,0.58)]";
  const reportPanelSectionClass = isLight
    ? "border border-slate-900/10 bg-slate-900/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
    : "border border-white/10 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  const expertFieldCardClass = isLight
    ? "border border-slate-900/12 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
    : "border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  const expertMenuClass = isLight
    ? "border-slate-900/12 bg-white/92 shadow-[0_16px_35px_rgba(15,23,42,0.14)]"
    : isGreen
      ? "border-emerald-200/15 bg-emerald-950/92 shadow-[0_16px_35px_rgba(0,0,0,0.45)]"
      : "border-white/15 bg-slate-900/94 shadow-[0_16px_35px_rgba(0,0,0,0.45)]";
  const dashboardCardClass = isLight
    ? "bg-white/80 shadow-[0_20px_45px_rgba(15,23,42,0.16)]"
    : isGreen
      ? "bg-emerald-950/58 shadow-[0_26px_56px_rgba(0,0,0,0.5)]"
      : "bg-slate-900/60 shadow-[0_26px_56px_rgba(0,0,0,0.5)]";
  const dashboardSubcardClass = isLight ? "bg-slate-900/10" : "bg-white/10";
  const badgeClass = isLight ? "bg-emerald-500/16 text-emerald-800" : "bg-emerald-500/20 text-emerald-100";
  const currentUser =
    profileData?.name ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Guest Reporter";
  const storedProfileBio = profileData?.bio ?? profile?.bio ?? "";
  const currentUserBio =
    storedProfileBio ||
    (profile?.verification_status === "approved"
      ? "Verified GreenSpot member. Your reports help map high-priority environmental incidents."
      : "Community member reporting and tracking green interventions in real time.");
  const avatarDisplayUrl = profileData?.avatarUrl || profile?.avatar_url || null;
  const nameCooldownDays = profileData?.nameCooldownDays ?? 14;
  const rawNameChangeAvailableAt = profileData?.nextNameChangeAt
    ? new Date(profileData.nextNameChangeAt)
    : null;
  const nameChangeAvailableAt =
    rawNameChangeAvailableAt &&
    !Number.isNaN(rawNameChangeAvailableAt.getTime())
      ? rawNameChangeAvailableAt
      : null;
  const canChangeName =
    profileData?.canChangeName ??
    (!nameChangeAvailableAt ||
      nameChangeAvailableAt.getTime() <= Date.now());
  const showAuthPrompt = !authLoading && !user;
  const profileCardClass = isLight
    ? "bg-white/82 shadow-[0_22px_50px_rgba(15,23,42,0.16)]"
    : isGreen
      ? "bg-emerald-950/62 shadow-[0_26px_56px_rgba(0,0,0,0.52)]"
      : "bg-slate-900/66 shadow-[0_26px_56px_rgba(0,0,0,0.52)]";
  const aiChatShellClass = isLight
    ? "bg-white/92 shadow-[0_20px_46px_rgba(15,23,42,0.18)]"
    : isGreen
      ? "bg-emerald-950/90 shadow-[0_24px_58px_rgba(0,0,0,0.52)]"
      : "bg-slate-950/90 shadow-[0_24px_58px_rgba(0,0,0,0.52)]";
  const aiAssistantBubbleClass = isLight
    ? "bg-slate-900/[0.06] text-slate-800"
    : "bg-white/10 text-white/90";
  const aiUserBubbleClass = isLight
    ? "bg-emerald-500/20 text-emerald-900"
    : "bg-emerald-500/22 text-emerald-50";

  const leaderboard = useMemo(() => {
    const grouped = new Map<
      string,
      { name: string; reports: number; verified: number; areas: Set<string> }
    >();

    reports.forEach((report) => {
      const name = report.user_name ?? "Community Member";
      const existing = grouped.get(name) ?? {
        name,
        reports: 0,
        verified: 0,
        areas: new Set<string>(),
      };
      existing.reports += 1;
      existing.verified += report.verified_count ?? 0;
      existing.areas.add(report.area);
      grouped.set(name, existing);
    });

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        areaCount: entry.areas.size,
      }))
      .sort((a, b) => b.reports - a.reports || b.verified - a.verified);
  }, [reports]);

  const winner = leaderboard[0];
  const totalVerified = reports.reduce(
    (sum, report) => sum + (report.verified_count ?? 0),
    0
  );
  const areaStats = useMemo(() => {
    const grouped = new Map<string, { area: string; count: number }>();
    reports.forEach((report) => {
      const existing = grouped.get(report.area) ?? { area: report.area, count: 0 };
      existing.count += 1;
      grouped.set(report.area, existing);
    });
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }, [reports]);
  const maxAreaCount = areaStats[0]?.count ?? 1;
  const myReports = useMemo(
    () => reports.filter((report) => report.user_id === user?.id),
    [reports, user?.id]
  );
  const recentMyReports = useMemo(() => [...myReports].slice(-3).reverse(), [myReports]);
  const profileInitials = useMemo(() => {
    const parts = currentUser.split(" ").filter(Boolean);
    if (parts.length === 0) return "GD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [currentUser]);
  const baseProfileName = profileData?.name?.trim() || currentUser.trim();
  const baseProfileBio = storedProfileBio.trim();
  const normalizedProfileNameDraft = profileNameDraft.trim().replace(/\s+/g, " ");
  const normalizedProfileBioDraft = profileBioDraft.trim();
  const nameDraftChanged = normalizedProfileNameDraft !== baseProfileName;
  const bioDraftChanged = normalizedProfileBioDraft !== baseProfileBio;
  const profileHasChanges =
    nameDraftChanged || bioDraftChanged || Boolean(profileAvatarFile);
  const profileNameChangeBlocked = nameDraftChanged && !canChangeName;
  const profileSaveDisabled =
    profileSaving ||
    !profileHasChanges ||
    normalizedProfileNameDraft.length < 2 ||
    profileNameChangeBlocked;
  const reportSteps = useMemo(
    () => [
      { key: "category", done: Boolean(selectedCategory) },
      { key: "title", done: reportTitle.trim().length > 0 },
      { key: "description", done: reportDescription.trim().length > 0 },
      { key: "photo", done: Boolean(photoPreview) },
    ],
    [selectedCategory, reportTitle, reportDescription, photoPreview]
  );
  const completedReportSteps = reportSteps.filter((step) => step.done).length;
  const reportProgress = Math.round((completedReportSteps / reportSteps.length) * 100);
  const canSubmitReport =
    Boolean(user) &&
    Boolean(selectedCategory) &&
    reportTitle.trim().length > 0 &&
    reportDescription.trim().length > 0 &&
    Boolean(photoPreview) &&
    !reportSubmitting;
  const selectedExpertLabel =
    expertOptions.find((option) => option.value === expert)?.label ?? "Choose Expert";
  const quickReportActions = [
    {
      key: "quick-watering",
      label: "Needs Watering",
      category: "watering" as CategoryKey,
      expert: "irrigation-team",
      title: "Watering needed for dry planting area",
      description:
        "The soil is dry and this area needs scheduled watering to support flowers and young trees.",
    },
    {
      key: "quick-planting",
      label: "Needs Planting",
      category: "planting" as CategoryKey,
      expert: "planting-team",
      title: "Planting needed for empty green zone",
      description:
        "This location is suitable for planting and should receive new flowers and native plants.",
    },
    {
      key: "quick-trees",
      label: "Needs Tree Planting",
      category: "tree-planting" as CategoryKey,
      expert: "arborist-team",
      title: "Tree planting needed for shade and restoration",
      description:
        "This spot lacks canopy and should be prioritized for native tree planting and long-term care.",
    },
    {
      key: "quick-flowers",
      label: "Needs Flower Planting",
      category: "flower-planting" as CategoryKey,
      expert: "floral-team",
      title: "Flower planting needed to restore biodiversity",
      description:
        "This area needs pollinator-friendly flowers and light irrigation to restore color and biodiversity.",
    },
  ];
  const normalizedCurrentUser = currentUser.trim().toLowerCase();
  const acceptedByPrefix = "accepted by ";
  const isReportAccepted = useCallback(
    (status: string | null | undefined) =>
      (status ?? "").trim().toLowerCase().startsWith(acceptedByPrefix),
    []
  );
  const opportunities = useMemo(
    () =>
      reports.filter((report) => {
        const normalized = report.status.trim().toLowerCase();
        if (report.user_id === user?.id) return false;
        if (normalized === "verified" || normalized === "rejected") return false;
        return !isReportAccepted(normalized);
      }),
    [isReportAccepted, reports, user?.id]
  );
  const myAcceptedReports = useMemo(
    () =>
      reports.filter((report) => {
        const normalized = report.status.trim().toLowerCase();
        return (
          normalized.startsWith(acceptedByPrefix) &&
          normalized.includes(normalizedCurrentUser)
        );
      }),
    [normalizedCurrentUser, reports]
  );
  const activeReminderTasks = useMemo(
    () =>
      reminderTasks
        .filter((task) => task.status !== "done")
        .sort((left, right) => new Date(left.due_at).getTime() - new Date(right.due_at).getTime()),
    [reminderTasks]
  );
  const completedReminderTasks = useMemo(
    () =>
      reminderTasks
        .filter((task) => task.status === "done")
        .sort(
          (left, right) =>
            new Date(right.completed_at ?? right.due_at).getTime() -
            new Date(left.completed_at ?? left.due_at).getTime()
        ),
    [reminderTasks]
  );
  const activeSidebarKey = dashboardOpen
    ? "dashboard"
    : remindersOpen
      ? "reminders"
    : profileOpen
      ? "profile"
      : "home";
  const authTarget = "/greenspot/reported-green";
  const authRedirectTarget = `/greenspot/login?redirect=${encodeURIComponent(authTarget)}`;
  const registerRedirectTarget = `/greenspot/register?redirect=${encodeURIComponent(authTarget)}`;
  const openAuth = useCallback(() => {
    router.push(authRedirectTarget);
  }, [authRedirectTarget, router]);

  const handleLogout = useCallback(async () => {
    if (!user || !supabase || loggingOut) {
      if (!user) openAuth();
      return;
    }

    setLoggingOut(true);
    setReportsError(null);
    setPanelOpen(false);
    setDashboardOpen(false);
    setRemindersOpen(false);
    setProfileOpen(false);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message || "Unable to log out right now.");
      }
      router.replace("/greenspot/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to log out right now.";
      setReportsError(message);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, openAuth, router, supabase, user]);

  const loadEditableProfile = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/greenspot/profile", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (ProfileRouteResponse & { error?: string })
        | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.error ?? "Unable to load profile details.");
      }

      setProfileData(payload.profile);
      setProfileNameDraft(payload.profile.name ?? "");
      setProfileBioDraft(payload.profile.bio ?? "");
      setProfileAvatarPreview(payload.profile.avatarUrl ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load profile details.";
      setProfileSaveError(message);
    }
  }, [user]);

  const handleProfileAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileSaveError("Avatar must be an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setProfileSaveError("Avatar image is too large. Keep it under 6MB.");
      event.target.value = "";
      return;
    }

    if (profileAvatarObjectUrlRef.current) {
      URL.revokeObjectURL(profileAvatarObjectUrlRef.current);
      profileAvatarObjectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    profileAvatarObjectUrlRef.current = objectUrl;

    setProfileSaveError(null);
    setProfileSaveSuccess(null);
    setProfileAvatarFile(file);
    setProfileAvatarPreview(objectUrl);
  };

  const saveProfileChanges = async () => {
    if (!user) {
      setProfileOpen(false);
      openAuth();
      return;
    }

    const trimmedName = profileNameDraft.trim().replace(/\s+/g, " ");
    const trimmedBio = profileBioDraft.trim();

    if (trimmedName.length < 2) {
      setProfileSaveError("Display name must be at least 2 characters.");
      return;
    }

    setProfileSaveError(null);
    setProfileSaveSuccess(null);
    setProfileSaving(true);

    try {
      let uploadedAvatarUrl: string | null | undefined = undefined;

      if (profileAvatarFile) {
        const safeName = profileAvatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploadPath = `${user.id}/profile/avatar-${Date.now()}-${safeName}`;
        const { error: uploadError } = await greenspotClient.storage
          .from("greenspot-uploads")
          .upload(uploadPath, profileAvatarFile, { upsert: true });

        if (uploadError) {
          if (isStorageBucketMissing(uploadError.message)) {
            throw new Error(
              "Avatar upload bucket is missing. Create `greenspot-uploads` in Supabase Storage."
            );
          }
          throw new Error(uploadError.message || "Failed to upload avatar image.");
        }

        const { data: avatarData } = greenspotClient.storage
          .from("greenspot-uploads")
          .getPublicUrl(uploadPath);
        uploadedAvatarUrl = avatarData?.publicUrl ?? null;
      }

      const response = await fetch("/api/greenspot/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          bio: trimmedBio.length > 0 ? trimmedBio : null,
          ...(uploadedAvatarUrl !== undefined ? { avatarUrl: uploadedAvatarUrl } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (ProfileRouteResponse & { error?: string })
        | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.error ?? "Failed to update profile.");
      }

      const updatedProfile = payload.profile;

      setProfileData(updatedProfile);
      setProfileNameDraft(updatedProfile.name ?? "");
      setProfileBioDraft(updatedProfile.bio ?? "");
      setProfileAvatarPreview(updatedProfile.avatarUrl ?? null);
      setProfileAvatarFile(null);
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = "";
      }

      setReports((previous) =>
        previous.map((report) =>
          report.user_id === user.id
            ? {
                ...report,
                user_name: updatedProfile.name || report.user_name,
                user_avatar: updatedProfile.avatarUrl ?? report.user_avatar ?? null,
              }
            : report
        )
      );

      await refreshProfile();
      setProfileSaveSuccess("Profile updated successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile.";
      setProfileSaveError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const removeMyReport = async (reportId: string) => {
    if (!user) {
      openAuth();
      return;
    }
    setReportsError(null);
    setDeletingReportId(reportId);
    try {
      const response = await fetch(`/api/greenspot/reports/${encodeURIComponent(reportId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to remove report.");
      }
      setReports((previous) => previous.filter((report) => report.id !== reportId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove report.";
      setReportsError(message);
    } finally {
      setDeletingReportId(null);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const clearPhoto = () => {
    if (blobPreviewUrlRef.current) {
      URL.revokeObjectURL(blobPreviewUrlRef.current);
      blobPreviewUrlRef.current = null;
    }
    setPhotoPreview(null);
    setPhotoName(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setReportFormError(null);
  };

  const startCamera = async () => {
    setCameraError(null);
    setReportFormError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this device.");
      return;
    }
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("Camera permission was blocked. Please allow access.");
      setCameraOpen(false);
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    if (blobPreviewUrlRef.current) {
      URL.revokeObjectURL(blobPreviewUrlRef.current);
      blobPreviewUrlRef.current = null;
    }
    setPhotoPreview(imageDataUrl);
    const captureName = `capture-${Date.now()}.jpg`;
    setPhotoName(captureName);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoFile(new File([blob], captureName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
    stopCameraStream();
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    if (blobPreviewUrlRef.current) {
      URL.revokeObjectURL(blobPreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    blobPreviewUrlRef.current = objectUrl;
    setPhotoPreview(objectUrl);
    setPhotoName(file.name);
    setPhotoFile(file);
    setCameraError(null);
    setReportFormError(null);
  };

  const clearAiPendingImage = () => {
    if (aiPendingImage?.startsWith("blob:")) {
      URL.revokeObjectURL(aiPendingImage);
      aiBlobUrlsRef.current = aiBlobUrlsRef.current.filter((url) => url !== aiPendingImage);
    }
    setAiPendingImage(null);
    setAiPendingImageName(null);
    setAiPendingImageData(null);
    if (aiImageInputRef.current) {
      aiImageInputRef.current.value = "";
    }
  };

  const handleAiImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (aiPendingImage?.startsWith("blob:")) {
        URL.revokeObjectURL(aiPendingImage);
        aiBlobUrlsRef.current = aiBlobUrlsRef.current.filter((url) => url !== aiPendingImage);
      }
      const [imageDataUrl] = await Promise.all([fileToDataUrl(file)]);
      const objectUrl = URL.createObjectURL(file);
      aiBlobUrlsRef.current.push(objectUrl);
      setAiPendingImage(objectUrl);
      setAiPendingImageData(imageDataUrl);
      setAiPendingImageName(file.name);
    } catch {
      clearAiPendingImage();
      setAiMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: "I could not read that image. Please upload another file.",
        },
      ]);
    }
  };

  const sendAiMessage = async () => {
    if (aiThinking) return;
    const text = aiInput.trim();
    const imageUrl = aiPendingImage;
    const imageDataUrl = aiPendingImageData;
    if (!text && !imageUrl) return;
    const userText = text || "Please scan this area image and propose a garden design.";
    const history = aiMessages
      .filter((message) => message.text.trim().length > 0)
      .slice(-8)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));

    const userMessage: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      imageUrl: imageUrl ?? undefined,
    };

    setAiMessages((previous) => [...previous, userMessage]);
    setAiInput("");
    clearAiPendingImage();
    setAiThinking(true);

    try {
      const response = await fetch("/api/greenspot/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userText,
          imageDataUrl: imageDataUrl ?? undefined,
          history,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (Partial<AiBackendResponse> & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "AI service request failed.");
      }

      const normalized: AiBackendResponse = {
        inScope: payload?.inScope !== false,
        reply:
          typeof payload?.reply === "string" && payload.reply.trim().length > 0
            ? payload.reply.trim()
            : "I can help with plant and agronomy questions.",
        summary: typeof payload?.summary === "string" ? payload.summary.trim() : "",
        suggestedPlants: Array.isArray(payload?.suggestedPlants)
          ? payload.suggestedPlants
              .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              .slice(0, 8)
          : [],
        designImageUrl:
          typeof payload?.designImageUrl === "string" && payload.designImageUrl.length > 0
            ? payload.designImageUrl
            : null,
      };

      const assistantMessage: AiMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: normalized.reply,
      };

      if (imageUrl && normalized.inScope) {
        assistantMessage.gardenPlan = {
          beforeImageUrl: imageUrl,
          designImageUrl: normalized.designImageUrl ?? imageUrl,
          suggestedPlants: normalized.suggestedPlants,
          summary:
            normalized.summary ||
            "Planting concept generated from your uploaded area image.",
        };
      }

      setAiMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI backend is unavailable right now. Please try again.";
      setAiMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: `AI backend error: ${message}`,
        },
      ]);
    } finally {
      setAiThinking(false);
    }
  };

  const loadReports = useCallback(async () => {
    if (!user) {
      setReports([]);
      setProfileData(null);
      return;
    }
    setReportsLoading(true);
    setReportsError(null);
    try {
      const response = await fetch("/api/greenspot/reports?public=1", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<ReportApiResponse> & { error?: string })
        | null;

      if (response.status === 401) {
        openAuth();
        return;
      }
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to load GreenSpot reports.");
      }

      setReports(Array.isArray(payload?.reports) ? payload.reports : []);
      setProfileData(payload?.me ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load GreenSpot reports.";
      setReportsError(message);
    } finally {
      setReportsLoading(false);
    }
  }, [openAuth, user]);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setProfileData(null);
      return;
    }
    void loadReports();
  }, [loadReports, user]);

  const loadReminders = useCallback(async () => {
    if (!user) {
      setReminderTasks([]);
      setDueReminderCount(0);
      return;
    }

    setRemindersLoading(true);
    setRemindersError(null);
    try {
      const [tasksResponse, dueResponse] = await Promise.all([
        fetch("/api/greenspot/care", { cache: "no-store" }),
        fetch("/api/greenspot/care/due", { cache: "no-store" }),
      ]);

      const tasksPayload = (await tasksResponse.json().catch(() => null)) as
        | { tasks?: CareReminderTask[]; error?: string }
        | null;
      const duePayload = (await dueResponse.json().catch(() => null)) as
        | { tasks?: CareReminderTask[]; error?: string }
        | null;

      if (tasksResponse.status === 401 || dueResponse.status === 401) {
        openAuth();
        return;
      }
      if (!tasksResponse.ok) {
        throw new Error(tasksPayload?.error ?? "Unable to load reminder tasks.");
      }
      if (!dueResponse.ok) {
        throw new Error(duePayload?.error ?? "Unable to load due reminders.");
      }

      setReminderTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []);
      setDueReminderCount(
        Array.isArray(duePayload?.tasks) ? duePayload.tasks.length : 0
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load reminder tasks.";
      setRemindersError(message);
    } finally {
      setRemindersLoading(false);
    }
  }, [openAuth, user]);

  useEffect(() => {
    if (!user) {
      setReminderTasks([]);
      setDueReminderCount(0);
      return;
    }
    void loadReminders();
  }, [loadReminders, user]);

  const confirmReportForPlanting = useCallback(
    async (report: ReportItem) => {
      if (!user) {
        openAuth();
        return;
      }

      setRemindersError(null);
      setRemindersNotice(null);
      setConfirmingReportId(report.id);

      try {
        const response = await fetch(
          `/api/greenspot/reports/${encodeURIComponent(report.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "accept" }),
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | ReportAcceptResponse
          | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to accept this report.");
        }

        const acceptedStatus = payload?.status ?? `Accepted by ${currentUser}`;
        const normalizedAcceptedStatus = acceptedStatus.trim().toLowerCase();

        setReports((previous) =>
          previous.map((item) => {
            if (item.id !== report.id) return item;
            const normalizedCurrentStatus = item.status.trim().toLowerCase();
            const shouldIncrementVerification =
              normalizedCurrentStatus !== normalizedAcceptedStatus;
            return {
              ...item,
              status: acceptedStatus,
              verified_count: shouldIncrementVerification
                ? (item.verified_count ?? 0) + 1
                : item.verified_count,
            };
          })
        );

        await loadReminders();
        setReminderTab("active");
        setDashboardOpen(false);
        setProfileOpen(false);
        setPanelOpen(false);
        setRemindersOpen(true);
        setRemindersNotice(
          payload?.createdTasks && payload.createdTasks > 0
            ? `Accepted by ${payload.acceptedBy ?? currentUser}. ${payload.createdTasks} reminder tasks were created.`
            : `Accepted by ${payload?.acceptedBy ?? currentUser}.`
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to accept this report.";
        setRemindersError(message);
      } finally {
        setConfirmingReportId(null);
      }
    },
    [currentUser, loadReminders, openAuth, user]
  );

  const handleMapConfirmReport = useCallback(
    (reportId: string) => {
      const report = reports.find((item) => item.id === reportId);
      if (!report) return;
      void confirmReportForPlanting(report);
    },
    [confirmReportForPlanting, reports]
  );

  const canConfirmReportFromMap = useCallback(
    (report: { user_id?: string | null; status?: string | null }) => {
      if (!user) return false;
      if (report.user_id === user.id) return false;
      const normalizedStatus = (report.status ?? "").trim().toLowerCase();
      if (normalizedStatus === "verified" || normalizedStatus === "rejected") {
        return false;
      }
      return !isReportAccepted(normalizedStatus);
    },
    [isReportAccepted, user]
  );

  const completeReminderTask = useCallback(
    async (task: CareReminderTask, file: File) => {
      if (!user) {
        openAuth();
        return;
      }
      if (!file.type.startsWith("image/")) {
        setRemindersError("Proof must be an image file.");
        return;
      }

      setRemindersError(null);
      setRemindersNotice(null);
      setCompletingTaskId(task.id);

      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploadPath = `${user.id}/reminder-proof/${task.id}-${Date.now()}-${safeName}`;
        const { error: uploadError } = await greenspotClient.storage
          .from("greenspot-care")
          .upload(uploadPath, file, { upsert: true });

        if (uploadError) {
          if (isStorageBucketMissing(uploadError.message)) {
            throw new Error(
              "Proof upload bucket is missing. Create `greenspot-care` in Supabase Storage."
            );
          }
          throw new Error(uploadError.message || "Failed to upload proof image.");
        }

        const { data: photoData } = greenspotClient.storage
          .from("greenspot-care")
          .getPublicUrl(uploadPath);
        const photoUrl = photoData?.publicUrl ?? null;
        if (!photoUrl) {
          throw new Error("Unable to create a public proof URL.");
        }

        const response = await fetch(
          `/api/greenspot/care/${encodeURIComponent(task.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "done",
              photoUrl,
            }),
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error ?? "Unable to complete this reminder task.");
        }

        setReminderTasks((previous) =>
          previous.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: "done",
                  photo_url: photoUrl,
                  completed_at: new Date().toISOString(),
                }
              : item
          )
        );
        await loadReminders();
        setRemindersNotice("Proof submitted. Reminder marked as completed.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to complete this reminder task.";
        setRemindersError(message);
      } finally {
        setCompletingTaskId(null);
      }
    },
    [loadReminders, openAuth, user]
  );

  const requestCurrentLocation = () => {
    setLocationError(null);
    setReportFormError(null);
    setReportSuccess(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location services are not supported on this device.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
        setLocationError(null);
        setLocationLoading(false);
      },
      (error) => {
        if (error.code === 1) {
          setLocationError("Location permission denied. Enable it to mark your report.");
        } else if (error.code === 2) {
          setLocationError("Location unavailable right now. Try again in a moment.");
        } else {
          setLocationError("Location request timed out. Please retry.");
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  const submitReportWithLocation = async () => {
    setReportFormError(null);
    setReportSuccess(null);

    if (!user) {
      openAuth();
      return;
    }
    if (!selectedCategory) {
      setReportFormError("Choose a planting need category to continue.");
      return;
    }
    if (reportTitle.trim().length === 0) {
      setReportFormError("Add a title to continue.");
      return;
    }
    if (reportDescription.trim().length === 0) {
      setReportFormError("Add a description to continue.");
      return;
    }
    if (!photoPreview) {
      setReportFormError("Add evidence photo to complete the report steps.");
      return;
    }
    if (!photoFile) {
      setReportFormError("Photo is still processing. Please wait and submit again.");
      return;
    }

    if (!userLocation) {
      requestCurrentLocation();
      setLocationError("Capturing your location. Please allow access and submit again.");
      return;
    }

    const categoryLabel =
      reportCategories.find((category) => category.key === selectedCategory)?.label ??
      "General";
    const cleanTitle = reportTitle.trim();
    const cleanDescription = reportDescription.trim();
    setReportSubmitting(true);

    try {
      let imageUrl: string | null = null;
      let uploadNotice: string | null = null;
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const uploadPath = `${user.id}/reported-green/${Date.now()}-${safeName}`;
      const { error: uploadError } = await greenspotClient.storage
        .from("greenspot-uploads")
        .upload(uploadPath, photoFile, { upsert: false });

      if (uploadError) {
        if (isStorageBucketMissing(uploadError.message)) {
          uploadNotice =
            "Report submitted without photo: create bucket `greenspot-uploads` in Supabase Storage to enable uploads.";
        } else {
          throw new Error(uploadError.message || "Failed to upload report photo.");
        }
      } else {
        const { data: imageData } = greenspotClient.storage
          .from("greenspot-uploads")
          .getPublicUrl(uploadPath);
        imageUrl = imageData?.publicUrl ?? null;
      }

      const response = await fetch("/api/greenspot/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
          category: categoryLabel,
          expert: selectedExpertLabel,
          lat: userLocation.lat,
          lng: userLocation.lng,
          imageUrl,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { report?: ReportItem; error?: string }
        | null;
      if (!response.ok || !payload?.report) {
        throw new Error(payload?.error ?? "Failed to submit report.");
      }

      setReports((previous) => [payload.report!, ...previous]);
      setReportSuccess(
        uploadNotice ??
          "Marked successfully. This location is now flagged for trees and flowers."
      );
      setReportTitle("");
      setReportDescription("");
      setSelectedCategory(null);
      clearPhoto();
      setCameraError(null);
      setLocationError(null);
      setUserLocation(null);
      stopCameraStream();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit report.";
      setReportFormError(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || user) return;
    setPanelOpen(false);
    setDashboardOpen(false);
    setRemindersOpen(false);
    setProfileOpen(false);
  }, [authLoading, user]);

  useEffect(() => {
    if (!profileOpen) return;

    if (!user) {
      setProfileOpen(false);
      openAuth();
      return;
    }

    setProfileSaveError(null);
    setProfileSaveSuccess(null);
    setProfileNameDraft(profileData?.name ?? currentUser);
    setProfileBioDraft(profileData?.bio ?? profile?.bio ?? "");
    setProfileAvatarPreview(profileData?.avatarUrl ?? avatarDisplayUrl);
    setProfileAvatarFile(null);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = "";
    }

    void loadEditableProfile();
  }, [profileOpen, user?.id]);

  useEffect(() => {
    if (profileOpen) return;
    if (profileAvatarObjectUrlRef.current) {
      URL.revokeObjectURL(profileAvatarObjectUrlRef.current);
      profileAvatarObjectUrlRef.current = null;
    }
    setProfileAvatarFile(null);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = "";
    }
  }, [profileOpen]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {});
  }, [cameraOpen]);

  useEffect(() => {
    if (panelOpen) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setExpertMenuOpen(false);
  }, [panelOpen]);

  useEffect(() => {
    if (!expertMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!expertMenuRef.current) return;
      if (expertMenuRef.current.contains(event.target as Node)) return;
      setExpertMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [expertMenuOpen]);

  useEffect(() => {
    if (!aiMessagesEndRef.current) return;
    aiMessagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [aiMessages, aiThinking, aiChatOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (blobPreviewUrlRef.current) {
        URL.revokeObjectURL(blobPreviewUrlRef.current);
        blobPreviewUrlRef.current = null;
      }
      if (profileAvatarObjectUrlRef.current) {
        URL.revokeObjectURL(profileAvatarObjectUrlRef.current);
        profileAvatarObjectUrlRef.current = null;
      }
      if (aiBlobUrlsRef.current.length > 0) {
        aiBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        aiBlobUrlsRef.current = [];
      }
    };
  }, []);

  return (
    <main className={`reported-green-page relative h-screen w-full overflow-hidden ${pageThemeClass}`}>
      <div className="absolute inset-0">
        <MapComponent
          reports={reports}
          mapTheme={mapTheme}
          onToggleTheme={() => {}}
          onConfirmReport={handleMapConfirmReport}
          canConfirmReport={canConfirmReportFromMap}
          confirmingReportId={confirmingReportId}
          confirmButtonLabel="Confirm"
          heatmapEnabled={false}
          showControls={false}
          tileMode={mapTheme === "dark" ? "standard" : "leaf"}
          viewportMode="global"
          mapId="greenspot-future-map"
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: glowOverlay }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: shadeOverlay }} />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particleField.map((particle, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full bg-emerald-300/70 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
            }}
            animate={{
              y: [0, -35, 0],
              opacity: [0.12, 0.8, 0.12],
              scale: [0.8, 1.15, 0.8],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none relative z-20 h-full w-full">
        <div
          className={`pointer-events-none absolute inset-0 ${
            isLight
              ? "bg-gradient-to-br from-emerald-500/12 via-transparent to-cyan-400/10"
              : "bg-gradient-to-br from-emerald-500/8 via-transparent to-cyan-400/10"
          }`}
        />

        {showAuthPrompt ? (
          <div className="pointer-events-auto absolute left-1/2 top-20 z-40 w-[min(92vw,560px)] -translate-x-1/2 rounded-3xl border border-white/16 bg-black/40 px-4 py-3 backdrop-blur-2xl sm:px-5">
            <p className={`text-sm font-medium ${primaryTextClass}`}>
              Sign in to report incidents and track your personal GreenSpot activity.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={authRedirectTarget}
                className="inline-flex rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Login
              </Link>
              <Link
                href={registerRedirectTarget}
                className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  isLight
                    ? "border-slate-900/16 bg-white/90 text-slate-900 hover:bg-white"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                Register
              </Link>
            </div>
          </div>
        ) : null}

        {reportsError ? (
          <div className="pointer-events-auto absolute left-1/2 top-20 z-40 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-2 text-xs text-rose-100 backdrop-blur-xl">
            {reportsError}
          </div>
        ) : null}

        {reportsLoading && !showAuthPrompt ? (
          <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-full border border-white/16 bg-black/32 px-3 py-1 text-[11px] text-white/80 backdrop-blur-xl">
            Syncing reports...
          </div>
        ) : null}

        <aside
          className={`pointer-events-auto absolute left-4 top-1/2 z-30 hidden w-[92px] -translate-y-1/2 rounded-[24px] border px-2 py-3 backdrop-blur-2xl md:flex md:flex-col ${leftNavShellClass}`}
        >
          <div className="flex flex-col gap-2">
            {sidebarItems.map((item, index) => (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`group flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3 transition duration-200 ${leftNavItemClass} ${
                  activeSidebarKey === item.key ? leftNavItemActiveClass : ""
                }`}
                type="button"
                onClick={() => {
                  if (!user && item.key !== "home") {
                    openAuth();
                    return;
                  }
                  if (item.key === "dashboard") {
                    setDashboardOpen(true);
                    setRemindersOpen(false);
                    setProfileOpen(false);
                    setPanelOpen(false);
                    return;
                  }
                  if (item.key === "reminders") {
                    setRemindersOpen(true);
                    setDashboardOpen(false);
                    setProfileOpen(false);
                    setPanelOpen(false);
                    setReminderTab("opportunities");
                    setRemindersNotice(null);
                    return;
                  }
                  if (item.key === "profile") {
                    setProfileOpen(true);
                    setDashboardOpen(false);
                    setRemindersOpen(false);
                    setPanelOpen(false);
                    return;
                  }
                  setDashboardOpen(false);
                  setRemindersOpen(false);
                  setProfileOpen(false);
                }}
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full transition ${
                    activeSidebarKey === item.key
                      ? leftNavIconActiveClass
                      : leftNavIconClass
                  }`}
                >
                  <item.icon className="h-4 w-4 transition-opacity duration-150" />
                  {item.key === "reminders" && dueReminderCount > 0 ? (
                    <span
                      className={`absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold ${
                        isLight ? "bg-emerald-600 text-white" : "bg-emerald-400 text-emerald-950"
                      }`}
                    >
                      {Math.min(dueReminderCount, 9)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`text-center font-medium leading-tight ${
                    item.key === "dashboard" ? "text-[8.5px]" : "text-[10px]"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            ))}

            <div
              className={`mx-1 mt-0.5 h-px rounded-full ${
                isLight ? "bg-slate-900/12" : "bg-white/14"
              }`}
            />

            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: sidebarItems.length * 0.05 }}
              className={`group flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3 transition duration-200 ${leftNavItemClass}`}
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${leftNavIconClass}`}
              >
                <LogOut className="h-4 w-4 transition-opacity duration-150" />
              </span>
              <span className="text-center text-[10px] font-medium leading-tight">
                {loggingOut ? "Signing out..." : user ? "Logout" : "Login"}
              </span>
            </motion.button>
          </div>
        </aside>

        <div
          className={`pointer-events-auto absolute left-4 right-4 top-4 z-30 flex items-center justify-between gap-3 md:left-[106px] ${navShellClass}`}
        >
          <div
            className={`group flex w-full max-w-2xl items-center gap-3 rounded-full px-5 py-2.5 transition ${searchShellClass}`}
          >
            <Search
              className={`h-4 w-4 transition-colors ${tertiaryTextClass} ${
                isLight
                  ? "group-focus-within:text-emerald-700"
                  : "group-focus-within:text-emerald-200"
              }`}
            />
            <input
              type="text"
              placeholder="Search locations..."
              className={`w-full bg-transparent text-sm outline-none ${primaryTextClass} ${
                isLight ? "placeholder:text-slate-500" : "placeholder:text-white/60"
              }`}
            />
          </div>

          <div
            className={`hidden items-center gap-2.5 rounded-full border px-3.5 py-2 backdrop-blur-2xl md:flex ${profileChipClass}`}
          >
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${iconWrapClass}`}>
              {avatarDisplayUrl ? (
                <img
                  src={avatarDisplayUrl}
                  alt="User avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <UserRound className={`h-4 w-4 ${secondaryTextClass}`} />
              )}
            </div>
            <div>
              <p className={`max-w-[130px] truncate text-[11px] font-semibold tracking-[0.01em] ${primaryTextClass}`}>
                {currentUser}
              </p>
              <p
                className={`inline-flex items-center gap-1.5 text-[11px] ${
                  isLight ? "text-emerald-700/90" : "text-emerald-200"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
                {user ? "Online" : "Guest"}
              </p>
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          aria-label="AI Assistant"
          onClick={() => setAiChatOpen((value) => !value)}
          className={`pointer-events-auto absolute bottom-8 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-2xl sm:right-6 ${
            isLight
              ? "border-slate-900/12 bg-white/82 text-slate-900 shadow-[0_12px_26px_rgba(15,23,42,0.18)]"
              : "border-white/12 bg-black/36 text-white shadow-[0_12px_26px_rgba(0,0,0,0.36)]"
          }`}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.span
            animate={{
              boxShadow: [
                "0 0 0 rgba(52,211,153,0.2)",
                "0 0 18px rgba(52,211,153,0.65)",
                "0 0 0 rgba(52,211,153,0.2)",
              ],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              aiChatOpen
                ? "bg-emerald-500/35"
                : isLight
                  ? "bg-emerald-500/18"
                  : "bg-emerald-500/24"
            }`}
          >
            <Brain className={`h-5 w-5 ${isLight ? "text-emerald-700" : "text-emerald-200"}`} />
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {panelOpen && (
            <motion.aside
              initial={{ opacity: 0, y: 70, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 38, scale: 0.98 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className={`pointer-events-auto absolute inset-0 z-50 flex flex-col overflow-hidden backdrop-blur-2xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:h-[min(86dvh,690px)] sm:w-[min(96vw,980px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px] ${reportPanelShellClass}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-300/20 via-emerald-300/5 to-transparent blur-xl" />

              <div className="relative border-b border-white/10 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[10px] uppercase tracking-[0.24em] ${tertiaryTextClass}`}>
                      Smart Report
                    </p>
                    <h3 className={`mt-1 text-xl font-semibold sm:text-2xl ${primaryTextClass}`}>
                      What does this area need?
                    </h3>
                    <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                      Report planting and care needs with evidence, smart templates, and precise geotagging.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close report panel"
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${mediaButtonClass}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="sm:grid sm:grid-cols-[1.08fr_0.92fr] sm:gap-3">
                  <div className="space-y-3">
                    <div className={`rounded-2xl p-3 ${reportPanelSectionClass}`}>
                  <p className={`text-xs font-medium ${secondaryTextClass}`}>Category</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {reportCategories.map((category) => (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category.key);
                          setReportFormError(null);
                          setReportSuccess(null);
                        }}
                        className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
                          selectedCategory === category.key
                            ? "bg-emerald-500/24 text-emerald-100 shadow-[0_8px_18px_rgba(16,185,129,0.25)]"
                            : isLight
                              ? "bg-slate-900/10 text-slate-700 hover:bg-slate-900/14"
                              : "bg-white/10 text-white/75 hover:bg-white/15"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            selectedCategory === category.key
                              ? "bg-black/10"
                              : isLight
                                ? "bg-slate-900/10"
                                : "bg-white/10"
                          }`}
                        >
                          <category.icon className="h-4 w-4" />
                        </span>
                        <span className="text-[11px] leading-tight">{category.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <p className={`text-[11px] font-medium ${secondaryTextClass}`}>Quick Actions</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {quickReportActions.map((action) => (
                        <button
                          key={action.key}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(action.category);
                            setExpert(action.expert);
                            setReportTitle(action.title);
                            setReportDescription(action.description);
                            setReportFormError(null);
                            setReportSuccess(null);
                          }}
                          className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                            isLight
                              ? "bg-slate-900/10 text-slate-700 hover:bg-slate-900/14"
                              : "bg-white/10 text-white/80 hover:bg-white/16"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                    <div
                      className={`mt-5 border-t pt-3 ${
                        isLight ? "border-slate-900/10" : "border-white/12"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const subject = reportTitle.trim() || "this planting area";
                          setAiInput(`Suggest flowers, trees, and a watering schedule for ${subject}.`);
                          setAiChatOpen(true);
                          setPanelOpen(false);
                        }}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                          isLight
                            ? "bg-emerald-500/14 text-emerald-800 hover:bg-emerald-500/20"
                            : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/28"
                        }`}
                      >
                        <Brain className="h-3.5 w-3.5" />
                        AI Plant Plan
                      </button>
                    </div>
                  </div>
                    </div>

                    <div className={`rounded-2xl p-3 ${reportPanelSectionClass}`}>
                  <div>
                    <label className={`mb-1 block text-sm ${secondaryTextClass}`}>Title</label>
                    <input
                      type="text"
                      placeholder="Example: Dry sidewalk beds need watering"
                      value={reportTitle}
                      onChange={(event) => {
                        setReportTitle(event.target.value);
                        if (reportFormError) setReportFormError(null);
                        if (reportSuccess) setReportSuccess(null);
                      }}
                      className={`h-10 w-full rounded-xl px-3 text-sm outline-none backdrop-blur-xl ${inputClass}`}
                    />
                  </div>
                  <div className="mt-3">
                    <label className={`mb-1 block text-sm ${secondaryTextClass}`}>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe what should be planted or watered and the current condition of the area."
                      value={reportDescription}
                      onChange={(event) => {
                        setReportDescription(event.target.value);
                        if (reportFormError) setReportFormError(null);
                        if (reportSuccess) setReportSuccess(null);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-sm outline-none backdrop-blur-xl ${inputClass}`}
                    />
                  </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3 sm:mt-0">
                    <div className={`rounded-2xl p-3 ${reportPanelSectionClass}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className={`block text-sm ${secondaryTextClass}`}>Evidence Photo</label>
                    {photoName ? (
                      <span className={`max-w-[55%] truncate text-[11px] ${tertiaryTextClass}`}>{photoName}</span>
                    ) : null}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition ${mediaButtonClass}`}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition ${mediaButtonClass}`}
                    >
                      <Camera className="h-4 w-4" />
                      Use Camera
                    </button>
                  </div>

                  {cameraError ? (
                    <p className={`mt-2 text-[11px] ${isLight ? "text-rose-700" : "text-rose-200"}`}>
                      {cameraError}
                    </p>
                  ) : null}

                  {cameraOpen ? (
                    <div className="mt-3">
                      <div className="overflow-hidden rounded-xl bg-black/70">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-36 w-full object-cover sm:h-44"
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={captureFromCamera}
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-3 py-2 text-xs font-semibold text-emerald-950"
                        >
                          Capture Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition ${mediaButtonClass}`}
                        >
                          Cancel Camera
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {photoPreview ? (
                    <div className="mt-3 overflow-hidden rounded-xl">
                      <img
                        src={photoPreview}
                        alt="Report evidence preview"
                        className="h-36 w-full object-cover sm:h-44"
                      />
                      <div className={`flex items-center justify-between px-2.5 py-2 ${isLight ? "bg-white/75" : "bg-black/35"}`}>
                        <p className={`truncate text-[11px] ${secondaryTextClass}`}>
                          {photoName ?? "Captured image"}
                        </p>
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className={`rounded-lg px-2 py-1 text-[11px] transition ${
                            isLight
                              ? "bg-rose-500/12 text-rose-700 hover:bg-rose-500/18"
                              : "bg-rose-500/15 text-rose-100 hover:bg-rose-500/22"
                          }`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : null}
                    </div>

                    <div className={`rounded-2xl p-3 ${reportPanelSectionClass}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className={`block text-sm ${secondaryTextClass}`}>Reporter Location</label>
                    <button
                      type="button"
                      onClick={requestCurrentLocation}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${mediaButtonClass}`}
                    >
                      {locationLoading ? "Locating..." : userLocation ? "Refresh Location" : "Use My Location"}
                    </button>
                  </div>
                  {userLocation ? (
                    <div className="space-y-1">
                      <p className={`text-xs ${secondaryTextClass}`}>
                        {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                      </p>
                      <p className={`text-[11px] ${tertiaryTextClass}`}>
                        Accuracy: {Math.round(userLocation.accuracy ?? 0)}m
                      </p>
                    </div>
                  ) : (
                    <p className={`text-xs ${secondaryTextClass}`}>
                      Enable location so your report marks the exact place on the map.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-emerald-300">
                    Auto mark: this point will be flagged for tree and flower planting.
                  </p>
                  {locationError ? (
                    <p className={`mt-1 text-[11px] ${isLight ? "text-rose-700" : "text-rose-200"}`}>
                      {locationError}
                    </p>
                  ) : null}
                  {reportSuccess ? (
                    <p className={`mt-1 text-[11px] ${isLight ? "text-emerald-700" : "text-emerald-200"}`}>
                      {reportSuccess}
                    </p>
                  ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
                <div>
                  <div className={`mb-1.5 flex items-center justify-between text-xs ${isLight ? "text-emerald-700" : "text-emerald-100"}`}>
                    <span>Report Progress</span>
                    <span>{reportProgress}%</span>
                  </div>
                  <p className={`mb-1.5 text-[11px] ${tertiaryTextClass}`}>
                    {completedReportSteps}/{reportSteps.length} steps completed
                  </p>
                  <div className={`h-2 rounded-full ${isLight ? "bg-slate-900/10" : "bg-white/10"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${reportProgress}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500 shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_300px] sm:items-end">
                  <div>
                    <div className={`rounded-2xl p-2.5 ${expertFieldCardClass}`}>
                      <label className={`mb-1 block text-sm ${secondaryTextClass}`}>Assign Care Team</label>
                      <div ref={expertMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setExpertMenuOpen((value) => !value)}
                          className={`flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm outline-none backdrop-blur-xl ${inputClass}`}
                        >
                          <span className="truncate text-left">{selectedExpertLabel}</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${tertiaryTextClass} ${
                              expertMenuOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {expertMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.98 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className={`absolute bottom-[calc(100%+0.45rem)] left-0 right-0 z-40 overflow-hidden rounded-2xl border backdrop-blur-xl ${expertMenuClass}`}
                            >
                              <ul className="max-h-44 space-y-1 overflow-y-auto p-1.5">
                                {expertOptions.map((option) => (
                                  <li key={option.value}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpert(option.value);
                                        setExpertMenuOpen(false);
                                        setReportFormError(null);
                                      }}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                        expert === option.value
                                          ? isLight
                                            ? "bg-emerald-500/18 text-emerald-800"
                                            : "bg-emerald-500/20 text-emerald-100"
                                          : isLight
                                            ? "text-slate-700 hover:bg-slate-900/8"
                                            : "text-white/85 hover:bg-white/10"
                                      }`}
                                    >
                                      <span className="truncate">{option.label}</span>
                                      {expert === option.value ? (
                                        <Check className="ml-2 h-4 w-4 shrink-0" />
                                      ) : null}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {reportFormError ? (
                      <p className={`mt-1 text-[11px] ${isLight ? "text-rose-700" : "text-rose-200"}`}>
                        {reportFormError}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={submitReportWithLocation}
                    disabled={locationLoading || reportSubmitting || !canSubmitReport}
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition sm:min-w-[300px] ${
                      locationLoading || reportSubmitting || !canSubmitReport
                        ? isLight
                          ? "cursor-not-allowed bg-slate-900/10 text-slate-400"
                          : "cursor-not-allowed bg-white/10 text-white/40"
                        : "bg-gradient-to-r from-emerald-400 to-green-600 text-emerald-950 shadow-[0_12px_28px_rgba(16,185,129,0.35)]"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    {reportSubmitting ? "Submitting..." : "Submit and Mark Planting Spot"}
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dashboardOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-auto absolute inset-0 z-[70] flex items-center justify-center p-4 ${
                isLight ? "bg-slate-900/20" : "bg-black/45"
              }`}
            >
              <motion.section
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={`relative w-full max-w-5xl rounded-[28px] p-5 backdrop-blur-2xl sm:p-6 ${dashboardCardClass}`}
              >
                <button
                  type="button"
                  onClick={() => setDashboardOpen(false)}
                  className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition ${dashboardSubcardClass}`}
                >
                  <X className={`h-4 w-4 ${primaryTextClass}`} />
                </button>

                <div className="mb-4">
                  <p className={`text-xs uppercase tracking-[0.22em] ${tertiaryTextClass}`}>
                    Intelligent Dashboard
                  </p>
                  <h2 className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>
                    Community Intelligence Window
                  </h2>
                  <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                    Top reporters, winner insights, area activity, and your removable GreenSpot reports.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                    <p className={`text-xs ${tertiaryTextClass}`}>Total Reports</p>
                    <p className={`mt-2 text-3xl font-semibold ${primaryTextClass}`}>
                      {reports.length}
                    </p>
                    <p className={`mt-1 text-xs ${secondaryTextClass}`}>Live reports on map</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                    <p className={`text-xs ${tertiaryTextClass}`}>Winner Reporter</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-400" />
                      <p className={`text-xl font-semibold ${primaryTextClass}`}>
                        {winner?.name ?? "No winner yet"}
                      </p>
                    </div>
                    <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                      {winner ? `${winner.reports} reports submitted` : "Submit to rank"}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                    <p className={`text-xs ${tertiaryTextClass}`}>Verified Signals</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-300" />
                      <p className={`text-3xl font-semibold ${primaryTextClass}`}>{totalVerified}</p>
                    </div>
                    <p className={`mt-1 text-xs ${secondaryTextClass}`}>Community confirmations</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                  <div className="space-y-4">
                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className={`text-sm font-semibold ${primaryTextClass}`}>Top Reporters</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${badgeClass}`}>
                          Winner highlighted
                        </span>
                      </div>
                      <div className="space-y-2">
                        {leaderboard.map((entry, index) => (
                          <div
                            key={entry.name}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                              index === 0
                                ? isLight
                                  ? "bg-amber-100/80"
                                  : "bg-amber-400/14"
                                : isLight
                                  ? "bg-white/70"
                                  : "bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                  index === 0
                                    ? "bg-amber-400/25 text-amber-900"
                                    : isLight
                                      ? "bg-slate-900/10 text-slate-700"
                                      : "bg-white/10 text-white/80"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <div>
                                <p className={`text-sm font-medium ${primaryTextClass}`}>{entry.name}</p>
                                <p className={`text-xs ${secondaryTextClass}`}>
                                  {entry.reports} reports - {entry.areaCount} areas
                                </p>
                              </div>
                            </div>
                            {index === 0 ? (
                              <Trophy className="h-4 w-4 text-amber-400" />
                            ) : (
                              <span className={`text-xs ${tertiaryTextClass}`}>
                                {entry.verified} verified
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <h3 className={`text-sm font-semibold ${primaryTextClass}`}>
                        Reported Areas Intensity
                      </h3>
                      <div className="mt-3 space-y-3">
                        {areaStats.map((area) => (
                          <div key={area.area}>
                            <div className="mb-1.5 flex items-center justify-between">
                              <p className={`text-xs ${secondaryTextClass}`}>{area.area}</p>
                              <span className={`text-xs ${tertiaryTextClass}`}>{area.count}</span>
                            </div>
                            <div className={`h-1.5 rounded-full ${isLight ? "bg-slate-900/12" : "bg-white/10"}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(area.count / maxAreaCount) * 100}%` }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                    <h3 className={`text-sm font-semibold ${primaryTextClass}`}>
                      My Reported GreenSpot Areas
                    </h3>
                    <p className={`mt-1 text-xs ${tertiaryTextClass}`}>
                      {user ? `Signed in as ${currentUser}` : "Sign in to manage your reports"}
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {myReports.length === 0 ? (
                        <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                          {user
                            ? "No reports yet. Create one from the report button."
                            : "Login to view and manage your reports."}
                        </div>
                      ) : (
                        myReports.map((report) => (
                          <div key={report.id} className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-sm font-medium ${primaryTextClass}`}>{report.area}</p>
                                <p className={`text-xs ${secondaryTextClass}`}>
                                  {report.waste_type} - {report.status}
                                </p>
                                <p className={`mt-1 text-[11px] ${tertiaryTextClass}`}>
                                  {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMyReport(report.id)}
                                disabled={deletingReportId === report.id}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                  isLight
                                    ? "bg-rose-500/12 text-rose-700 hover:bg-rose-500/18"
                                    : "bg-rose-500/15 text-rose-100 hover:bg-rose-500/22"
                                }`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingReportId === report.id ? "Removing..." : "Remove"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {remindersOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-auto absolute inset-0 z-[71] flex items-start justify-center overflow-hidden p-3 sm:items-center sm:p-4 ${
                isLight ? "bg-slate-900/20" : "bg-black/45"
              }`}
            >
              <motion.section
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={`relative my-2 flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] p-4 backdrop-blur-2xl sm:p-6 max-h-[calc(100dvh-1.5rem)] ${dashboardCardClass}`}
              >
                <button
                  type="button"
                  onClick={() => setRemindersOpen(false)}
                  className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition ${dashboardSubcardClass}`}
                >
                  <X className={`h-4 w-4 ${primaryTextClass}`} />
                </button>

                <div className="mb-4">
                  <p className={`text-xs uppercase tracking-[0.22em] ${tertiaryTextClass}`}>
                    Reminders Window
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className={`text-2xl font-semibold ${primaryTextClass}`}>
                      Watering & Planting Reminders
                    </h2>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${badgeClass}`}>
                      {dueReminderCount} due today
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                    Confirm open map reports, schedule care automatically, and complete each reminder with proof.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {remindersNotice ? (
                    <div
                      className={`mb-3 rounded-xl px-3 py-2 text-xs ${
                        isLight ? "bg-emerald-500/14 text-emerald-800" : "bg-emerald-500/20 text-emerald-100"
                      }`}
                    >
                      {remindersNotice}
                    </div>
                  ) : null}
                  {remindersError ? (
                    <div
                      className={`mb-3 rounded-xl px-3 py-2 text-xs ${
                        isLight ? "bg-rose-500/12 text-rose-700" : "bg-rose-500/14 text-rose-100"
                      }`}
                    >
                      {remindersError}
                    </div>
                  ) : null}

                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      { key: "opportunities", label: "Open Spots", count: opportunities.length },
                      { key: "active", label: "Active Reminders", count: activeReminderTasks.length },
                      { key: "completed", label: "Completed", count: completedReminderTasks.length },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          setReminderTab(tab.key as "opportunities" | "active" | "completed")
                        }
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          reminderTab === tab.key
                            ? isLight
                              ? "bg-slate-900 text-white"
                              : "bg-white/18 text-white"
                            : isLight
                              ? "bg-slate-900/8 text-slate-700 hover:bg-slate-900/12"
                              : "bg-white/10 text-white/75 hover:bg-white/15"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            reminderTab === tab.key
                              ? "bg-white/20 text-white"
                              : isLight
                                ? "bg-white/80 text-slate-700"
                                : "bg-white/14 text-white/80"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                    {remindersLoading ? (
                      <p className={`text-sm ${secondaryTextClass}`}>Syncing reminder system...</p>
                    ) : null}

                    {!remindersLoading && reminderTab === "opportunities" ? (
                      <div className="space-y-2.5">
                        {opportunities.length === 0 ? (
                          <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                            No open spots right now. New reports will appear here.
                          </div>
                        ) : (
                          opportunities.slice(0, 10).map((report) => (
                            <div
                              key={report.id}
                              className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={`text-sm font-medium ${primaryTextClass}`}>{report.area}</p>
                                  <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                                    {report.waste_type} - {report.status}
                                  </p>
                                  <p className={`mt-1 text-[11px] ${tertiaryTextClass}`}>
                                    reported by {report.user_name}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void confirmReportForPlanting(report)}
                                  disabled={confirmingReportId === report.id}
                                  className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
                                    confirmingReportId === report.id
                                      ? isLight
                                        ? "cursor-not-allowed bg-slate-900/10 text-slate-500"
                                        : "cursor-not-allowed bg-white/10 text-white/45"
                                      : "bg-gradient-to-r from-emerald-400 to-green-600 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.35)]"
                                  }`}
                                >
                                  {confirmingReportId === report.id ? "Confirming..." : "Confirm"}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}

                    {!remindersLoading && reminderTab === "active" ? (
                      <div className="space-y-2.5">
                        {activeReminderTasks.length === 0 ? (
                          <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                            No active reminders yet. Confirm a spot to generate reminders.
                          </div>
                        ) : (
                          activeReminderTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={`text-sm font-medium ${primaryTextClass}`}>{task.plant_name}</p>
                                  <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                                    {task.task_type.replace(/_/g, " ")} - due{" "}
                                    {new Date(task.due_at).toLocaleDateString()}
                                  </p>
                                  <p className={`mt-1 text-[11px] ${tertiaryTextClass}`}>{task.description}</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}>
                                  Pending
                                </span>
                              </div>

                              <div className="mt-3">
                                <label
                                  className={`inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                    completingTaskId === task.id
                                      ? isLight
                                        ? "cursor-not-allowed bg-slate-900/10 text-slate-500"
                                        : "cursor-not-allowed bg-white/10 text-white/45"
                                      : "bg-gradient-to-r from-emerald-400 to-green-600 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.35)]"
                                  }`}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={completingTaskId === task.id}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      event.currentTarget.value = "";
                                      if (!file) return;
                                      void completeReminderTask(task, file);
                                    }}
                                  />
                                  {completingTaskId === task.id
                                    ? "Uploading proof..."
                                    : "Upload proof & complete"}
                                </label>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}

                    {!remindersLoading && reminderTab === "completed" ? (
                      <div className="space-y-2.5">
                        {completedReminderTasks.length === 0 ? (
                          <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                            Completed reminders with proof will appear here.
                          </div>
                        ) : (
                          completedReminderTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={`text-sm font-medium ${primaryTextClass}`}>{task.plant_name}</p>
                                  <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                                    {task.task_type.replace(/_/g, " ")} - completed{" "}
                                    {new Date(task.completed_at ?? task.due_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}>
                                  Done
                                </span>
                              </div>

                              {task.photo_url ? (
                                <img
                                  src={task.photo_url}
                                  alt="Completion proof"
                                  className="mt-3 h-28 w-full rounded-xl object-cover"
                                />
                              ) : (
                                <p className={`mt-2 text-[11px] ${tertiaryTextClass}`}>
                                  Proof image not available.
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>

                    <div className="space-y-3">
                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${tertiaryTextClass}`}>
                        Reminder Pulse
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Open Opportunities</p>
                          <p className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>
                            {opportunities.length}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Due Today</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-amber-400" />
                            <p className={`text-2xl font-semibold ${primaryTextClass}`}>{dueReminderCount}</p>
                          </div>
                        </div>
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Active Tasks</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-emerald-300" />
                            <p className={`text-2xl font-semibold ${primaryTextClass}`}>
                              {activeReminderTasks.length}
                            </p>
                          </div>
                        </div>
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Completed</p>
                          <p className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>
                            {completedReminderTasks.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <p className={`text-sm font-semibold ${primaryTextClass}`}>My Accepted Spots</p>
                      <div className="mt-2 space-y-2.5">
                        {myAcceptedReports.length === 0 ? (
                          <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                            Accept a spot from map markers to start reminders.
                          </div>
                        ) : (
                          myAcceptedReports.slice(0, 5).map((report) => (
                            <div
                              key={report.id}
                              className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}
                            >
                              <p className={`text-sm font-medium ${primaryTextClass}`}>{report.area}</p>
                              <p className={`mt-1 text-xs ${secondaryTextClass}`}>{report.status}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-auto absolute inset-0 z-[72] flex items-center justify-center p-4 ${
                isLight ? "bg-slate-900/20" : "bg-black/48"
              }`}
            >
              <motion.section
                initial={{ opacity: 0, y: 26, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`relative w-full max-w-4xl rounded-[28px] p-5 backdrop-blur-2xl sm:p-6 ${profileCardClass}`}
              >
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition ${dashboardSubcardClass}`}
                >
                  <X className={`h-4 w-4 ${primaryTextClass}`} />
                </button>

                <p className={`text-xs uppercase tracking-[0.22em] ${tertiaryTextClass}`}>User Profile</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-900/10 bg-white/72" : "border-white/12 bg-white/8"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div
                            className={`h-20 w-20 overflow-hidden rounded-2xl border ${
                              isLight ? "border-slate-900/12 bg-slate-900/8" : "border-white/14 bg-black/30"
                            }`}
                          >
                            {profileAvatarPreview ? (
                              <img
                                src={profileAvatarPreview}
                                alt="Profile avatar preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center text-xl font-semibold ${
                                  isLight ? "text-slate-800" : "text-white"
                                }`}
                              >
                                {profileInitials}
                              </div>
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                        </div>
                        <div>
                          <h3 className={`text-2xl font-semibold ${primaryTextClass}`}>{currentUser}</h3>
                          <p className={`mt-1 max-w-sm text-sm ${secondaryTextClass}`}>{currentUserBio}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => profileImageInputRef.current?.click()}
                        disabled={profileSaving}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                          isLight
                            ? "border border-slate-900/14 bg-white text-slate-800 hover:bg-slate-100"
                            : "border border-white/16 bg-white/10 text-white hover:bg-white/16"
                        }`}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Change Photo
                      </button>
                      <input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileAvatarSelect}
                      />
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div>
                        <label className={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${tertiaryTextClass}`}>
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={profileNameDraft}
                          onChange={(event) => {
                            setProfileNameDraft(event.target.value);
                            setProfileSaveError(null);
                            setProfileSaveSuccess(null);
                          }}
                          disabled={!canChangeName || profileSaving}
                          className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                            isLight
                              ? "border border-slate-900/12 bg-white text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100 disabled:text-slate-500"
                              : "border border-white/14 bg-black/25 text-white placeholder:text-white/50 disabled:bg-white/8 disabled:text-white/55"
                          }`}
                          placeholder="Your public GreenSpot name"
                        />
                        <p className={`mt-1 text-[11px] ${tertiaryTextClass}`}>
                          Name can be changed every {nameCooldownDays} days.
                          {nameChangeAvailableAt
                            ? ` Next available: ${nameChangeAvailableAt.toLocaleDateString()}.`
                            : " You can update it now."}
                        </p>
                      </div>

                      <div>
                        <label className={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${tertiaryTextClass}`}>
                          Bio
                        </label>
                        <textarea
                          rows={4}
                          value={profileBioDraft}
                          onChange={(event) => {
                            setProfileBioDraft(event.target.value.slice(0, 280));
                            setProfileSaveError(null);
                            setProfileSaveSuccess(null);
                          }}
                          disabled={profileSaving}
                          className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${
                            isLight
                              ? "border border-slate-900/12 bg-white text-slate-900 placeholder:text-slate-500"
                              : "border border-white/14 bg-black/25 text-white placeholder:text-white/50"
                          }`}
                          placeholder="Tell people what you monitor and why you care."
                        />
                        <p className={`mt-1 text-[11px] ${tertiaryTextClass}`}>
                          {profileBioDraft.trim().length}/280 characters
                        </p>
                      </div>

                      {profileSaveError ? (
                        <div className={`rounded-xl px-3 py-2 text-xs ${
                          isLight ? "bg-rose-500/12 text-rose-700" : "bg-rose-500/14 text-rose-100"
                        }`}>
                          {profileSaveError}
                        </div>
                      ) : null}

                      {profileSaveSuccess ? (
                        <div className={`rounded-xl px-3 py-2 text-xs ${
                          isLight ? "bg-emerald-500/14 text-emerald-800" : "bg-emerald-500/20 text-emerald-100"
                        }`}>
                          {profileSaveSuccess}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={saveProfileChanges}
                          disabled={profileSaveDisabled}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-[0_12px_26px_rgba(16,185,129,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {profileSaving ? (
                            <>
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-900/30 border-t-emerald-900" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Save Profile
                            </>
                          )}
                        </button>

                        {profileNameChangeBlocked ? (
                          <span className={`text-[11px] ${tertiaryTextClass}`}>
                            Name is locked until{" "}
                            {nameChangeAvailableAt
                              ? nameChangeAvailableAt.toLocaleDateString()
                              : "cooldown resets"}.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${tertiaryTextClass}`}>
                        Impact Snapshot
                      </p>
                      <div className="mt-3 grid gap-2">
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Total Reports</p>
                          <p className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>{myReports.length}</p>
                        </div>
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Verified Count</p>
                          <p className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>
                            {myReports.reduce((sum, item) => sum + (item.verified_count ?? 0), 0)}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                          <p className={`text-[11px] ${tertiaryTextClass}`}>Covered Areas</p>
                          <p className={`mt-1 text-2xl font-semibold ${primaryTextClass}`}>
                            {new Set(myReports.map((item) => item.area)).size}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-2xl p-4 ${dashboardSubcardClass}`}>
                      <p className={`text-sm font-semibold ${primaryTextClass}`}>Recent Reports</p>
                      <div className="mt-2 space-y-2.5">
                        {recentMyReports.length === 0 ? (
                          <div className={`rounded-xl p-3 text-sm ${secondaryTextClass}`}>
                            No recent reports available.
                          </div>
                        ) : (
                          recentMyReports.map((report) => (
                            <div key={report.id} className={`rounded-xl p-3 ${isLight ? "bg-white/72" : "bg-white/7"}`}>
                              <p className={`text-sm font-medium ${primaryTextClass}`}>{report.area}</p>
                              <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                                {report.waste_type} - {report.status}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiChatOpen && (
            <motion.section
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={`pointer-events-auto absolute bottom-24 left-2 right-2 z-[68] flex h-[min(74dvh,640px)] flex-col overflow-hidden rounded-[28px] backdrop-blur-2xl sm:bottom-24 sm:left-auto sm:right-6 sm:w-[min(94vw,420px)] ${aiChatShellClass}`}
            >
              <div className="border-b border-white/10 px-4 pb-3 pt-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/25">
                      <Bot className={`h-5 w-5 ${isLight ? "text-emerald-700" : "text-emerald-200"}`} />
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${primaryTextClass}`}>GreenDuty AI Botanist</p>
                      <p className={`text-[11px] ${tertiaryTextClass}`}>Trees, plants, flowers, agronomy, seeds only</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiChatOpen(false)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${mediaButtonClass}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                        message.role === "user" ? aiUserBubbleClass : aiAssistantBubbleClass
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.text}</p>

                      {message.imageUrl ? (
                        <img
                          src={message.imageUrl}
                          alt="Area shared with AI"
                          className="mt-2 h-28 w-full rounded-xl object-cover"
                        />
                      ) : null}

                      {message.gardenPlan ? (
                        <div className={`mt-2 rounded-xl p-2 ${isLight ? "bg-white/70" : "bg-black/25"}`}>
                          <p className="text-[11px] leading-snug">{message.gardenPlan.summary}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <p className={`mb-1 text-[10px] uppercase tracking-wide ${tertiaryTextClass}`}>Area</p>
                              <img
                                src={message.gardenPlan.beforeImageUrl}
                                alt="Uploaded area"
                                className="h-24 w-full rounded-lg object-cover"
                              />
                            </div>
                            <div>
                              <p className={`mb-1 text-[10px] uppercase tracking-wide ${tertiaryTextClass}`}>AI Design</p>
                              <img
                                src={message.gardenPlan.designImageUrl}
                                alt="AI garden concept"
                                className="h-24 w-full rounded-lg object-cover"
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {message.gardenPlan.suggestedPlants.map((plant) => (
                              <span
                                key={plant}
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  isLight ? "bg-emerald-500/16 text-emerald-800" : "bg-emerald-500/22 text-emerald-100"
                                }`}
                              >
                                {plant}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {aiThinking ? (
                  <div className="flex justify-start">
                    <div className={`rounded-2xl px-3 py-2 text-sm ${aiAssistantBubbleClass}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Thinking about your planting request...
                      </span>
                    </div>
                  </div>
                ) : null}
                <div ref={aiMessagesEndRef} />
              </div>

              <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
                <input
                  ref={aiImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAiImageUpload}
                  className="hidden"
                />

                {aiPendingImage ? (
                  <div className={`mb-2 rounded-xl p-2 ${isLight ? "bg-slate-900/8" : "bg-white/8"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[11px] ${secondaryTextClass}`}>{aiPendingImageName ?? "Area image"}</p>
                      <button
                        type="button"
                        onClick={clearAiPendingImage}
                        className={`rounded-lg px-2 py-1 text-[11px] transition ${mediaButtonClass}`}
                      >
                        Remove
                      </button>
                    </div>
                    <img
                      src={aiPendingImage}
                      alt="Pending AI scan upload"
                      className="mt-1.5 h-24 w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => aiImageInputRef.current?.click()}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${mediaButtonClass}`}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendAiMessage();
                      }
                    }}
                    placeholder="Ask about trees, flowers, seeds, soil..."
                    className={`h-10 w-full rounded-xl px-3 text-sm outline-none ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={sendAiMessage}
                    disabled={aiThinking || (!aiInput.trim() && !aiPendingImage)}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      aiThinking || (!aiInput.trim() && !aiPendingImage)
                        ? isLight
                          ? "cursor-not-allowed bg-slate-900/10 text-slate-400"
                          : "cursor-not-allowed bg-white/10 text-white/40"
                        : "bg-gradient-to-r from-emerald-400 to-green-600 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.35)]"
                    }`}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={panelOpen ? "Close report panel" : "Open report panel"}
          onClick={() => {
            if (!user) {
              openAuth();
              return;
            }
            if (!panelOpen) {
              setReportSuccess(null);
              setReportFormError(null);
              if (!userLocation) {
                requestCurrentLocation();
              }
            }
            setPanelOpen((value) => !value);
          }}
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={
            panelOpen || aiChatOpen
              ? { opacity: 0, y: 16, scale: 0.92 }
              : {
                  opacity: 1,
                  y: [0, -6, 0],
                  scale: 1,
                  boxShadow: isLight
                    ? [
                        "0 14px 30px rgba(15,23,42,0.16)",
                        "0 20px 38px rgba(15,23,42,0.22)",
                        "0 14px 30px rgba(15,23,42,0.16)",
                      ]
                    : [
                        "0 16px 34px rgba(0,0,0,0.38)",
                        "0 22px 42px rgba(0,0,0,0.48)",
                        "0 16px 34px rgba(0,0,0,0.38)",
                      ],
                }
          }
          transition={
            panelOpen || aiChatOpen
              ? { duration: 0.2, ease: "easeOut" }
              : {
                  y: { duration: 3.1, ease: "easeInOut", repeat: Infinity },
                  boxShadow: { duration: 3.1, ease: "easeInOut", repeat: Infinity },
                  scale: { type: "spring", stiffness: 260, damping: 18 },
                }
          }
          className={`pointer-events-auto absolute bottom-2 left-1/2 z-50 inline-flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-300 sm:bottom-5 sm:h-16 sm:w-16 ${
            isLight
              ? "border-slate-900/12 bg-white/88 text-slate-900"
              : "border-white/14 bg-black/42 text-white"
          } ${
            panelOpen || aiChatOpen
              ? "pointer-events-none"
              : "opacity-100"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {!panelOpen && !aiChatOpen ? (
            <motion.span
              aria-hidden
              className={`pointer-events-none absolute inset-1 rounded-full ${
                isLight ? "bg-emerald-500/8" : "bg-emerald-400/10"
              }`}
              animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
          <span
            className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ${
              isLight
                ? "border border-emerald-700/22 bg-emerald-500/14 text-emerald-700"
                : "border border-emerald-200/26 bg-emerald-400/18 text-emerald-100"
            }`}
          >
            {panelOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </motion.button>
      </div>
    </main>
  );
}

