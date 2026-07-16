import Link from "next/link";

import {
  Activity,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  Cake,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  HeartPulse,
  Home as HomeIcon,
  Landmark,
  LayoutDashboard,
  Clock3,
  QrCode,
  Search,
  ShieldAlert,
  Users,
  UserCheck,
  Boxes,
  Bot,
  SearchCheck,
  type LucideIcon,
} from "lucide-react";

import { DashboardClock } from "@/components/dashboard-clock";
import { DashboardResidentsPreview } from "@/components/dashboard-residents-preview";
import {
  getDashboardSummary,
  getResidentsPaginated,
  getSessionInfo,
  type DashboardSummary,
} from "@/lib/api";

type DashboardMetric = {
  label: string;
  value: number;
  subtitle: string;
  trend: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  text: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Residents", href: "/residents", icon: Users },
  { label: "QR Scan", href: "/residents/scan/input", icon: QrCode },
  { label: "Quick Gender", href: "/residents/quick-gender-correction", icon: SearchCheck },
  { label: "Quick Birthday", href: "/residents/quick-birthday-correction", icon: Cake },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Households", href: "/households", icon: HomeIcon },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Document Requests", href: "/document-requests", icon: ClipboardList },
  { label: "Track Requests", href: "/track-request", icon: SearchCheck },
  { label: "Blotter", href: "/blotter", icon: ShieldAlert },
  { label: "AI Assistant", href: "/assistant", icon: Bot },
  { label: "BHW Reports", href: "/bhw-reports", icon: HeartPulse },
  { label: "Resident Portal", href: "/resident-portal", icon: Landmark },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "QR Scan",
    href: "/residents/scan/input",
    icon: QrCode,
    accent: "from-blue-600 to-sky-500",
    description: "Open the resident QR workflow",
  },
  {
    label: "Birthday",
    href: "/residents/quick-birthday-correction",
    icon: Cake,
    accent: "from-indigo-600 to-violet-500",
    description: "Fix date-of-birth records fast",
  },
  {
    label: "Document Requests",
    href: "/document-requests",
    icon: ClipboardList,
    accent: "from-cyan-600 to-blue-500",
    description: "Review requests and release queue",
  },
  {
    label: "Blotter",
    href: "/blotter",
    icon: ShieldAlert,
    accent: "from-rose-600 to-red-500",
    description: "Open incident and complaint records",
  },
  {
    label: "BHW Reports",
    href: "/bhw-reports",
    icon: HeartPulse,
    accent: "from-emerald-600 to-teal-500",
    description: "Health and community reporting",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    accent: "from-amber-600 to-orange-500",
    description: "Manage government assets",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function getDisplayName(session: Awaited<ReturnType<typeof getSessionInfo>> | null) {
  if (!session) {
    return "Barangay Officer";
  }

  return session.full_name || session.username || "Barangay Officer";
}

function createEmptySummary(): DashboardSummary {
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
      gender_distribution: {
        male: 0,
        female: 0,
      },
      age_distribution: {
        children: 0,
        adults: 0,
        seniors: 0,
      },
      zone_distribution: [],
    },
  };
}

