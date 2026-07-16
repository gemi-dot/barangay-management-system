import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type QuickActionItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  requiresWrite?: boolean;
};

type DashboardQuickActionsProps = {
  actions: QuickActionItem[];
  canWrite: boolean;
};

export function DashboardQuickActions({ actions, canWrite }: DashboardQuickActionsProps) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Actions</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Barangay frontline tasks</h2>
        </div>
        {!canWrite && (
          <p className="text-xs font-medium text-amber-700">
            Some actions require staff privileges.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const disabled = Boolean(action.requiresWrite && !canWrite);

          if (disabled) {
            return (
              <div
                key={action.label}
                className="min-h-[148px] rounded-[1.1rem] border border-slate-200 bg-slate-100/70 p-4 opacity-65"
                aria-disabled="true"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${action.accentClassName} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-800">{action.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">Staff access required</p>
              </div>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group min-h-[148px] rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${action.accentClassName} text-white shadow-lg shadow-blue-200/30`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{action.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{action.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
