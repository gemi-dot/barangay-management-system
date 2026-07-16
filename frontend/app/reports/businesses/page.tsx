"use client";

import { useEffect, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { getBusinessesReport, type BusinessesReport } from "@/lib/api";

export default function BusinessesReportPage() {
  const { canWrite } = useSessionAuth();
  const [data, setData] = useState<BusinessesReport | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!canWrite) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getBusinessesReport({ page: 1, page_size: 100, q: query || undefined });
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load businesses report.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [canWrite, query]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#eff6ff_45%,_#ffffff_75%)] px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/60">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-gradient-to-br from-orange-300/45 to-amber-200/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-gradient-to-br from-sky-300/40 to-cyan-200/20 blur-2xl" />

          <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Reports</p>
          <h1 className="relative mt-2 text-3xl font-bold tracking-tight md:text-4xl">Businesses Report</h1>
        </section>

        {!canWrite && <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Staff login is required to access this report.</section>}
        {error && <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section>}

        {canWrite && (
          <>
            <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Total</p><p className="mt-1 text-2xl font-bold">{data?.total_businesses ?? 0}</p></article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-sky-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Sari-Sari</p><p className="mt-1 text-2xl font-bold">{data?.sari_sari_count ?? 0}</p></article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Carenderia</p><p className="mt-1 text-2xl font-bold">{data?.carenderia_count ?? 0}</p></article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Both</p><p className="mt-1 text-2xl font-bold">{data?.both_count ?? 0}</p></article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Sanitation OK</p><p className="mt-1 text-2xl font-bold text-emerald-700">{data?.sanitation_compliant ?? 0}</p></article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" /><p className="text-xs uppercase tracking-wide text-zinc-500">Fire Safety OK</p><p className="mt-1 text-2xl font-bold text-sky-700">{data?.fire_safety_compliant ?? 0}</p></article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, owner, zone" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 md:w-80" /></div>
              {loading ? <p className="text-sm text-zinc-600">Loading report...</p> : (
                <div className="max-h-[32rem] overflow-auto">
                  <table className="min-w-full text-sm"><thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500"><th className="px-2 py-1 font-medium">Business</th><th className="px-2 py-1 font-medium">Type</th><th className="px-2 py-1 font-medium">Owner</th><th className="px-2 py-1 font-medium">Purok</th><th className="px-2 py-1 font-medium">Sanitation</th><th className="px-2 py-1 font-medium">Fire Safety</th></tr></thead><tbody>{(data?.results ?? []).map((row) => (<tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50"><td className="px-2 py-1 font-medium">{row.business_name}</td><td className="px-2 py-1">{row.business_type}</td><td className="px-2 py-1">{row.owner_name}</td><td className="px-2 py-1">{row.zone}</td><td className="px-2 py-1">{row.has_proper_sanitation ? "Yes" : "No"}</td><td className="px-2 py-1">{row.has_fire_safety_measures ? "Yes" : "No"}</td></tr>))}</tbody></table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
