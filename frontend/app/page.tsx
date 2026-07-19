"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BellRing,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  HeartPulse,
  Home as HomeIcon,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { DashboardActivityFeed, type ActivityItem } from "@/components/dashboard-activity-feed";
import { DashboardAttentionPanel, type AttentionItem } from "@/components/dashboard-attention-panel";
import { DashboardClock } from "@/components/dashboard-clock";
import { DashboardCommunityAnalytics } from "@/components/dashboard-community-analytics";
import { DashboardDocumentQueue } from "@/components/dashboard-document-queue";
import { DashboardKpiCard } from "@/components/dashboard-kpi-card";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { DashboardResidentsPreview } from "@/components/dashboard-residents-preview";
import { useSessionAuth } from "@/components/session-context";
import {
  getDashboardSummary,
  getInventoryAssets,
  getInventorySummary,
  getResidentsPaginated,
  getStaffDocumentRequests,
  getTodayVisitorsReport,
  type DashboardSummary,
  type InventoryAsset,
  type InventorySummary,
  type ResidentListItem,
  type StaffDocumentRequest,
  type TodayVisitorsReport,
} from "@/lib/api";

const NOTICE_PLACEHOLDER = {
  title: "Notice board placeholder",
  body: "This card currently uses a local placeholder configuration. Connect an announcements endpoint when available.",
};

type DashboardData = {
  summary: DashboardSummary | null;
  residents: ResidentListItem[];
  documentRequests: StaffDocumentRequest[];
  visitorsReport: TodayVisitorsReport | null;
  inventorySummary: InventorySummary | null;
  inventoryAssets: InventoryAsset[];
};

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

