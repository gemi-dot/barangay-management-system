import { Globe, Mail, ShieldCheck, X } from "lucide-react";

import { BRAND } from "@/lib/brand";

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true" aria-label="About BIMS">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">About BIMS</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{BRAND.product}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{BRAND.version}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close about dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Developed by</p>
            <p>{BRAND.company}</p>
          </section>

          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Mission</p>
            <p>{BRAND.mission}</p>
          </section>

          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Technologies</p>
            <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Next.js</li>
              <li>Django REST Framework</li>
              <li>TypeScript</li>
              <li>Python</li>
              <li>REST APIs</li>
            </ul>
          </section>

          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Version History</p>
            <p>v2.0 Enterprise</p>
          </section>

          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100">License</p>
            <p>{BRAND.copyright}</p>
          </section>

          <section className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {BRAND.website}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {BRAND.supportEmail}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Enterprise Edition
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
