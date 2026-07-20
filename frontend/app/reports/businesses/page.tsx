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
    <ContentContainer>
      <SessionRoleBanner />
      <PageHeader
        eyebrow="Reports"
        title="Businesses Report"
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard title="Restricted report" description="Staff login is required to access this report." className="border-amber-200 bg-amber-50" />
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total" value={data?.total_businesses ?? 0} />
            <StatCard label="Sari-Sari" value={data?.sari_sari_count ?? 0} />
            <StatCard label="Carenderia" value={data?.carenderia_count ?? 0} />
            <StatCard label="Both" value={data?.both_count ?? 0} />
            <StatCard label="Sanitation OK" value={data?.sanitation_compliant ?? 0} />
            <StatCard label="Fire Safety OK" value={data?.fire_safety_compliant ?? 0} />
          </section>

          <FilterBar>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, owner, zone" />
            </label>
          </FilterBar>

          <DataTable
            columns={[
              { key: "business", header: "Business", render: (row) => row.business_name },
              { key: "type", header: "Type", render: (row) => row.business_type },
              { key: "owner", header: "Owner", render: (row) => row.owner_name },
              { key: "zone", header: "Purok", render: (row) => row.zone },
              { key: "sanitation", header: "Sanitation", render: (row) => (row.has_proper_sanitation ? "Yes" : "No") },
              { key: "fire", header: "Fire Safety", render: (row) => (row.has_fire_safety_measures ? "Yes" : "No") },
            ]}
            rows={data?.results ?? []}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No business rows"
            emptyDescription="No businesses matched your search query."
          />
        </>
      ) : null}
    </ContentContainer>
  );
}
