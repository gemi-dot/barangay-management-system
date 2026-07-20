import { Clock3 } from "lucide-react";

type ActivityTimelineItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  category: "resident" | "household" | "document" | "inventory" | "health";
};

type ActivityTimelineProps = {
  title: string;
  subtitle: string;
  items: ActivityTimelineItem[];
  loading?: boolean;
};

function categoryTone(category: ActivityTimelineItem["category"]) {
  switch (category) {
    case "document":
      return "bg-amber-100 text-amber-800";
    case "health":
      return "bg-rose-100 text-rose-800";
    case "inventory":
      return "bg-emerald-100 text-emerald-800";
    case "household":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ActivityTimeline({ title, subtitle, items, loading = false }: ActivityTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{subtitle}</p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h3>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No recent activity from available operational endpoints.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.slice(0, 8).map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${categoryTone(item.category)}`}>
                  {item.category}
                </span>
              </div>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDateTime(item.timestamp)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export type { ActivityTimelineItem };
