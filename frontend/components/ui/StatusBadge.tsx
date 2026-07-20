import { cn } from "@/lib/cn";

type StatusTone = "default" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const tones: Record<StatusTone, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{label}</span>;
}
