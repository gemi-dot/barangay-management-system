import Link from "next/link";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

type DashboardCardProps = {
  title: string;
  value: number | null;
  description: string;
  icon: LucideIcon;
  href?: string;
  trendLabel: string;
  trendDirection?: "up" | "down" | "flat";
  tone?: "blue" | "emerald" | "amber" | "slate" | "red";
  loading?: boolean;
};

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-PH").format(value);
}

function toneClasses(tone: DashboardCardProps["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        gradientStart: "from-emerald-700",
        gradientEnd: "to-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50",
      };
    case "amber":
      return {
        gradientStart: "from-amber-700",
        gradientEnd: "to-orange-500",
        text: "text-amber-700",
        bg: "bg-amber-50",
      };
    case "red":
      return {
        gradientStart: "from-rose-700",
        gradientEnd: "to-red-500",
        text: "text-rose-700",
        bg: "bg-rose-50",
      };
    case "slate":
      return {
        gradientStart: "from-slate-700",
        gradientEnd: "to-slate-500",
        text: "text-slate-700",
        bg: "bg-slate-100",
      };
    default:
      return {
        gradientStart: "from-blue-700",
        gradientEnd: "to-cyan-500",
        text: "text-blue-700",
        bg: "bg-blue-50",
      };
  }
}

function TrendIcon({ direction }: { direction: DashboardCardProps["trendDirection"] }) {
  if (direction === "up") {
    return <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (direction === "down") {
    return <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden="true" />;
}

function CardBody({
  title,
  value,
  description,
  icon: Icon,
  trendLabel,
  trendDirection = "flat",
  tone = "blue",
  loading = false,
}: Omit<DashboardCardProps, "href">) {
  if (loading) {
    return (
      <article className="min-h-[176px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-8 w-28 rounded bg-slate-100" />
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
      </article>
    );
  }

  const tones = toneClasses(tone);

  return (
    <article className="group min-h-[176px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones.bg} ${tones.text}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
          <TrendIcon direction={trendDirection} />
          {trendLabel}
        </span>
      </div>

      <div className={`mt-4 h-1.5 rounded-full bg-gradient-to-r ${tones.gradientStart} ${tones.gradientEnd}`} />
      <p className="mt-4 text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{formatNumber(value)}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </article>
  );
}

export function DashboardCard(props: DashboardCardProps) {
  if (!props.href) {
    return <CardBody {...props} />;
  }

  return (
    <Link href={props.href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
      <CardBody {...props} />
    </Link>
  );
}
