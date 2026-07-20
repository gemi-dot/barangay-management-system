"use client";

import { useEffect, useState } from "react";
import { Download, FileText, HeartPulse, Users, Stethoscope } from "lucide-react";

import { ExecutivePageHeader } from "@/components/enterprise/ExecutivePageHeader";
import { ExportButtons } from "@/components/enterprise/ExportButtons";
import { ModuleQuickActions } from "@/components/enterprise/ModuleQuickActions";
import { StatisticsSidebar } from "@/components/enterprise/StatisticsSidebar";
import { ContentContainer } from "@/components/layout/ContentContainer";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    <ContentContainer>
      <SessionRoleBanner />

      <ExecutivePageHeader
        subtitle="BHW Reports"
        title="BHW Executive Workspace"
        description="Community health reporting command center for senior, 4Ps, pregnancy, and health records with enterprise operations visibility."
        badges={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
        actions={
          <ExportButtons
            rows={
              mode === "senior"
                ? seniorRows
                : mode === "fourps"
                  ? fourpsRows
                  : mode === "pregnancy"
                    ? pregnancyRows
                    : healthRows
            }
            fileName={`bhw-${mode}-export.csv`}
            toExportRecord={(row: BhwSeniorCitizen | BhwFourPs | BhwPregnancy | BhwHealth) => {
              const name = "full_name" in row ? row.full_name : "";
              const zone = "zone" in row ? row.zone : "";
              return { name, zone, mode };
            }}
            disabled={loading}
          />
        }
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to access BHW reports."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <ModuleQuickActions
            actions={[
              { label: "Senior Citizens", description: "Review senior monitoring", href: "/bhw-reports", icon: Users, tone: "blue" },
              { label: "Health Reports", description: "Review health report logs", href: "/bhw-reports", icon: Stethoscope, tone: "emerald" },
              { label: "Pregnancy", description: "Review pregnancy watchlist", href: "/bhw-reports", icon: HeartPulse, tone: "amber" },
              { label: "Export Rows", description: "Download currently visible BHW dataset", href: "/bhw-reports", icon: Download, tone: "slate" },
            ]}
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <StatCard label="Senior Citizens" value={summary?.senior_citizens_total ?? 0} />
            </div>
            <div className="xl:col-span-2">
              <StatCard label="4Ps Beneficiaries" value={summary?.fourps_total ?? 0} />
            </div>
            <StatCard label="Pregnancy Ongoing" value={summary?.pregnancy_ongoing_total ?? 0} />
            <StatCard label="Due Soon" value={summary?.pregnancy_due_soon ?? 0} />
            <div className="xl:col-span-2">
              <StatCard label="Health Reports (30 days)" value={summary?.health_reports_last_30_days ?? 0} />
            </div>
            <div className="xl:col-span-2">
              <StatCard label="Health Reports (Total)" value={summary?.health_reports_total ?? 0} />
            </div>
          </section>

          <SectionCard title="Advanced Search and Filters" description="Switch BHW report views and search records in real time.">
            <FilterBar>
              <div className="flex flex-wrap items-center gap-2">
                <SecondaryButton onClick={() => setMode("senior")} className={mode === "senior" ? "bg-slate-100" : ""}>
                  Senior Citizens
                </SecondaryButton>
                <SecondaryButton onClick={() => setMode("fourps")} className={mode === "fourps" ? "bg-slate-100" : ""}>
                  4Ps
                </SecondaryButton>
                <SecondaryButton onClick={() => setMode("pregnancy")} className={mode === "pregnancy" ? "bg-slate-100" : ""}>
                  Pregnancy
                </SecondaryButton>
                <SecondaryButton onClick={() => setMode("health")} className={mode === "health" ? "bg-slate-100" : ""}>
                  Health
                </SecondaryButton>
              </div>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">Search</span>
                <SearchInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, zone, household..."
                />
              </label>
            </FilterBar>
          </SectionCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
            <div className="space-y-4">
          {mode === "senior" ? (
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (row) => row.full_name },
                { key: "zone", header: "Purok", render: (row) => row.zone },
                { key: "mobility", header: "Mobility", render: (row) => row.mobility_status },
                { key: "pension", header: "Pension", render: (row) => row.pension_source || "-" },
              ]}
              rows={seniorRows}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="No senior citizen rows"
              emptyDescription="No senior citizen report rows matched your filters."
            />
          ) : null}

          {mode === "fourps" ? (
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (row) => row.full_name },
                { key: "zone", header: "Purok", render: (row) => row.zone },
                { key: "household", header: "Household ID", render: (row) => row.household_id },
                { key: "grant", header: "Grant", render: (row) => row.monthly_grant_amount },
              ]}
              rows={fourpsRows}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="No 4Ps rows"
              emptyDescription="No 4Ps report rows matched your filters."
            />
          ) : null}

          {mode === "pregnancy" ? (
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (row) => row.full_name },
                { key: "zone", header: "Purok", render: (row) => row.zone },
                { key: "due", header: "Expected Due Date", render: (row) => row.expected_due_date },
                { key: "visits", header: "Visits", render: (row) => row.prenatal_visits },
              ]}
              rows={pregnancyRows}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="No pregnancy rows"
              emptyDescription="No pregnancy report rows matched your filters."
            />
          ) : null}

          {mode === "health" ? (
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (row) => row.full_name },
                { key: "zone", header: "Purok", render: (row) => row.zone },
                { key: "type", header: "Report Type", render: (row) => row.report_type },
                { key: "date", header: "Date", render: (row) => row.report_date },
                { key: "provider", header: "Provider", render: (row) => row.healthcare_provider },
              ]}
              rows={healthRows}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="No health report rows"
              emptyDescription="No health report rows matched your filters."
            />
          ) : null}
            </div>

            <StatisticsSidebar
              title="Statistics Sidebar"
              stats={[
                { label: "Active View", value: mode },
                { label: "Search Term", value: query || "None" },
                { label: "Senior Total", value: String(summary?.senior_citizens_total ?? 0) },
                { label: "Health Reports 30D", value: String(summary?.health_reports_last_30_days ?? 0), note: "Rolling 30-day figure." },
              ]}
            />
          </section>
        </>
      ) : null}
    </ContentContainer>
  );
}
