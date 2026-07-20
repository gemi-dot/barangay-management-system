import type { LucideIcon } from "lucide-react";

import { SectionCard } from "@/components/ui/SectionCard";

type StatCardProps = {
  label: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <SectionCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
        {Icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[var(--color-primary)]">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{value}</p>
      {description ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p> : null}
    </SectionCard>
  );
}
