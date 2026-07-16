"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { getReportsDataset, type ReportsDataset } from "@/lib/api";

export default function ReportsPage() {
  const [dataset, setDataset] = useState<ReportsDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReportsDataset();
        if (!cancelled) {
          setDataset(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load reports.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVoters = useMemo(() => {
    if (!dataset) return [];
    const q = search.trim().toLowerCase();
    if (!q) return dataset.voters;

    return dataset.voters.filter((voter) => {
      const fullName = [voter.first_name, voter.middle_name, voter.last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        fullName.includes(q) ||
        (voter.precinct_number || "").toLowerCase().includes(q) ||
        (voter.zone || "").toLowerCase().includes(q)
      );
    });
  }, [dataset, search]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#eff6ff_45%,_#ffffff_75%)] px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/60">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-gradient-to-br from-orange-300/45 to-amber-200/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-gradient-to-br from-sky-300/40 to-cyan-200/20 blur-2xl" />

          <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Reports</p>
          <h1 className="relative mt-2 text-3xl font-bold tracking-tight md:text-4xl">Voters and Precinct Reports</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Professional reporting workspace for barangay electoral distribution and precinct coverage.
          </p>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Link href="/reports/today-visitors" className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Today Visitors
            </Link>
            <Link href="/reports/senior-citizens" className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Senior Citizens
            </Link>
            <Link href="/reports/businesses" className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Businesses
            </Link>
            <Link href="/reports/fourps" className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              4Ps
            </Link>
            <Link href="/reports/pregnancy" className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Pregnancy
            </Link>
          </div>
        </section>

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {loading ? (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-sm text-zinc-600 shadow-sm">
            Loading reports dataset...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total Voters</p>
                <p className="mt-2 text-3xl font-bold">{dataset?.totalVoters ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Precincts Covered</p>
                <p className="mt-2 text-3xl font-bold">{dataset?.byPrecinct.length ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Puroks Covered</p>
                <p className="mt-2 text-3xl font-bold">{dataset?.byPurok.length ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Voters by Precinct</h2>
                <div className="mt-3 max-h-80 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-1 font-medium">Precinct</th>
                        <th className="px-2 py-1 font-medium">Voters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataset?.byPrecinct.map((row) => (
                        <tr key={row.precinct} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="px-2 py-1">{row.precinct}</td>
                          <td className="px-2 py-1">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Precinct Dashboard (Purok Rollup)</h2>
                <div className="mt-3 max-h-80 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-1 font-medium">Purok</th>
                        <th className="px-2 py-1 font-medium">Voters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataset?.byPurok.map((row) => (
                        <tr key={row.purok} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="px-2 py-1">{row.purok}</td>
                          <td className="px-2 py-1">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Voters Report</h2>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm md:w-72"
                  placeholder="Search name, precinct, purok"
                />
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-2 py-1 font-medium">Name</th>
                      <th className="px-2 py-1 font-medium">Purok</th>
                      <th className="px-2 py-1 font-medium">Precinct</th>
                      <th className="px-2 py-1 font-medium">Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoters.map((voter) => (
                      <tr key={voter.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="px-2 py-1">
                          {[voter.first_name, voter.middle_name, voter.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </td>
                        <td className="px-2 py-1">{voter.zone || "-"}</td>
                        <td className="px-2 py-1">{voter.precinct_number || "-"}</td>
                        <td className="px-2 py-1">{voter.gender || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
