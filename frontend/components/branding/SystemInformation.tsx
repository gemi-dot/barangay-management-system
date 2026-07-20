import { Activity, Clock3, Database, Globe, RefreshCw, Server, ShieldCheck, Wifi } from "lucide-react";

type SystemInformationProps = {
  systemStatus: string;
  applicationVersion: string;
  backendStatus: string;
  frontendStatus: string;
  database: string;
  environment: string;
  lastRefresh: string;
  currentTime: string;
  apiConnectivity: string;
};

type InfoItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function SystemInformation({
  systemStatus,
  applicationVersion,
  backendStatus,
  frontendStatus,
  database,
  environment,
  lastRefresh,
  currentTime,
  apiConnectivity,
}: SystemInformationProps) {
  const rows: InfoItem[] = [
    { label: "System Status", value: systemStatus, icon: Activity },
    { label: "Application Version", value: applicationVersion, icon: ShieldCheck },
    { label: "Backend Status", value: backendStatus, icon: Server },
    { label: "Frontend Status", value: frontendStatus, icon: Globe },
    { label: "Database", value: database, icon: Database },
    { label: "Environment", value: environment, icon: ShieldCheck },
    { label: "Last Refresh", value: lastRefresh, icon: RefreshCw },
    { label: "Current Time", value: currentTime, icon: Clock3 },
    { label: "API Connectivity", value: apiConnectivity, icon: Wifi },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm" aria-label="System information">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">System Information</p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Platform Monitoring</h3>

      <div className="mt-4 space-y-2.5">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <article key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {row.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{row.value}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
