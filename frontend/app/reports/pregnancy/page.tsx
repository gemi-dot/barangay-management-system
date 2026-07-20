"use client";

import { useEffect, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPregnancyReport, type PregnancyReport } from "@/lib/api";

export default function PregnancyReportPage() {
  const { canWrite } = useSessionAuth();
  const [data, setData] = useState<PregnancyReport | null>(null);
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
        const response = await getPregnancyReport({ page: 1, page_size: 100, q: query || undefined });
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load pregnancy report.";
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
    <ContentContainer>
      <SessionRoleBanner />
      <PageHeader
        eyebrow="Reports"
        title="Pregnancy Report"
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard title="Restricted report" description="Staff login is required to access this report." className="border-amber-200 bg-amber-50" />
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total" value={data?.total_pregnancies ?? 0} />
            <StatCard label="High Risk" value={data?.high_risk_pregnancies ?? 0} />
            <StatCard label="1st Trimester" value={data?.first_trimester_count ?? 0} />
            <StatCard label="2nd Trimester" value={data?.second_trimester_count ?? 0} />
            <StatCard label="3rd Trimester" value={data?.third_trimester_count ?? 0} />
            <StatCard label="Due in 30 Days" value={data?.upcoming_deliveries_count ?? 0} />
          </section>

          <FilterBar>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or zone" />
            </label>
          </FilterBar>

          <DataTable
            columns={[
              { key: "name", header: "Name", render: (row) => row.full_name },
              { key: "zone", header: "Purok", render: (row) => row.zone },
              { key: "edd", header: "EDD", render: (row) => row.expected_due_date },
              { key: "gestation", header: "Gestation (weeks)", render: (row) => row.age_of_gestation_weeks ?? "-" },
              { key: "risk", header: "High Risk", render: (row) => (row.high_risk_pregnancy ? "Yes" : "No") },
              { key: "dueSoon", header: "Due Soon", render: (row) => (row.due_soon ? "Yes" : "No") },
            ]}
            rows={data?.results ?? []}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No pregnancy rows"
            emptyDescription="No pregnancies matched your search query."
          />
        </>
      ) : null}
    </ContentContainer>
  );
}
