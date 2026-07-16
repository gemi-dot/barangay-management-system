import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type DashboardKpiCardProps = {
  label: string;
  value: number | null;
  description: string;
  href: string;
  icon: LucideIcon;
  loading?: boolean;
  accentClassName?: string;
  unavailableReason?: string;
};

function formatMetricValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-PH").format(value);
}

export function DashboardKpiCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  loading = false,
  accentClassName = "from-blue-600 to-sky-500",
  unavailableReason,
}: DashboardKpiCardProps) {
  if (loading) {
    return (
      <article className="min-h-[188px] rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-[1rem] bg-slate-100" />
            <div className="h-4 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="h-2 rounded-full bg-slate-100" />
          <div className="h-4 w-28 rounded bg-slate-100" />
          <div className="h-9 w-24 rounded bg-slate-100" />
          <div className="h-3 w-full rounded bg-slate-100" />
        </div>
      </article>
    );
  }

  const isUnavailable = value === null;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-50 text-blue-700 ring-1 ring-slate-200/70">
          <Icon className="h-5 w-5" />
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          {isUnavailable ? "Unavailable" : "Live"}
        </span>
      </div>

      <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${accentClassName}`} />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{formatMetricValue(value)}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {isUnavailable && unavailableReason ? unavailableReason : description}
      </p>
    </>
  );

  if (isUnavailable) {
    return (
      <article className="min-h-[188px] rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={href}
      className="group block min-h-[188px] rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      {content}
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
        View details
        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
