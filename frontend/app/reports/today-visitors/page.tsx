"use client";

import { useEffect, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    <ContentContainer>
      <SessionRoleBanner />
      <PageHeader
        eyebrow="Reports"
        title="Today Visitors"
        description="Unique resident visits logged for today."
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
        <SectionCard>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600">Date: {data?.report_date ?? "-"}</p>
            <p className="text-sm font-semibold text-zinc-900">Visitors today: {data?.visitors_today_count ?? 0}</p>
          </div>

          <DataTable
            columns={[
              { key: "resident", header: "Resident", render: (row) => row.full_name },
              { key: "zone", header: "Purok", render: (row) => row.zone || "-" },
              { key: "precinct", header: "Precinct", render: (row) => row.precinct_number || "-" },
              { key: "loggedAt", header: "Logged At", render: (row) => row.logged_at },
              { key: "loggedBy", header: "Logged By", render: (row) => row.logged_by || "-" },
            ]}
            rows={data?.results ?? []}
            rowKey={(row) => `${row.resident_id}-${row.logged_at}`}
            loading={loading}
            emptyTitle="No visitor logs"
            emptyDescription="No visitors were logged for the selected date."
          />
        </SectionCard>
      ) : null}
    </ContentContainer>
  );
}
