"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FilePlus2,
  HeartPulse,
  Home as HomeIcon,
  PackageSearch,
  Pill,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
  UserSquare2,
  UserCheck,
  UserCog,
  Venus,
} from "lucide-react";

import { SystemInformation } from "@/components/branding/SystemInformation";
import { ActivityTimeline, type ActivityTimelineItem } from "@/components/executive/ActivityTimeline";
import { ChartCard } from "@/components/executive/ChartCard";
import { DashboardCard } from "@/components/executive/DashboardCard";
import { QuickAction } from "@/components/executive/QuickAction";
import { SummaryPanel, type SummaryItem } from "@/components/executive/SummaryPanel";
import { ContentContainer } from "@/components/layout/ContentContainer";
import { useSessionAuth } from "@/components/session-context";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  getBhwSummary,
  getDashboardSummary,
  getInventoryAssets,
  getInventorySummary,
  getOfficeProfile,
  getResidentsPaginated,
  getStaffDocumentRequests,
  getTodayVisitorsReport,
  type BhwSummary,
  type DashboardSummary,
  type InventoryAsset,
  type InventorySummary,
  type OfficeProfile,
  type ResidentListItem,
  type StaffDocumentRequest,
  type TodayVisitorsReport,
} from "@/lib/api";
import { BRAND } from "@/lib/brand";

type DashboardData = {
  summary: DashboardSummary | null;
  officeProfile: OfficeProfile | null;
  residents: ResidentListItem[];
  documentRequests: StaffDocumentRequest[];
  visitorsReport: TodayVisitorsReport | null;
  inventorySummary: InventorySummary | null;
  inventoryAssets: InventoryAsset[];
  bhwSummary: BhwSummary | null;
};

type KpiTone = "blue" | "emerald" | "amber" | "slate" | "red";

