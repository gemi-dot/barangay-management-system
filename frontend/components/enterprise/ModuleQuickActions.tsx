import { type LucideIcon } from "lucide-react";

import { QuickAction } from "@/components/executive/QuickAction";

type ModuleQuickActionItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "amber" | "slate";
  disabled?: boolean;
};

type ModuleQuickActionsProps = {
  title?: string;
  actions: ModuleQuickActionItem[];
};

export function ModuleQuickActions({ title = "Quick Actions", actions }: ModuleQuickActionsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <QuickAction
            key={action.label}
            label={action.label}
            description={action.description}
            href={action.href}
            icon={action.icon}
            tone={action.tone}
            disabled={action.disabled}
          />
        ))}
      </div>
    </section>
  );
}
