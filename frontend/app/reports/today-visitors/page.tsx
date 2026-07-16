"use client";

import { useEffect, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { getTodayVisitorsReport, type TodayVisitorsReport } from "@/lib/api";

export default function TodayVisitorsReportPage() {
  const { canWrite } = useSessionAuth();
  const [data, setData] = useState<TodayVisitorsReport | null>(null);
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
        const response = await getTodayVisitorsReport();
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load today visitors report.";
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
  }, [canWrite]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#eff6ff_45%,_#ffffff_75%)] px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/60">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-gradient-to-br from-orange-300/45 to-amber-200/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-gradient-to-br from-sky-300/40 to-cyan-200/20 blur-2xl" />

          <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Reports</p>
          <h1 className="relative mt-2 text-3xl font-bold tracking-tight md:text-4xl">Today Visitors</h1>
          <p className="mt-2 text-sm text-zinc-600">Unique resident visits logged for today.</p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access this report.
          </section>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {canWrite && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-600">Date: {data?.report_date ?? "-"}</p>
              <p className="text-sm font-semibold text-zinc-900">Visitors today: {data?.visitors_today_count ?? 0}</p>
            </div>

            {loading ? (
              <p className="text-sm text-zinc-600">Loading report...</p>
            ) : (
              <div className="max-h-[32rem] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-2 py-1 font-medium">Resident</th>
                      <th className="px-2 py-1 font-medium">Purok</th>
                      <th className="px-2 py-1 font-medium">Precinct</th>
                      <th className="px-2 py-1 font-medium">Logged At</th>
                      <th className="px-2 py-1 font-medium">Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.results ?? []).map((row) => (
                      <tr key={row.resident_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="px-2 py-1 font-medium">{row.full_name}</td>
                        <td className="px-2 py-1">{row.zone || "-"}</td>
                        <td className="px-2 py-1">{row.precinct_number || "-"}</td>
                        <td className="px-2 py-1">{row.logged_at}</td>
                        <td className="px-2 py-1">{row.logged_by || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
