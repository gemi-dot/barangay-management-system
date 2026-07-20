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
import { getFourPsReport, type FourPsReport } from "@/lib/api";

export default function FourPsReportPage() {
  const { canWrite } = useSessionAuth();
  const [data, setData] = useState<FourPsReport | null>(null);
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
        const response = await getFourPsReport({ page: 1, page_size: 100, q: query || undefined });
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load 4Ps report.";
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
        title="4Ps Beneficiaries Report"
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard title="Restricted report" description="Staff login is required to access this report." className="border-amber-200 bg-amber-50" />
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total" value={data?.total_beneficiaries ?? 0} />
            <StatCard label="Education OK" value={data?.education_compliant ?? 0} />
            <StatCard label="Health OK" value={data?.health_compliant ?? 0} />
            <StatCard label="FDS OK" value={data?.fds_compliant ?? 0} />
          </section>

          <FilterBar>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search beneficiary, household, zone" />
            </label>
          </FilterBar>

          <DataTable
            columns={[
              { key: "beneficiary", header: "Beneficiary", render: (row) => row.full_name },
              { key: "zone", header: "Purok", render: (row) => row.zone },
              { key: "household", header: "Household ID", render: (row) => row.household_id },
              { key: "education", header: "Education", render: (row) => (row.education_compliance ? "Yes" : "No") },
              { key: "health", header: "Health", render: (row) => (row.health_compliance ? "Yes" : "No") },
              { key: "fds", header: "FDS", render: (row) => (row.family_development_sessions ? "Yes" : "No") },
            ]}
            rows={data?.results ?? []}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No 4Ps rows"
            emptyDescription="No beneficiaries matched your search query."
          />
        </>
      ) : null}
    </ContentContainer>
  );
}
