"use client";

import { Code2, Database, GitBranch, Info, Layers3, LifeBuoy, Server, Settings2 } from "lucide-react";
import { useState } from "react";

import { AboutDialog } from "@/components/branding/AboutDialog";
import { BrandBadge } from "@/components/branding/BrandBadge";
import { BrandDivider } from "@/components/branding/BrandDivider";
import { BRAND, getEnvironmentLabel } from "@/lib/brand";

export function BrandFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const environment = getEnvironmentLabel();

  return (
    <footer className="mt-8 px-4 pb-6 sm:px-6 lg:px-8" aria-label="Global branding footer">
      <BrandDivider className="mb-4" />

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {BRAND.product} ({BRAND.shortName})
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Professional Digital Governance Platform</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Developed by</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{BRAND.company}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Code That Cares.
              <br />
              Technology That Serves Communities.
            </p>

            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              About BIMS
            </button>
          </div>

          <dl className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">Version</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">BIMS {BRAND.version}</dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">Build</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{BRAND.build}</dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">Environment</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{environment}</dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">Deployment Ready</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{BRAND.deploymentReady.join(" • ")}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          <BrandBadge label={`Frontend: ${BRAND.stack.frontend}`} />
          <BrandBadge label={`Backend: ${BRAND.stack.backend}`} />
          <BrandBadge label={`Database: ${BRAND.stack.databaseDevelopment}`} />
          <BrandBadge label={`Support: ${BRAND.supportEmail}`} />
        </div>

        <div className="mt-4 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          <p className="inline-flex items-center gap-1"><Code2 className="h-3.5 w-3.5" aria-hidden="true" />Frontend: Next.js</p>
          <p className="inline-flex items-center gap-1"><Server className="h-3.5 w-3.5" aria-hidden="true" />Backend: Django REST Framework</p>
          <p className="inline-flex items-center gap-1"><Database className="h-3.5 w-3.5" aria-hidden="true" />Database: SQLite (Development)</p>
          <p className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" />Edition: Enterprise</p>
          <p className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" aria-hidden="true" />Build: {BRAND.build}</p>
          <p className="inline-flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" aria-hidden="true" />Environment: {environment}</p>
          <p className="inline-flex items-center gap-1"><LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />Support: {BRAND.supportEmail}</p>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{BRAND.copyright}</p>
      </section>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </footer>
  );
}
