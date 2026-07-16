"use client";

import { useEffect, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import {
  getBhwFourPs,
  getBhwHealth,
  getBhwPregnancy,
  getBhwSeniorCitizens,
  getBhwSummary,
  type BhwFourPs,
  type BhwHealth,
  type BhwPregnancy,
  type BhwSeniorCitizen,
  type BhwSummary,
} from "@/lib/api";

type ViewMode = "senior" | "fourps" | "pregnancy" | "health";

export default function BhwReportsPage() {
  const { canWrite } = useSessionAuth();

  const [summary, setSummary] = useState<BhwSummary | null>(null);
  const [mode, setMode] = useState<ViewMode>("senior");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seniorRows, setSeniorRows] = useState<BhwSeniorCitizen[]>([]);
  const [fourpsRows, setFourpsRows] = useState<BhwFourPs[]>([]);
  const [pregnancyRows, setPregnancyRows] = useState<BhwPregnancy[]>([]);
  const [healthRows, setHealthRows] = useState<BhwHealth[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!canWrite) {
        setSummary(null);
        return;
      }
      try {
        const data = await getBhwSummary();
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load BHW summary.";
          setError(message);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      if (!canWrite) {
        setSeniorRows([]);
        setFourpsRows([]);
        setPregnancyRows([]);
        setHealthRows([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (mode === "senior") {
          const data = await getBhwSeniorCitizens({ page: 1, page_size: 50, q: query || undefined });
          if (!cancelled) setSeniorRows(data.results);
        } else if (mode === "fourps") {
          const data = await getBhwFourPs({ page: 1, page_size: 50, q: query || undefined });
          if (!cancelled) setFourpsRows(data.results);
        } else if (mode === "pregnancy") {
          const data = await getBhwPregnancy({ page: 1, page_size: 50, q: query || undefined, outcome: "ongoing" });
          if (!cancelled) setPregnancyRows(data.results);
        } else {
          const data = await getBhwHealth({ page: 1, page_size: 50, q: query || undefined });
          if (!cancelled) setHealthRows(data.results);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load BHW report rows.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, [canWrite, mode, query]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">BHW Reports</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Community Health and Social Reports</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Senior citizens, 4Ps beneficiaries, pregnancy monitoring, and health logs with staff-only access.
          </p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access BHW reports.
          </section>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {canWrite && (
          <>
            <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Senior Citizens</p>
                <p className="mt-1 text-2xl font-bold">{summary?.senior_citizens_total ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">4Ps Beneficiaries</p>
                <p className="mt-1 text-2xl font-bold">{summary?.fourps_total ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Pregnancy Ongoing</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{summary?.pregnancy_ongoing_total ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Due Soon</p>
                <p className="mt-1 text-2xl font-bold text-orange-700">{summary?.pregnancy_due_soon ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Health Reports (30 days)</p>
                <p className="mt-1 text-2xl font-bold text-sky-700">{summary?.health_reports_last_30_days ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Health Reports (Total)</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{summary?.health_reports_total ?? 0}</p>
              </article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode("senior")}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "senior" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                >
                  Senior Citizens
                </button>
                <button
                  type="button"
                  onClick={() => setMode("fourps")}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "fourps" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                >
                  4Ps
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pregnancy")}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "pregnancy" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                >
                  Pregnancy
                </button>
                <button
                  type="button"
                  onClick={() => setMode("health")}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${mode === "health" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                >
                  Health
                </button>

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, zone, household..."
                  className="ml-auto w-full rounded-md border px-3 py-2 text-sm md:w-80"
                />
              </div>

              {loading ? (
                <p className="text-sm text-zinc-600">Loading report rows...</p>
              ) : (
                <div className="max-h-[30rem] overflow-auto">
                  {mode === "senior" && (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-2 py-1 font-medium">Name</th>
                          <th className="px-2 py-1 font-medium">Purok</th>
                          <th className="px-2 py-1 font-medium">Mobility</th>
                          <th className="px-2 py-1 font-medium">Pension</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seniorRows.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-100">
                            <td className="px-2 py-1">{row.full_name}</td>
                            <td className="px-2 py-1">{row.zone}</td>
                            <td className="px-2 py-1">{row.mobility_status}</td>
                            <td className="px-2 py-1">{row.pension_source || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {mode === "fourps" && (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-2 py-1 font-medium">Name</th>
                          <th className="px-2 py-1 font-medium">Purok</th>
                          <th className="px-2 py-1 font-medium">Household ID</th>
                          <th className="px-2 py-1 font-medium">Grant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fourpsRows.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-100">
                            <td className="px-2 py-1">{row.full_name}</td>
                            <td className="px-2 py-1">{row.zone}</td>
                            <td className="px-2 py-1">{row.household_id}</td>
                            <td className="px-2 py-1">{row.monthly_grant_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {mode === "pregnancy" && (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-2 py-1 font-medium">Name</th>
                          <th className="px-2 py-1 font-medium">Purok</th>
                          <th className="px-2 py-1 font-medium">Expected Due Date</th>
                          <th className="px-2 py-1 font-medium">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pregnancyRows.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-100">
                            <td className="px-2 py-1">{row.full_name}</td>
                            <td className="px-2 py-1">{row.zone}</td>
                            <td className="px-2 py-1">{row.expected_due_date}</td>
                            <td className="px-2 py-1">{row.prenatal_visits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {mode === "health" && (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-2 py-1 font-medium">Name</th>
                          <th className="px-2 py-1 font-medium">Purok</th>
                          <th className="px-2 py-1 font-medium">Report Type</th>
                          <th className="px-2 py-1 font-medium">Date</th>
                          <th className="px-2 py-1 font-medium">Provider</th>
                        </tr>
                      </thead>
                      <tbody>
                        {healthRows.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-100">
                            <td className="px-2 py-1">{row.full_name}</td>
                            <td className="px-2 py-1">{row.zone}</td>
                            <td className="px-2 py-1">{row.report_type}</td>
                            <td className="px-2 py-1">{row.report_date}</td>
                            <td className="px-2 py-1">{row.healthcare_provider}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
