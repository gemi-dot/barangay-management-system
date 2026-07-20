import { type ReactNode } from "react";

type ExecutivePageHeaderProps = {
  title: string;
  subtitle: string;
  description: string;
  badges?: ReactNode;
  actions?: ReactNode;
};

export function ExecutivePageHeader({
  title,
  subtitle,
  description,
  badges,
  actions,
}: ExecutivePageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f2741] via-[#1b4f76] to-[#22769c] p-6 text-white shadow-[0_16px_34px_rgba(15,23,42,0.24)] sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">{subtitle}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">{description}</p>
          {badges ? <div className="mt-4 flex flex-wrap gap-2">{badges}</div> : null}
        </div>

        {actions ? <div className="relative flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
