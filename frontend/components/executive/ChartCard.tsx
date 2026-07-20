import { type ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function ChartCard({ title, subtitle, children, rightSlot }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{subtitle}</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
