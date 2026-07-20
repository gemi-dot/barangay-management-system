import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type SummaryItem = {
  id: string;
  text: string;
  tone: "good" | "warning" | "neutral";
};

type SummaryPanelProps = {
  title: string;
  subtitle: string;
  items: SummaryItem[];
};

function toneStyle(tone: SummaryItem["tone"]) {
  switch (tone) {
    case "good":
      return {
        wrap: "border-emerald-200 bg-emerald-50",
        text: "text-emerald-900",
        Icon: CheckCircle2,
      };
    case "warning":
      return {
        wrap: "border-amber-200 bg-amber-50",
        text: "text-amber-900",
        Icon: AlertCircle,
      };
    default:
      return {
        wrap: "border-slate-200 bg-slate-50",
        text: "text-slate-800",
        Icon: Info,
      };
  }
}

export function SummaryPanel({ title, subtitle, items }: SummaryPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{subtitle}</p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const style = toneStyle(item.tone);
          const Icon = style.Icon;

          return (
            <article key={item.id} className={`rounded-xl border px-3 py-2.5 ${style.wrap}`}>
              <p className={`inline-flex items-start gap-2 text-sm ${style.text}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.text}</span>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export type { SummaryItem };
