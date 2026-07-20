import { Circle } from "lucide-react";

import { BrandBadge } from "@/components/branding/BrandBadge";
import { BRAND } from "@/lib/brand";

type PoweredByProps = {
  compact?: boolean;
};

export function PoweredBy({ compact = false }: PoweredByProps) {
  if (compact) {
    return (
      <section className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-blue-100/90" aria-label="Powered by SoftWorks">
        <p className="text-[10px] uppercase tracking-[0.18em]">Powered by</p>
        <p className="mt-1 text-xs font-semibold">SoftWorks</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-3 text-blue-100/85" aria-label="Powered by SoftWorks Community Solutions">
      <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/70">Powered by</p>
      <p className="mt-1 text-xs font-semibold text-white">{BRAND.company}</p>
      <p className="mt-1 text-[11px] leading-4 text-blue-100/75">
        Code That Cares.
        <br />
        Technology That Serves Communities.
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <BrandBadge label={BRAND.releaseLabel} />
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
          <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
          System Online
        </span>
      </div>
    </section>
  );
}
