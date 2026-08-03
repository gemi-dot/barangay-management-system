import { cn } from "@/lib/cn";

type SidebarStat = {
  label: string;
  value: string;
  note?: string;
};

type StatisticsSidebarProps = {
  title: string;
  stats: SidebarStat[];
  className?: string;
  statsContainerClassName?: string;
  statCardClassName?: string;
};

export function StatisticsSidebar({ title, stats, className, statsContainerClassName, statCardClassName }: StatisticsSidebarProps) {
  return (
    <aside className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm", className)}>
      <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <div className={cn("mt-4 space-y-3", statsContainerClassName)}>
        {stats.map((stat) => (
          <article key={stat.label} className={cn("rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5", statCardClassName)}>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stat.value}</p>
            {stat.note ? <p className="mt-1 text-xs text-slate-600">{stat.note}</p> : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

export type { SidebarStat };
