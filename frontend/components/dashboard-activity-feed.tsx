import { Clock3 } from "lucide-react";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  category: "resident" | "household" | "document" | "blotter" | "inventory";
};

type DashboardActivityFeedProps = {
  activities: ActivityItem[];
  loading?: boolean;
};

function categoryTone(category: ActivityItem["category"]) {
  switch (category) {
    case "resident":
      return "bg-blue-100 text-blue-700";
    case "household":
      return "bg-indigo-100 text-indigo-700";
    case "document":
      return "bg-cyan-100 text-cyan-700";
    case "blotter":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-emerald-100 text-emerald-700";
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

export function DashboardActivityFeed({ activities, loading = false }: DashboardActivityFeedProps) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Activity</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Operational timeline</h2>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-[0.9rem] bg-slate-100" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No recent operational activity is available from current API responses.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {activities.slice(0, 8).map((activity) => (
            <li key={activity.id} className="rounded-[1rem] border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{activity.detail}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${categoryTone(activity.category)}`}>
                  {activity.category}
                </span>
              </div>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDateTime(activity.timestamp)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export type { ActivityItem };
