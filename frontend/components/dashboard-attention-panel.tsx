import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type AttentionItem = {
  id: string;
  label: string;
  value: number;
  description: string;
  href: string;
  tone: "amber" | "blue" | "emerald";
};

type DashboardAttentionPanelProps = {
  items: AttentionItem[];
  loading?: boolean;
};

function toneClassName(tone: AttentionItem["tone"]) {
  switch (tone) {
    case "amber":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "blue":
      return "bg-blue-50 text-blue-800 border-blue-200";
    default:
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
}

export function DashboardAttentionPanel({ items, loading = false }: DashboardAttentionPanelProps) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-end gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-amber-50 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attention Required</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Items needing staff action</h2>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-[0.9rem] bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No attention flags are available from current operational endpoints.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3 transition duration-200 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClassName(item.tone)}`}>
                  {item.value}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export type { AttentionItem };