export default function Home() {
  const { canWrite, session } = useSessionAuth();

  const [data, setData] = useState<DashboardData>({
    summary: null,
    residents: [],
    documentRequests: [],
    visitorsReport: null,
    inventorySummary: null,
    inventoryAssets: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh") => {
      const nextErrors: string[] = [];

      const [summaryResult, residentsResult, queueResult, visitorsResult, inventorySummaryResult, inventoryAssetsResult] =
        await Promise.allSettled([
          getDashboardSummary(),
          getResidentsPaginated({ page: 1, page_size: 12, ordering: "-last_name" }),
          canWrite ? getStaffDocumentRequests({ page: 1, page_size: 5 }) : Promise.resolve({ results: [] as StaffDocumentRequest[] }),
          canWrite ? getTodayVisitorsReport() : Promise.resolve(null),
          canWrite ? getInventorySummary() : Promise.resolve(null),
          canWrite ? getInventoryAssets({ page: 1, page_size: 8 }) : Promise.resolve({ results: [] as InventoryAsset[] }),
        ]);

      if (summaryResult.status === "rejected") {
        nextErrors.push(summaryResult.reason instanceof Error ? summaryResult.reason.message : "Dashboard summary could not be loaded.");
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

      setData({
        summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
        residents: residentsResult.status === "fulfilled" ? residentsResult.value.results : [],
        documentRequests: queueResult.status === "fulfilled" ? queueResult.value.results : [],
        visitorsReport: visitorsResult.status === "fulfilled" ? visitorsResult.value : null,
        inventorySummary: inventorySummaryResult.status === "fulfilled" ? inventorySummaryResult.value : null,
        inventoryAssets: inventoryAssetsResult.status === "fulfilled" ? inventoryAssetsResult.value.results : [],
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

  const kpis = useMemo(
    () => [
      { label: "Pending Document Requests", value: summary.cards.pending_document_requests, description: "Waiting for review or processing", href: "/document-requests", icon: ClipboardList, accent: "from-rose-600 to-red-500" },
      { label: "Documents Ready Today", value: summary.cards.ready_today_count, description: "Ready for pickup today", href: "/document-requests", icon: ClipboardCheck, accent: "from-cyan-600 to-blue-500" },
      { label: "Active Blotter Cases", value: null, description: "Unavailable until blotter API feed is exposed", href: "/blotter", icon: ShieldAlert, accent: "from-slate-500 to-slate-600" },
      { label: "Visitors Today", value: summary.cards.visitors_today_count, description: "QR-logged resident visits", href: "/reports/today-visitors", icon: ScanLine, accent: "from-violet-600 to-fuchsia-500" },
      { label: "Total Residents", value: summary.cards.total_residents, description: "Registered community members", href: "/residents", icon: Users, accent: "from-blue-600 to-sky-500" },
      { label: "Total Households", value: summary.cards.total_households, description: "Active households by purok", href: "/households", icon: HomeIcon, accent: "from-indigo-600 to-violet-500" },
      { label: "Senior Citizens", value: summary.cards.senior_citizens, description: "Residents aged 60 and above", href: "/reports/senior-citizens", icon: HeartPulse, accent: "from-emerald-600 to-teal-500" },
      { label: "4Ps Beneficiaries", value: summary.cards.fourps_beneficiaries, description: "Social support records", href: "/reports/fourps", icon: BadgeDollarSign, accent: "from-amber-600 to-orange-500" },
    ],
    [summary],
  );

  const quickActions = useMemo(
    () => [
      { label: "Add Resident", href: "/residents", description: "Open resident registry and create form", icon: UserPlus, accentClassName: "from-blue-600 to-sky-500", requiresWrite: true },
      { label: "Scan Resident QR", href: "/residents/scan/test", description: "Resolve resident QR code", icon: QrCode, accentClassName: "from-sky-600 to-cyan-500" },
      { label: "Create Document Request", href: "/document-requests", description: "Open request queue", icon: FilePlus2, accentClassName: "from-indigo-600 to-blue-500", requiresWrite: true },
      { label: "Track Request", href: "/track-request", description: "Track by request number", icon: BellRing, accentClassName: "from-cyan-600 to-blue-500" },
      { label: "Add Household", href: "/households", description: "Open household module", icon: HomeIcon, accentClassName: "from-emerald-600 to-teal-500", requiresWrite: true },
      { label: "Record Blotter", href: "/blotter", description: "Open blotter intake module", icon: ShieldAlert, accentClassName: "from-rose-600 to-red-500", requiresWrite: true },
      { label: "Open Reports", href: "/reports", description: "Go to analytics and reports", icon: ClipboardList, accentClassName: "from-amber-600 to-orange-500" },
      { label: "Open AI Assistant", href: "/assistant", description: "Ask operational questions", icon: Sparkles, accentClassName: "from-violet-600 to-indigo-500" },
    ],
    [],
  );

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    data.documentRequests.slice(0, 4).forEach((request) => {
      items.push({
        id: `doc-${request.id}`,
        title: `${request.status_display}: ${request.document_type_display}`,
        detail: `${request.full_name} • ${request.tracking_number}`,
        timestamp: request.updated_at || request.created_at,
        category: "document",
      });
    });

    data.visitorsReport?.results.slice(0, 3).forEach((visitor) => {
      items.push({
        id: `visit-${visitor.resident_id}-${visitor.logged_at}`,
        title: "Resident visit logged",
        detail: `${visitor.full_name} • ${visitor.zone || "Barangay"}`,
        timestamp: visitor.logged_at,
        category: "resident",
      });
    });

    data.inventoryAssets
      .filter((asset) => Boolean(asset.date_acquired))
      .slice(0, 2)
      .forEach((asset) => {
        items.push({
          id: `inv-${asset.id}`,
          title: "Inventory asset recorded",
          detail: `${asset.property_number} • ${asset.description}`,
          timestamp: String(asset.date_acquired),
          category: "inventory",
        });
      });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data.documentRequests, data.inventoryAssets, data.visitorsReport?.results]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const rows: AttentionItem[] = [];

    rows.push({
      id: "pending-docs",
      label: "Pending document requests",
      value: summary.cards.pending_document_requests,
      description: "Requests waiting for assessment and processing.",
      href: "/document-requests",
      tone: "amber",
    });

    if (data.inventorySummary) {
      rows.push({
        id: "inventory-risk",
        label: "Inventory risk items",
        value: data.inventorySummary.under_repair_assets + data.inventorySummary.lost_assets,
        description: "Assets under repair or tagged as lost.",
        href: "/inventory",
        tone: "blue",
      });
    }

    rows.push({
      id: "senior-support",
      label: "Senior assistance monitoring",
      value: summary.cards.senior_citizens,
      description: "Senior records to prioritize for LGU support workflows.",
      href: "/reports/senior-citizens",
      tone: "emerald",
    });

    return rows;
  }, [data.inventorySummary, summary.cards.pending_document_requests, summary.cards.senior_citizens]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] text-slate-900">
      <div className="mx-auto min-h-screen max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[1.3rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Barangay Excellence Dashboard</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Practical operations command center for residents, frontline service queues, and barangay action tracking.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                BIMS is developed by TheSoftWorks. All rights reserved.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Current time: <DashboardClock /></span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Last refresh: {formatDateTime(lastRefreshedAt)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void loadDashboard("refresh");
              }}
              disabled={refreshing || loading}
              aria-label="Refresh dashboard data"
              className="inline-flex items-center justify-center gap-2 self-start rounded-[1rem] border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errors.length > 0 && (
          <section className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Some dashboard sources are unavailable:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <DashboardKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              description={kpi.description}
              href={kpi.href}
              icon={kpi.icon}
              loading={loading}
              accentClassName={kpi.accent}
              unavailableReason={kpi.label === "Active Blotter Cases" ? "No blotter metrics endpoint is currently available." : undefined}
            />
          ))}
        </section>

        <DashboardQuickActions actions={quickActions} canWrite={canWrite} />

        <DashboardDocumentQueue requests={data.documentRequests} loading={loading} canWrite={canWrite} />

        <DashboardAttentionPanel items={attentionItems} loading={loading} />

        <section className="grid gap-4 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DashboardCommunityAnalytics
              male={summary.charts.gender_distribution.male}
              female={summary.charts.gender_distribution.female}
              childrenCount={summary.charts.age_distribution.children}
              adults={summary.charts.age_distribution.adults}
              seniors={summary.charts.age_distribution.seniors}
              zones={summary.charts.zone_distribution}
              fourPsBeneficiaries={summary.cards.fourps_beneficiaries}
              seniorCitizens={summary.cards.senior_citizens}
            />
          </div>
          <div className="xl:col-span-2">
            <DashboardActivityFeed activities={activityItems} loading={loading} />
          </div>
        </section>

        <DashboardResidentsPreview
          residents={data.residents}
          loading={loading}
          error={errors.find((message) => message.toLowerCase().includes("resident")) ?? null}
        />

        <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Barangay Notice</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{NOTICE_PLACEHOLDER.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{NOTICE_PLACEHOLDER.body}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">
            Placeholder mode: this content is local-only and separate from live operational metrics.
          </p>
        </section>

        <footer className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Signed in as {session?.full_name || session?.username || "Guest"}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
