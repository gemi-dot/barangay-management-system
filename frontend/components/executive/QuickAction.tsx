import Link from "next/link";
import { ArrowUpRight, Lock, type LucideIcon } from "lucide-react";

type QuickActionProps = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  tone?: "blue" | "emerald" | "amber" | "slate";
};

function toneClass(tone: QuickActionProps["tone"]) {
  switch (tone) {
    case "emerald":
      return "from-emerald-700 to-emerald-500";
    case "amber":
      return "from-amber-600 to-orange-500";
    case "slate":
      return "from-slate-700 to-slate-500";
    default:
      return "from-blue-700 to-cyan-500";
  }
}

export function QuickAction({
  label,
  description,
  href,
  icon: Icon,
  disabled = false,
  tone = "blue",
}: QuickActionProps) {
  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 opacity-75" aria-disabled="true">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${toneClass(tone)} text-white`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </div>
        <h4 className="mt-3 text-sm font-semibold text-slate-900">{label}</h4>
        <p className="mt-1 text-xs text-slate-600">Staff sign-in required</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${toneClass(tone)} text-white`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-900">{label}</h4>
      <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
    </Link>
  );
}
