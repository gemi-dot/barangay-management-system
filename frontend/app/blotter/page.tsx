"use client";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";

export default function BlotterPage() {
  const { canWrite } = useSessionAuth();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Blotter</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Incident Intake and Case Tracking</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This module placeholder is now available in Next.js while full blotter forms and workflow are prepared.
          </p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access blotter operations.
          </section>
        )}

        {canWrite && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm text-sm text-zinc-700">
            Legacy parity achieved for the blotter placeholder page. Next migration step is implementing full incident
            records CRUD and timeline actions.
          </section>
        )}
      </div>
    </main>
  );
}
