"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import {
  getHouseholds,
  getHouseholdSummary,
  type HouseholdListItem,
  type HouseholdSummary,
} from "@/lib/api";

const PAGE_SIZE = 20;

export default function HouseholdsPage() {
  const { canWrite } = useSessionAuth();

  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [rows, setRows] = useState<HouseholdListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHouseholds() {
      if (!canWrite) {
        setSummary(null);
        setRows([]);
        setCount(0);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [summaryData, listData] = await Promise.all([
          getHouseholdSummary(),
          getHouseholds({
            page,
            page_size: PAGE_SIZE,
            q: query || undefined,
            zone: zone || undefined,
          }),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setRows(listData.results);
          setCount(listData.count);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load households.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHouseholds();

    return () => {
      cancelled = true;
    };
  }, [canWrite, page, query, zone]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Households</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Household Groupings by Purok</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Staff-only households module migrated to Next.js with summary and searchable listing.
          </p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access households data.
          </section>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {canWrite && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total Households</p>
                <p className="mt-1 text-2xl font-bold">{summary?.total_households ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Active Residents</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{summary?.total_residents ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Zones Covered</p>
                <p className="mt-1 text-2xl font-bold">{summary?.by_zone.length ?? 0}</p>
              </article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search household no, head, zone"
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <select
                  value={zone}
                  onChange={(event) => {
                    setZone(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">All zones</option>
                  {(summary?.by_zone ?? []).map((row) => (
                    <option key={row.zone} value={row.zone}>
                      {row.zone}
                    </option>
                  ))}
                </select>
                <div className="rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {count} household{count === 1 ? "" : "s"}
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-zinc-600">Loading households...</p>
              ) : (
                <div className="max-h-[30rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="px-2 py-1 font-medium">Household #</th>
                        <th className="px-2 py-1 font-medium">Head</th>
                        <th className="px-2 py-1 font-medium">Purok</th>
                        <th className="px-2 py-1 font-medium">Members</th>
                        <th className="px-2 py-1 font-medium">Ownership</th>
                        <th className="px-2 py-1 font-medium">Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-zinc-100">
                          <td className="px-2 py-1">
                            {row.head_resident_id ? (
                              <Link className="font-medium text-zinc-900 hover:underline" href={`/residents/${row.head_resident_id}`}>
                                {row.household_number}
                              </Link>
                            ) : (
                              row.household_number
                            )}
                          </td>
                          <td className="px-2 py-1">{row.head_full_name}</td>
                          <td className="px-2 py-1">{row.zone}</td>
                          <td className="px-2 py-1">{row.member_count}</td>
                          <td className="px-2 py-1">{row.house_ownership}</td>
                          <td className="px-2 py-1">{row.total_monthly_income ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-zinc-600">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
