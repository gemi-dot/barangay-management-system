"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
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
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="Reports"
        title="Voters and Precinct Reports"
        description="Professional reporting workspace for barangay electoral distribution and precinct coverage."
        meta={(
          <>
            <Link href="/reports/today-visitors" className="rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-100">
              Today Visitors
            </Link>
            <Link href="/reports/senior-citizens" className="rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-100">
              Senior Citizens
            </Link>
            <Link href="/reports/businesses" className="rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-100">
              Businesses
            </Link>
            <Link href="/reports/fourps" className="rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-100">
              4Ps
            </Link>
            <Link href="/reports/pregnancy" className="rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-100">
              Pregnancy
            </Link>
          </>
        )}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <SectionCard title="Loading reports" description="Loading reports dataset..." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Voters" value={dataset?.totalVoters ?? 0} />
            <StatCard label="Precincts Covered" value={dataset?.byPrecinct.length ?? 0} />
            <StatCard label="Puroks Covered" value={dataset?.byPurok.length ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DataTable
              columns={[
                { key: "precinct", header: "Precinct", render: (row) => row.precinct },
                { key: "voters", header: "Voters", render: (row) => row.total },
              ]}
              rows={dataset?.byPrecinct ?? []}
              rowKey={(row) => row.precinct}
              emptyTitle="No precinct rows"
              emptyDescription="No precinct distribution rows are available."
            />

            <DataTable
              columns={[
                { key: "purok", header: "Purok", render: (row) => row.purok },
                { key: "voters", header: "Voters", render: (row) => row.total },
              ]}
              rows={dataset?.byPurok ?? []}
              rowKey={(row) => row.purok}
              emptyTitle="No purok rows"
              emptyDescription="No purok rollup rows are available."
            />
          </section>

          <SectionCard title="Voters Report">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full md:w-72"
                placeholder="Search name, precinct, purok"
              />
            </div>

            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (voter) => [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" "),
                },
                { key: "zone", header: "Purok", render: (voter) => voter.zone || "-" },
                { key: "precinct", header: "Precinct", render: (voter) => voter.precinct_number || "-" },
                { key: "gender", header: "Gender", render: (voter) => voter.gender || "-" },
              ]}
              rows={filteredVoters}
              rowKey={(voter) => voter.id}
              emptyTitle="No voter rows"
              emptyDescription="No voters matched your search query."
            />
          </SectionCard>
        </>
      )}
    </ContentContainer>
  );
}
