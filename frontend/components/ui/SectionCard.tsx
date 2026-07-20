import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionCardProps = {
  children?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
};

export function SectionCard({ children, title, description, className, actions }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)]", className)}>
      {(title || actions) ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2> : <span />}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {description ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p> : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