export default async function Home() {
  const [summaryResult, residentsResult, sessionResult] = await Promise.allSettled([
    getDashboardSummary(),
    getResidentsPaginated({ page: 1, page_size: 20, ordering: "last_name" }),
    getSessionInfo(),
  ]);

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : createEmptySummary();
  const previewResidents = residentsResult.status === "fulfilled" ? residentsResult.value.results : [];
  const session = sessionResult.status === "fulfilled" ? sessionResult.value : null;

  const genderTotal = summary.charts.gender_distribution.male + summary.charts.gender_distribution.female;
  const malePct = genderTotal ? Math.round((summary.charts.gender_distribution.male / genderTotal) * 100) : 0;
  const femalePct = genderTotal ? Math.round((summary.charts.gender_distribution.female / genderTotal) * 100) : 0;

  const ageDistribution = summary.charts.age_distribution;
  const ageTotal = Math.max(ageDistribution.children + ageDistribution.adults + ageDistribution.seniors, 1);
  const zoneMax = Math.max(...summary.charts.zone_distribution.map((zone) => zone.count), 1);

  const metrics: DashboardMetric[] = [
    {
      label: "Total Residents",
      value: summary.cards.total_residents,
      subtitle: "Registered community members",
      trend: "Live",
      icon: Users,
      accent: "from-blue-600 to-sky-500",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    {
      label: "Total Households",
      value: summary.cards.total_households,
      subtitle: "Active barangay households",
      trend: "Stable",
      icon: HomeIcon,
      accent: "from-indigo-600 to-violet-500",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
    },
    {
      label: "Senior Citizens",
      value: summary.cards.senior_citizens,
      subtitle: "Age 60 and above",
      trend: "Priority",
      icon: HeartPulse,
      accent: "from-emerald-600 to-teal-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
    },
    {
      label: "4Ps Beneficiaries",
      value: summary.cards.fourps_beneficiaries,
      subtitle: "Registered social protection records",
      trend: "Updated",
      icon: BadgeDollarSign,
      accent: "from-amber-600 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    {
      label: "Ready Today",
      value: summary.cards.ready_today_count,
      subtitle: "Prepared for release or pickup",
      trend: "Today",
      icon: ClipboardCheck,
      accent: "from-cyan-600 to-blue-500",
      bg: "bg-cyan-50",
      text: "text-cyan-700",
    },
    {
      label: "Documents Ready",
      value: summary.cards.currently_ready_count,
      subtitle: "Queued and ready to release",
      trend: "Active",
      icon: FileCheck2,
      accent: "from-sky-600 to-blue-500",
      bg: "bg-sky-50",
      text: "text-sky-700",
    },
    {
      label: "Visitors Today",
      value: summary.cards.visitors_today_count,
      subtitle: "QR-logged resident visits",
      trend: "Real-time",
      icon: UserCheck,
      accent: "from-violet-600 to-fuchsia-500",
      bg: "bg-violet-50",
      text: "text-violet-700",
    },
    {
      label: "Pending Requests",
      value: summary.cards.pending_document_requests,
      subtitle: "For action and processing",
      trend: "Needs review",
      icon: Clock3,
      accent: "from-rose-600 to-red-500",
      bg: "bg-rose-50",
      text: "text-rose-700",
    },
  ];

  const hasLoadWarning =
    summaryResult.status === "rejected" ||
    residentsResult.status === "rejected" ||
    sessionResult.status === "rejected";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Barangay Logo
                </p>
                <h1 className="text-lg font-bold text-slate-900">BIMS</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Developed by TheSoftWorks. All Rights Reserved
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Barangay Information Management System
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/";
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-sky-500 p-4 text-white shadow-lg shadow-blue-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                System Mode
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50">
                Government-grade dashboard for daily barangay operations, service desk
                coordination, and resident intelligence.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Dashboard
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                    Barangay Intelligence Management System
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                    <span>
                      Current date and time: <DashboardClock />
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:min-w-[620px] lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Search residents, requests, reports..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />
                    </button>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                          {getDisplayName(session)
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {getDisplayName(session)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                              {session?.is_authenticated && session.is_staff
                                ? "Staff Role"
                                : session?.is_authenticated
                                  ? "Read Only"
                                  : "Guest"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {NAV_ITEMS.map((item) => {
                  const active = item.href === "/";
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                        active
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <div className="flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
            {hasLoadWarning && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                Some dashboard data sources are still loading or temporarily unavailable. Core
                page structure is ready, and the dashboard will refresh once data returns.
              </section>
            )}

            <section className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-xl shadow-blue-200/60 sm:p-8 xl:p-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.34),_transparent_40%)]" />
              <div className="pointer-events-none absolute -right-10 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-14 bottom-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] xl:items-center">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/20 bg-white/15 backdrop-blur-md">
                      <Landmark className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
                        Welcome back, {getDisplayName(session)}
                      </p>
                      <h3 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                        Barangay Excellence Dashboard
                      </h3>
                    </div>
                  </div>

                  <div className="max-w-3xl space-y-3">
                    <p className="text-lg text-blue-50">
                      Community Intelligence Overview for residents, households, front desk
                      services, documents, and barangay operations.
                    </p>
                    <p className="text-sm leading-6 text-blue-50/90">
                      Designed for barangay hall workflows with clean decision-making surfaces,
                      live operational counts, and fast access to frontline actions.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/residents"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
                    >
                      Open Residents
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/document-requests"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
                    >
                      Open Document Queue
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-[2rem] border border-white/20 bg-white/15 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-blue-100">Barangay Hall</p>
                        <div className="mt-4 flex items-end gap-2">
                          <div className="h-16 w-8 rounded-t-full bg-white/80" />
                          <div className="h-24 w-8 rounded-t-full bg-white/90" />
                          <div className="h-20 w-8 rounded-t-full bg-white/80" />
                          <div className="h-28 w-8 rounded-t-full bg-white/95" />
                          <div className="h-18 w-8 rounded-t-full bg-white/75" />
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-950/20 p-3">
                          <p className="text-xs text-blue-100">Community Operations</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            Secure, coordinated, and ready for daily service delivery.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-white/15 bg-slate-950/15 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Live Overview</p>
                          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-50">
                            Connected
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-blue-100">
                              <span>Residents</span>
                              <span>{summary.cards.total_residents}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/15">
                              <div className="h-2 w-[82%] rounded-full bg-white" />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-blue-100">
                              <span>Documents Ready</span>
                              <span>{summary.cards.currently_ready_count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/15">
                              <div className="h-2 w-[62%] rounded-full bg-cyan-200" />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-blue-100">
                              <span>Visitors Today</span>
                              <span>{summary.cards.visitors_today_count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/15">
                              <div className="h-2 w-[44%] rounded-full bg-emerald-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article
                    key={metric.label}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${metric.bg} ${metric.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <Activity className="h-3.5 w-3.5 text-slate-500" />
                        {metric.trend}
                      </span>
                    </div>

                    <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${metric.accent}`} />
                    <p className="mt-4 text-sm font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                      {formatNumber(metric.value)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{metric.subtitle}</p>
                  </article>
                );
              })}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Gender Distribution
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Doughnut chart</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Residents overview
                  </span>
                </div>

                <div className="mt-6 flex justify-center">
                  <div
                    className="relative flex h-64 w-64 items-center justify-center rounded-full shadow-inner shadow-slate-200"
                    style={{
                      background: `conic-gradient(#2563eb 0 ${malePct}%, #ec4899 ${malePct}% 100%)`,
                    }}
                  >
                    <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Total
                      </p>
                      <p className="text-4xl font-bold text-slate-900">{genderTotal}</p>
                      <p className="mt-1 text-sm text-slate-500">community residents</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-600">Male</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      {summary.charts.gender_distribution.male}
                    </p>
                    <p className="text-xs text-slate-500">{malePct}% of population</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-600">Female</p>
                    <p className="mt-1 text-2xl font-bold text-rose-700">
                      {summary.charts.gender_distribution.female}
                    </p>
                    <p className="text-xs text-slate-500">{femalePct}% of population</p>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Age Distribution
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Doughnut chart</h3>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Population mix
                  </span>
                </div>

                <div className="mt-6 flex justify-center">
                  <div
                    className="relative flex h-64 w-64 items-center justify-center rounded-full shadow-inner shadow-slate-200"
                    style={{
                      background: `conic-gradient(#0ea5e9 0 ${Math.round((ageDistribution.children / ageTotal) * 100)}%, #10b981 ${Math.round((ageDistribution.children / ageTotal) * 100)}% ${Math.round(((ageDistribution.children + ageDistribution.adults) / ageTotal) * 100)}%, #f59e0b ${Math.round(((ageDistribution.children + ageDistribution.adults) / ageTotal) * 100)}% 100%)`,
                    }}
                  >
                    <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Total
                      </p>
                      <p className="text-4xl font-bold text-slate-900">{ageTotal}</p>
                      <p className="mt-1 text-sm text-slate-500">age segments</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      label: "Children (0-17)",
                      value: ageDistribution.children,
                      tone: "bg-sky-500",
                    },
                    {
                      label: "Adults (18-59)",
                      value: ageDistribution.adults,
                      tone: "bg-emerald-500",
                    },
                    {
                      label: "Seniors (60+)",
                      value: ageDistribution.seniors,
                      tone: "bg-amber-500",
                    },
                  ].map((row) => {
                    const width = Math.round((row.value / ageTotal) * 100);

                    return (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.label}</span>
                          <span className="text-slate-500">{row.value}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div className={`h-2.5 rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Population by Purok
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Horizontal progress bars</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {summary.charts.zone_distribution.length} zones
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {summary.charts.zone_distribution.map((zone, index) => {
                    const width = Math.max(Math.round((zone.count / zoneMax) * 100), zone.percentage);
                    const tones = ["bg-blue-600", "bg-sky-500", "bg-cyan-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                    const tone = tones[index % tones.length];

                    return (
                      <div key={zone.zone}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-700">{zone.zone}</span>
                          <span className="text-slate-500">
                            {zone.count} residents · {zone.percentage}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div className={`h-3 rounded-full ${tone} shadow-sm`} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <DashboardResidentsPreview residents={previewResidents} />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Quick Actions
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">
                    Frontline operational shortcuts
                  </h3>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Fast access cards for the work that typically happens at the barangay desk.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} text-white shadow-lg`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
                      </div>

                      <h4 className="mt-4 text-lg font-bold text-slate-900">{action.label}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <footer className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/50">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    System Status
                  </p>
                  <p className="mt-2 text-lg font-bold text-emerald-300">Operational</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Current Time
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-100">
                    <DashboardClock />
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Database Status
                  </p>
                  <p className="mt-2 text-lg font-bold text-sky-300">Connected</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    API Status
                  </p>
                  <p className="mt-2 text-lg font-bold text-cyan-300">Healthy</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Version Number
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">v2.0.0</p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
