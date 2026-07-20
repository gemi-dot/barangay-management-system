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
import { getSeniorCitizensReport, type SeniorCitizensReport } from "@/lib/api";

export default function SeniorCitizensReportPage() {
  const { canWrite } = useSessionAuth();
  const [data, setData] = useState<SeniorCitizensReport | null>(null);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
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
        const response = await getSeniorCitizensReport({ page: 1, page_size: 100, q: query || undefined, zone: zone || undefined });
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load senior citizens report.";
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
  }, [canWrite, query, zone]);

  return (
    <ContentContainer>
      <SessionRoleBanner />
      <PageHeader
        eyebrow="Reports"
        title="Senior Citizens Report"
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted report"
          description="Staff login is required to access this report."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Seniors" value={data?.total_seniors ?? 0} />
            <StatCard label="With Reports" value={data?.seniors_with_reports ?? 0} />
            <StatCard label="Need Assessment" value={data?.seniors_needing_assessment ?? 0} />
          </section>

          <FilterBar>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, caregiver, zone"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Zone</span>
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                <option value="">All zones</option>
                {(data?.zones ?? []).map((row) => (
                  <option key={row} value={row}>{row}</option>
                ))}
              </select>
            </label>
          </FilterBar>

          <DataTable
            columns={[
              { key: "name", header: "Name", render: (row) => row.full_name },
              { key: "zone", header: "Purok", render: (row) => row.zone },
              { key: "mobility", header: "Mobility", render: (row) => row.mobility_status },
              { key: "pension", header: "Pension", render: (row) => row.pension_source || "-" },
              { key: "caregiver", header: "Caregiver", render: (row) => row.caregiver_name || "-" },
            ]}
            rows={data?.results ?? []}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No senior citizen rows"
            emptyDescription="No rows matched your current filters."
          />
        </>
      ) : null}
    </ContentContainer>
  );
}
