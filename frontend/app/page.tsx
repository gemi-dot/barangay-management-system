import Link from "next/link";

import { getDashboardSummary, getResidentsPaginated } from "@/lib/api";

export default async function Home() {
  const [summary, residentsPreview] = await Promise.all([
    getDashboardSummary(),
    getResidentsPaginated({ page: 1, page_size: 5, ordering: "last_name" }),
  ]);
  const preview = residentsPreview.results;

  const genderTotal =
    summary.charts.gender_distribution.male +
    summary.charts.gender_distribution.female;
  const malePct = genderTotal
    ? Math.round((summary.charts.gender_distribution.male / genderTotal) * 100)
    : 0;
  const femalePct = genderTotal
    ? Math.round((summary.charts.gender_distribution.female / genderTotal) * 100)
    : 0;

  const ageDistribution = summary.charts.age_distribution;
  const ageMax = Math.max(
    ageDistribution.children,
    ageDistribution.adults,
    ageDistribution.seniors,
    1,
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white px-6 py-10 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-amber-200 bg-white/70 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
            Barangay IMS Migration
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            Dashboard Module: API-Driven Starter
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-700">
            Phase 2 begins with Dashboard, then Residents. This page is now
            backed by Django REST data and serves as the bridge toward Vercel +
            Render deployment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/residents"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Open Residents Module
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-blue-100">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Total Residents
            </p>
            <p className="mt-2 text-3xl font-bold">{summary.cards.total_residents}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Total Households
            </p>
            <p className="mt-2 text-3xl font-bold">{summary.cards.total_households}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-sky-100">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Senior Citizens
            </p>
            <p className="mt-2 text-3xl font-bold">{summary.cards.senior_citizens}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-amber-100">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              4Ps Beneficiaries
            </p>
            <p className="mt-2 text-3xl font-bold">{summary.cards.fourps_beneficiaries}</p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Ready Today</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.cards.ready_today_count}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Currently Ready</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{summary.cards.currently_ready_count}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Visitors Today</p>
            <p className="mt-2 text-2xl font-bold text-cyan-700">{summary.cards.visitors_today_count}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pending and Processing</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{summary.cards.pending_document_requests}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold">Gender Distribution</h2>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Male</span>
                  <span>{summary.charts.gender_distribution.male} ({malePct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-200">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${malePct}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Female</span>
                  <span>{summary.charts.gender_distribution.female} ({femalePct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-200">
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: `${femalePct}%` }} />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold">Age Group Distribution</h2>
            <div className="mt-4 space-y-3 text-sm">
              {[
                { label: "Children (0-17)", value: ageDistribution.children, tone: "bg-teal-500" },
                { label: "Adults (18-59)", value: ageDistribution.adults, tone: "bg-blue-500" },
                { label: "Seniors (60+)", value: ageDistribution.seniors, tone: "bg-pink-500" },
              ].map((row) => {
                const width = Math.round((row.value / ageMax) * 100);
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-200">
                      <div className={`h-2 rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold">Population by Purok</h2>
            <div className="mt-4 max-h-64 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="px-2 py-1 font-medium">Purok</th>
                    <th className="px-2 py-1 font-medium">Population</th>
                    <th className="px-2 py-1 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.charts.zone_distribution.map((zone) => (
                    <tr key={zone.zone} className="border-b border-zinc-100">
                      <td className="px-2 py-1">{zone.zone}</td>
                      <td className="px-2 py-1">{zone.count}</td>
                      <td className="px-2 py-1">{zone.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Residents Preview</h2>
            <Link href="/residents" className="text-sm font-medium text-amber-700 hover:text-amber-900">
              View full list
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-600">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Zone</th>
                  <th className="px-3 py-2 font-medium">Gender</th>
                  <th className="px-3 py-2 font-medium">Precinct</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((resident) => (
                  <tr key={resident.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-medium">
                      {resident.last_name}, {resident.first_name}
                    </td>
                    <td className="px-3 py-2">{resident.zone || "-"}</td>
                    <td className="px-3 py-2">{resident.gender}</td>
                    <td className="px-3 py-2">{resident.precinct_number || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
