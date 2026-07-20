type BrandBadgeProps = {
  label: string;
  tone?: "neutral" | "success";
};

export function BrandBadge({ label, tone = "neutral" }: BrandBadgeProps) {
  const classes = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}>
      {label}
    </span>
  );
}