const ANNOUNCEMENTS: SummaryItem[] = [
  {
    id: "ann-1",
    text: "Barangay Announcements: Monthly cleanup drive is scheduled this Saturday at 7:00 AM.",
    tone: "neutral",
  },
  {
    id: "ann-2",
    text: "Upcoming Meetings: Barangay council strategic review on Friday at 3:00 PM.",
    tone: "neutral",
  },
  {
    id: "ann-3",
    text: "Emergency Notices: Keep hotline channels monitored for weather escalation advisories.",
    tone: "warning",
  },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatErrors(messages: string[]) {
  const uniqueMessages = [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
  if (uniqueMessages.length === 0) {
    return "";
  }

  const onlyFetchFailures = uniqueMessages.every((message) => message.toLowerCase() === "failed to fetch");
  if (onlyFetchFailures) {
    return "Unable to connect to backend API. Verify backend availability and NEXT_PUBLIC_API_BASE_URL configuration.";
  }

  return uniqueMessages.join(" | ");
}

function createFallbackSummary(): DashboardSummary {
  return {
    generated_at: new Date().toISOString(),
    cards: {
      total_residents: 0,
      total_households: 0,
      senior_citizens: 0,
      fourps_beneficiaries: 0,
      pwd_count: 0,
      active_businesses: 0,
      active_pregnancies: 0,
      active_fourps_reports: 0,
      recent_health_reports: 0,
      ready_today_count: 0,
      currently_ready_count: 0,
      visitors_today_count: 0,
      pending_document_requests: 0,
    },
    charts: {
      gender_distribution: { male: 0, female: 0 },
      age_distribution: { children: 0, adults: 0, seniors: 0 },
      zone_distribution: [],
    },
  };
}

function percentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function trendLabel(value: number | null): { label: string; direction: "up" | "down" | "flat" } {
  if (value === null) {
    return { label: "Unavailable", direction: "flat" };
  }

  if (value > 0) {
    return { label: "Active", direction: "up" };
  }

  return { label: "Stable", direction: "flat" };
}

export default function Home() {
  const { canWrite, session } = useSessionAuth();

  const [data, setData] = useState<DashboardData>({
    summary: null,
    officeProfile: null,
    residents: [],
    documentRequests: [],
    visitorsReport: null,
    inventorySummary: null,
    inventoryAssets: [],
    bhwSummary: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh") => {
      const nextErrors: string[] = [];

      const [
        summaryResult,
        officeProfileResult,
        residentsResult,
        queueResult,
        visitorsResult,
        inventorySummaryResult,
        inventoryAssetsResult,
        bhwSummaryResult,
      ] = await Promise.allSettled([
        getDashboardSummary(),
        getOfficeProfile(),
        canWrite
          ? getResidentsPaginated({ page: 1, page_size: 14, ordering: "-last_name" })
          : Promise.resolve({ results: [] as ResidentListItem[] }),
        canWrite
          ? getStaffDocumentRequests({ page: 1, page_size: 40 })
          : Promise.resolve({ results: [] as StaffDocumentRequest[] }),
        canWrite ? getTodayVisitorsReport() : Promise.resolve(null),
        canWrite ? getInventorySummary() : Promise.resolve(null),
        canWrite
          ? getInventoryAssets({ page: 1, page_size: 12 })
          : Promise.resolve({ results: [] as InventoryAsset[] }),
        canWrite ? getBhwSummary() : Promise.resolve(null),
      ]);

      if (summaryResult.status === "rejected") {
        nextErrors.push(summaryResult.reason instanceof Error ? summaryResult.reason.message : "Dashboard summary could not be loaded.");
      }
      if (officeProfileResult.status === "rejected") {
        nextErrors.push(officeProfileResult.reason instanceof Error ? officeProfileResult.reason.message : "Office profile could not be loaded.");
      }
      if (residentsResult.status === "rejected") {
        nextErrors.push(residentsResult.reason instanceof Error ? residentsResult.reason.message : "Resident preview could not be loaded.");
      }
      if (queueResult.status === "rejected") {
        nextErrors.push(queueResult.reason instanceof Error ? queueResult.reason.message : "Document queue could not be loaded.");
      }
      if (visitorsResult.status === "rejected") {
        nextErrors.push(visitorsResult.reason instanceof Error ? visitorsResult.reason.message : "Visitors report could not be loaded.");
      }
      if (inventorySummaryResult.status === "rejected") {
        nextErrors.push(inventorySummaryResult.reason instanceof Error ? inventorySummaryResult.reason.message : "Inventory summary could not be loaded.");
      }
      if (inventoryAssetsResult.status === "rejected") {
        nextErrors.push(inventoryAssetsResult.reason instanceof Error ? inventoryAssetsResult.reason.message : "Inventory assets could not be loaded.");
      }
      if (bhwSummaryResult.status === "rejected") {
        nextErrors.push(bhwSummaryResult.reason instanceof Error ? bhwSummaryResult.reason.message : "BHW summary could not be loaded.");
      }

      setData({
        summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
        officeProfile: officeProfileResult.status === "fulfilled" ? officeProfileResult.value : null,
        residents: residentsResult.status === "fulfilled" ? residentsResult.value.results : [],
        documentRequests: queueResult.status === "fulfilled" ? queueResult.value.results : [],
        visitorsReport: visitorsResult.status === "fulfilled" ? visitorsResult.value : null,
        inventorySummary: inventorySummaryResult.status === "fulfilled" ? inventorySummaryResult.value : null,
        inventoryAssets: inventoryAssetsResult.status === "fulfilled" ? inventoryAssetsResult.value.results : [],
        bhwSummary: bhwSummaryResult.status === "fulfilled" ? bhwSummaryResult.value : null,
      });
      setErrors(nextErrors);
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
      if (mode === "refresh") {
        setRefreshing(false);
      }
    },
    [canWrite],
  );

  useEffect(() => {
    void loadDashboard("initial");
  }, [loadDashboard]);

  const summary = data.summary ?? createFallbackSummary();
  const office = data.officeProfile;
  const demoPreviewMode = true;
  const environment = process.env.NODE_ENV === "production" ? "Production" : "Development";
  const systemVersion = process.env.NEXT_PUBLIC_SYSTEM_VERSION?.trim() || BRAND.version;
  const onlineStatus = errors.length === 0 ? "Online" : "Degraded";

  const governanceStatus = useMemo(() => {
    const pending = summary.cards.pending_document_requests;
    if (pending >= 15) {
      return "warning" as const;
    }
    return "good" as const;
  }, [summary.cards.pending_document_requests]);

  const communityKpis = useMemo(() => {
    const male = summary.charts.gender_distribution.male;
    const female = summary.charts.gender_distribution.female;

    return [
      { title: "Total Residents", value: summary.cards.total_residents, description: "Registered community members", href: "/residents", icon: Users, tone: "blue" as KpiTone },
      { title: "Households", value: summary.cards.total_households, description: "Mapped household records", href: "/households", icon: HomeIcon, tone: "emerald" as KpiTone },
      { title: "Male", value: male, description: "Male residents from summary profile", href: "/residents", icon: UserSquare2, tone: "blue" as KpiTone },
      { title: "Female", value: female, description: "Female residents from summary profile", href: "/residents", icon: Venus, tone: "emerald" as KpiTone },
      { title: "Seniors", value: summary.cards.senior_citizens, description: "Residents 60 and above", href: "/reports/senior-citizens", icon: HeartPulse, tone: "amber" as KpiTone },
      { title: "PWD", value: summary.cards.pwd_count, description: "Registered PWD profiles", href: "/reports", icon: UserCheck, tone: "slate" as KpiTone },
      { title: "Solo Parents", value: null, description: "Pending dedicated endpoint exposure", href: "/reports", icon: UserCog, tone: "slate" as KpiTone },
      { title: "4Ps", value: summary.cards.fourps_beneficiaries, description: "4Ps beneficiary coverage", href: "/reports/fourps", icon: Briefcase, tone: "amber" as KpiTone },
    ];
  }, [summary]);

  const governanceKpis = useMemo(() => {
    return [
      { title: "Pending Documents", value: summary.cards.pending_document_requests, description: "Requests waiting for processing", href: "/document-requests", icon: ClipboardList, tone: "red" as KpiTone },
      { title: "Ready for Release", value: summary.cards.currently_ready_count, description: "Document requests ready for pickup", href: "/document-requests", icon: FileCheck2, tone: "emerald" as KpiTone },
      { title: "Visitors Today", value: summary.cards.visitors_today_count, description: "QR and logbook visits today", href: "/reports/today-visitors", icon: ScanLine, tone: "blue" as KpiTone },
      { title: "Active Businesses", value: summary.cards.active_businesses, description: "Registered active business records", href: "/reports/businesses", icon: Briefcase, tone: "amber" as KpiTone },
      { title: "Blotter Cases", value: null, description: "Pending blotter API publication", href: "/blotter", icon: ShieldAlert, tone: "slate" as KpiTone },
    ];
  }, [summary]);

  const healthKpis = useMemo(() => {
    return [
      { title: "Pregnant Mothers", value: summary.cards.active_pregnancies, description: "Active pregnancy monitoring", href: "/reports/pregnancy", icon: HeartPulse, tone: "red" as KpiTone },
      { title: "Health Reports", value: summary.cards.recent_health_reports, description: "Recent health updates", href: "/bhw-reports", icon: Stethoscope, tone: "emerald" as KpiTone },
      { title: "Senior Monitoring", value: data.bhwSummary?.senior_citizens_total ?? summary.cards.senior_citizens, description: "Senior citizen watchlist records", href: "/bhw-reports", icon: Pill, tone: "amber" as KpiTone },
      { title: "BHW Activities", value: data.bhwSummary?.health_reports_last_30_days ?? null, description: "Health reports in last 30 days", href: "/bhw-reports", icon: ClipboardCheck, tone: "blue" as KpiTone },
    ];
  }, [data.bhwSummary, summary]);

  const operationsKpis = useMemo(() => {
    const needsInspection = data.inventorySummary
      ? data.inventorySummary.under_repair_assets + data.inventorySummary.lost_assets
      : null;

    return [
      { title: "Inventory Assets", value: data.inventorySummary?.total_assets ?? null, description: "Barangay physical assets", href: "/inventory", icon: Archive, tone: "blue" as KpiTone },
      { title: "Assets Needing Inspection", value: needsInspection, description: "Under repair or marked lost", href: "/inventory", icon: PackageSearch, tone: "amber" as KpiTone },
      { title: "QR Visits", value: summary.cards.visitors_today_count, description: "Visitor logs captured today", href: "/residents/scan/test", icon: QrCode, tone: "emerald" as KpiTone },
      { title: "Active Staff", value: null, description: "Awaiting staff directory endpoint", href: "/settings", icon: UserCog, tone: "slate" as KpiTone },
      { title: "AI Assistant Status", value: 1, description: "Assistant service operational", href: "/assistant", icon: Sparkles, tone: "blue" as KpiTone },
    ];
  }, [data.inventorySummary, summary.cards.visitors_today_count]);

  const documentStatusRows = useMemo(() => {
    const counters = {
      pending: 0,
      processing: 0,
      ready_for_pickup: 0,
      released: 0,
      rejected: 0,
    };

    data.documentRequests.forEach((request) => {
      if (request.status in counters) {
        counters[request.status as keyof typeof counters] += 1;
      }
    });

    return [
      { label: "Pending", value: counters.pending, color: "bg-amber-500" },
      { label: "Processing", value: counters.processing, color: "bg-blue-500" },
      { label: "Ready", value: counters.ready_for_pickup, color: "bg-emerald-500" },
      { label: "Released", value: counters.released, color: "bg-slate-500" },
      { label: "Rejected", value: counters.rejected, color: "bg-rose-500" },
    ];
  }, [data.documentRequests]);

  const visitorTrendRows = useMemo(() => {
    const buckets = new Map<string, number>();
    const visitors = data.visitorsReport?.results ?? [];

    visitors.forEach((item) => {
      const stamp = new Date(item.logged_at);
      if (Number.isNaN(stamp.getTime())) {
        return;
      }
      const hour = String(stamp.getHours()).padStart(2, "0");
      const label = `${hour}:00`;
      buckets.set(label, (buckets.get(label) || 0) + 1);
    });

    return [...buckets.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data.visitorsReport?.results]);

  const recentActivity = useMemo<ActivityTimelineItem[]>(() => {
    const rows: ActivityTimelineItem[] = [];

    data.residents.slice(0, 4).forEach((resident) => {
      rows.push({
        id: `resident-${resident.id}`,
        title: "Resident profile available",
        detail: resident.full_name || `${resident.last_name || "Resident"}, ${resident.first_name || ""}`.trim(),
        timestamp: summary.generated_at,
        category: "resident",
      });
    });

    data.documentRequests.slice(0, 4).forEach((request) => {
      rows.push({
        id: `document-${request.id}`,
        title: `${request.document_type_display} • ${request.status_display}`,
        detail: `${request.full_name} • ${request.tracking_number}`,
        timestamp: request.updated_at || request.created_at,
        category: "document",
      });
    });

    data.inventoryAssets.slice(0, 3).forEach((asset) => {
      rows.push({
        id: `inventory-${asset.id}`,
        title: "Inventory asset monitored",
        detail: `${asset.property_number} • ${asset.description}`,
        timestamp: asset.date_acquired || summary.generated_at,
        category: "inventory",
      });
    });

    data.visitorsReport?.results.slice(0, 3).forEach((visitor) => {
      rows.push({
        id: `visitor-${visitor.resident_id}-${visitor.logged_at}`,
        title: "Visitor log recorded",
        detail: `${visitor.full_name} • ${visitor.zone || "Barangay"}`,
        timestamp: visitor.logged_at,
        category: "household",
      });
    });

    if (data.bhwSummary) {
      rows.push({
        id: "bhw-summary",
        title: "BHW report cycle synced",
        detail: `${data.bhwSummary.health_reports_last_30_days} reports within the last 30 days`,
        timestamp: summary.generated_at,
        category: "health",
      });
    }

    return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data.bhwSummary, data.documentRequests, data.inventoryAssets, data.residents, data.visitorsReport?.results, summary.generated_at]);

  const activityMix = useMemo(() => {
    const counters = {
      resident: 0,
      document: 0,
      inventory: 0,
      visitor: 0,
      health: 0,
    };

    recentActivity.forEach((item) => {
      if (item.category === "resident") counters.resident += 1;
      if (item.category === "document") counters.document += 1;
      if (item.category === "inventory") counters.inventory += 1;
      if (item.category === "household") counters.visitor += 1;
      if (item.category === "health") counters.health += 1;
    });

    return [
      { label: "Resident", value: counters.resident, color: "bg-blue-500" },
      { label: "Document", value: counters.document, color: "bg-amber-500" },
      { label: "Inventory", value: counters.inventory, color: "bg-emerald-500" },
      { label: "Visitor", value: counters.visitor, color: "bg-cyan-500" },
      { label: "Health", value: counters.health, color: "bg-rose-500" },
    ];
  }, [recentActivity]);

  const operationalSummary = useMemo<SummaryItem[]>(() => {
    return [
      {
        id: "ops-1",
        text: `${summary.cards.pending_document_requests} document requests pending.`,
        tone: governanceStatus,
      },
      {
        id: "ops-2",
        text: `${summary.cards.visitors_today_count} residents visited today.`,
        tone: "neutral",
      },
      {
        id: "ops-3",
        text: data.inventorySummary && data.inventorySummary.lost_assets > 0
          ? `Inventory attention: ${data.inventorySummary.lost_assets} asset(s) marked lost.`
          : "Inventory status healthy.",
        tone: data.inventorySummary && data.inventorySummary.lost_assets > 0 ? "warning" : "good",
      },
      {
        id: "ops-4",
        text: errors.length > 0 ? "Some sources degraded; check dashboard alerts." : "No critical alerts.",
        tone: errors.length > 0 ? "warning" : "good",
      },
      {
        id: "ops-5",
        text: `${summary.cards.recent_health_reports} health reports updated recently.`,
        tone: "good",
      },
      {
        id: "ops-6",
        text: "AI Assistant operational.",
        tone: "good",
      },
    ];
  }, [data.inventorySummary, errors.length, governanceStatus, summary]);

  const aiInsight = useMemo(() => {
    const topZone = summary.charts.zone_distribution[0];
    const genderTotal = summary.charts.gender_distribution.male + summary.charts.gender_distribution.female;
    const maleShare = percentage(summary.charts.gender_distribution.male, genderTotal);

    return [
      `Population baseline is ${new Intl.NumberFormat("en-PH").format(summary.cards.total_residents)} residents across ${new Intl.NumberFormat("en-PH").format(summary.cards.total_households)} households.`,
      topZone
        ? `${topZone.zone} currently has the largest concentration with ${new Intl.NumberFormat("en-PH").format(topZone.count)} residents.`
        : "Purok distribution data is currently unavailable.",
      `Gender mix is ${maleShare}% male and ${100 - maleShare}% female based on current registry snapshots.`,
      `${summary.cards.pending_document_requests} document requests remain pending; prioritize queue balancing if this rises further.`,
    ];
  }, [summary]);

  const quickActions = useMemo(
    () => [
      { label: "Register Resident", description: "Open resident registration workflows", href: "/residents", icon: UserPlus, tone: "blue" as const, requiresWrite: true },
      { label: "Issue Clearance", description: "Proceed to document request queue", href: "/document-requests", icon: FileCheck2, tone: "emerald" as const, requiresWrite: true },
      { label: "Log Visitor", description: "Use QR or manual visitor tracking", href: "/reports/today-visitors", icon: ScanLine, tone: "amber" as const, requiresWrite: true },
      { label: "Create Household", description: "Add and maintain household records", href: "/households", icon: HomeIcon, tone: "blue" as const, requiresWrite: true },
      { label: "Inventory", description: "Manage assets and inspections", href: "/inventory", icon: Archive, tone: "slate" as const },
      { label: "BHW Report", description: "Open barangay health monitoring", href: "/bhw-reports", icon: HeartPulse, tone: "red" as const },
      { label: "Document Request", description: "Track and process requests", href: "/document-requests", icon: FilePlus2, tone: "emerald" as const },
      { label: "Generate Reports", description: "Access operational reports and exports", href: "/reports", icon: ClipboardList, tone: "amber" as const },
    ],
    [],
  );

  return (
    <ContentContainer>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f2741] via-[#174a72] to-[#1c6a8f] p-6 text-white shadow-[0_18px_42px_rgba(15,23,42,0.24)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Barangay Excellence Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Executive Command Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Barangay Integrated Management System (BIMS) • Community Intelligence • Public Service • Digital Governance
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-blue-100">Current Time</dt>
                <dd className="font-semibold text-white" suppressHydrationWarning>
                  {mounted ? formatTime(now) : "--:--:--"}
                </dd>
              </div>
              <div>
                <dt className="text-blue-100">Last Updated</dt>
                <dd className="font-semibold text-white">{formatDateTime(lastRefreshedAt)}</dd>
              </div>
              <div>
                <dt className="text-blue-100">Online Status</dt>
                <dd className="font-semibold text-white">{onlineStatus}</dd>
              </div>
              <div>
                <dt className="text-blue-100">Environment</dt>
                <dd className="font-semibold text-white">{environment}</dd>
              </div>
              <div>
                <dt className="text-blue-100">Barangay</dt>
                <dd className="font-semibold text-white">{demoPreviewMode ? "Demo Preview Level" : office?.barangay || "Not configured"}</dd>
              </div>
              <div>
                <dt className="text-blue-100">Municipality</dt>
                <dd className="font-semibold text-white">{demoPreviewMode ? "Demo Preview Level" : office?.city_municipality || "Not configured"}</dd>
              </div>
              <div>
                <dt className="text-blue-100">Province</dt>
                <dd className="font-semibold text-white">{demoPreviewMode ? "Demo Preview Level" : office?.province || "Not configured"}</dd>
              </div>
              <div>
                <dt className="text-blue-100">System Version</dt>
                <dd className="font-semibold text-white">{systemVersion}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <PrimaryButton
            onClick={() => {
              setRefreshing(true);
              void loadDashboard("refresh");
            }}
            disabled={refreshing || loading}
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />}
          >
            {refreshing ? "Refreshing..." : "Refresh Live Data"}
          </PrimaryButton>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            {session?.is_authenticated ? `Signed in as ${session.username}` : "Read-only mode"}
          </span>
        </div>
      </section>

      {errors.length > 0 ? <ErrorState message={`Some dashboard sources are unavailable: ${formatErrors(errors)}`} /> : null}

      <section aria-labelledby="community-kpi-title" className="space-y-3">
        <h2 id="community-kpi-title" className="text-xl font-bold tracking-tight text-slate-900">Community KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {communityKpis.map((kpi) => {
            const trend = trendLabel(kpi.value);
            return (
              <DashboardCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                icon={kpi.icon}
                href={kpi.href}
                trendLabel={trend.label}
                trendDirection={trend.direction}
                tone={kpi.tone}
                loading={loading}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="governance-kpi-title" className="space-y-3">
        <h2 id="governance-kpi-title" className="text-xl font-bold tracking-tight text-slate-900">Governance KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {governanceKpis.map((kpi) => {
            const trend = trendLabel(kpi.value);
            return (
              <DashboardCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                icon={kpi.icon}
                href={kpi.href}
                trendLabel={trend.label}
                trendDirection={trend.direction}
                tone={kpi.tone}
                loading={loading}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="health-kpi-title" className="space-y-3">
        <h2 id="health-kpi-title" className="text-xl font-bold tracking-tight text-slate-900">Health KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {healthKpis.map((kpi) => {
            const trend = trendLabel(kpi.value);
            return (
              <DashboardCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                icon={kpi.icon}
                href={kpi.href}
                trendLabel={trend.label}
                trendDirection={trend.direction}
                tone={kpi.tone}
                loading={loading}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="operations-kpi-title" className="space-y-3">
        <h2 id="operations-kpi-title" className="text-xl font-bold tracking-tight text-slate-900">Operations KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {operationsKpis.map((kpi) => {
            const trend = trendLabel(kpi.value);
            return (
              <DashboardCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                icon={kpi.icon}
                href={kpi.href}
                trendLabel={trend.label}
                trendDirection={trend.direction}
                tone={kpi.tone}
                loading={loading}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <SummaryPanel
          title="Today\'s Operational Summary"
          subtitle="Operational Summary"
          items={operationalSummary}
        />

        <SummaryPanel
          title="Barangay Announcements"
          subtitle="Announcements"
          items={ANNOUNCEMENTS}
        />

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">AI Insight Panel</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Automated command briefing</h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {aiInsight.map((sentence, index) => (
              <li key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                {sentence}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Future-ready for OpenAI integration; currently generated from live dashboard metrics.</p>
        </section>

        <SystemInformation
          systemStatus={onlineStatus}
          applicationVersion={`BIMS ${systemVersion}`}
          backendStatus={errors.length === 0 ? "Operational" : "Degraded"}
          frontendStatus="Operational"
          database={environment === "Production" ? "Managed Production Database" : "SQLite (Development)"}
          environment={environment}
          lastRefresh={formatDateTime(lastRefreshedAt)}
          currentTime={mounted ? formatTime(now) : "--:--:--"}
          apiConnectivity={errors.length === 0 ? "Connected" : "Partial connectivity"}
        />
      </section>

      <section aria-labelledby="charts-title" className="space-y-3">
        <h2 id="charts-title" className="text-xl font-bold tracking-tight text-slate-900">Operational Charts</h2>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <ChartCard title="Population by Purok" subtitle="Community Distribution">
            <div className="space-y-2.5">
              {summary.charts.zone_distribution.length === 0 ? (
                <p className="text-sm text-slate-600">No purok distribution data available.</p>
              ) : (
                summary.charts.zone_distribution.map((zone) => (
                  <div key={zone.zone}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                      <span>{zone.zone}</span>
                      <span>{zone.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-700 to-cyan-500" style={{ width: `${zone.percentage}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>

          <ChartCard title="Gender Distribution" subtitle="Population Profile">
            {(() => {
              const male = summary.charts.gender_distribution.male;
              const female = summary.charts.gender_distribution.female;
              const total = male + female;
              const malePct = percentage(male, total);

              return (
                <div className="grid grid-cols-[110px_1fr] items-center gap-4">
                  <div
                    className="mx-auto h-24 w-24 rounded-full"
                    style={{
                      background: `conic-gradient(#1d4ed8 ${malePct}%, #10b981 ${malePct}% 100%)`,
                    }}
                    aria-label={`Gender chart: ${male} male and ${female} female`}
                  />
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="flex items-center justify-between"><span className="font-medium">Male</span><span>{male}</span></p>
                    <p className="flex items-center justify-between"><span className="font-medium">Female</span><span>{female}</span></p>
                    <p className="text-xs text-slate-500">Total: {new Intl.NumberFormat("en-PH").format(total)}</p>
                  </div>
                </div>
              );
            })()}
          </ChartCard>

          <ChartCard title="Age Distribution" subtitle="Demographic Mix">
            {(() => {
              const children = summary.charts.age_distribution.children;
              const adults = summary.charts.age_distribution.adults;
              const seniors = summary.charts.age_distribution.seniors;
              const total = children + adults + seniors;

              return (
                <div className="space-y-2.5">
                  {[
                    { label: "Children", value: children, color: "bg-cyan-500" },
                    { label: "Adults", value: adults, color: "bg-blue-600" },
                    { label: "Seniors", value: seniors, color: "bg-amber-500" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200">
                        <div className={`h-2.5 rounded-full ${row.color}`} style={{ width: `${percentage(row.value, total)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </ChartCard>

          <ChartCard title="Document Status" subtitle="Service Queue">
            <div className="space-y-2.5">
              {documentStatusRows.map((row) => {
                const total = data.documentRequests.length || 1;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div className={`h-2.5 rounded-full ${row.color}`} style={{ width: `${percentage(row.value, total)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Health Monitoring" subtitle="BHW Intelligence">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pregnancy Ongoing</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{new Intl.NumberFormat("en-PH").format(data.bhwSummary?.pregnancy_ongoing_total ?? summary.cards.active_pregnancies)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Due Soon</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{new Intl.NumberFormat("en-PH").format(data.bhwSummary?.pregnancy_due_soon ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Last 30 Days Reports</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{new Intl.NumberFormat("en-PH").format(data.bhwSummary?.health_reports_last_30_days ?? summary.cards.recent_health_reports)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total Health Reports</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{new Intl.NumberFormat("en-PH").format(data.bhwSummary?.health_reports_total ?? 0)}</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Visitor Trend" subtitle="Today by Hour">
            <div className="space-y-2.5">
              {visitorTrendRows.length === 0 ? (
                <p className="text-sm text-slate-600">No visitor logs available for today.</p>
              ) : (
                visitorTrendRows.map((row) => {
                  const max = Math.max(1, ...visitorTrendRows.map((item) => item.value));
                  return (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500" style={{ width: `${percentage(row.value, max)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Recent Activity Mix" subtitle="Cross-Module Signals">
            <div className="space-y-2.5">
              {activityMix.map((row) => {
                const total = activityMix.reduce((sum, item) => sum + item.value, 0) || 1;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div className={`h-2.5 rounded-full ${row.color}`} style={{ width: `${percentage(row.value, total)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <div className="lg:col-span-2">
            <ActivityTimeline title="Recent Activity Feed" subtitle="Operational Timeline" items={recentActivity} loading={loading} />
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-actions-title" className="space-y-3">
        <h2 id="quick-actions-title" className="text-xl font-bold tracking-tight text-slate-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickAction
              key={action.label}
              label={action.label}
              description={action.description}
              href={action.href}
              icon={action.icon}
              tone={action.tone}
              disabled={Boolean(action.requiresWrite && !canWrite)}
            />
          ))}
        </div>
      </section>
    </ContentContainer>
  );
}
