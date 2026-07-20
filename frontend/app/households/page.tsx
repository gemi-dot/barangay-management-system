"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, Home, UserPlus } from "lucide-react";

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
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
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
    <ContentContainer>
      <SessionRoleBanner />

      <ExecutivePageHeader
        subtitle="Households Module"
        title="Household Executive Workspace"
        description="Advanced household registry with operational KPIs, filtering, exports, and cross-module quick actions."
        badges={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
        actions={(
          <ExportButtons
            rows={rows}
            fileName="households-export.csv"
            toExportRecord={(row) => ({
              household_number: row.household_number,
              head_full_name: row.head_full_name,
              zone: row.zone,
              member_count: row.member_count,
              house_ownership: row.house_ownership,
              total_monthly_income: row.total_monthly_income || "",
            })}
            disabled={loading}
          />
        )}
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to access households data."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <ModuleQuickActions
            actions={[
              { label: "Register Resident", description: "Open residents module", href: "/residents", icon: UserPlus, tone: "blue" },
              { label: "Document Requests", description: "Open request queue", href: "/document-requests", icon: ClipboardList, tone: "emerald" },
              { label: "Export Households", description: "Download current filtered rows", href: "/households", icon: Download, tone: "amber" },
              { label: "Dashboard", description: "Return to command center", href: "/", icon: Home, tone: "slate" },
            ]}
          />

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Households" value={summary?.total_households ?? 0} />
            <StatCard label="Active Residents" value={summary?.total_residents ?? 0} />
            <StatCard label="Zones Covered" value={summary?.by_zone.length ?? 0} />
          </section>

          <SectionCard title="Advanced Search and Filters" description="Filter households by free-text search and zone.">
            <FilterBar>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Search</span>
                <SearchInput
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search household no, head, zone"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Zone</span>
                <select
                  value={zone}
                  onChange={(event) => {
                    setZone(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                >
                  <option value="">All zones</option>
                  {(summary?.by_zone ?? []).map((row) => (
                    <option key={row.zone} value={row.zone}>
                      {row.zone}
                    </option>
                  ))}
                </select>
              </label>

              <div className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Totals</span>
                <div className="rounded-md border border-[var(--color-border)] bg-zinc-50 px-3 py-2 text-zinc-700">
                  {count} household{count === 1 ? "" : "s"}
                </div>
              </div>
            </FilterBar>
          </SectionCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
            <div className="space-y-4">
              <DataTable
                columns={[
                  {
                    key: "household",
                    header: "Household #",
                    render: (row) =>
                      row.head_resident_id ? (
                        <Link className="font-medium text-zinc-900 hover:underline" href={`/residents/${row.head_resident_id}`}>
                          {row.household_number}
                        </Link>
                      ) : (
                        row.household_number
                      ),
                  },
                  {
                    key: "head",
                    header: "Head",
                    render: (row) => row.head_full_name,
                  },
                  {
                    key: "zone",
                    header: "Purok",
                    render: (row) => row.zone,
                  },
                  {
                    key: "members",
                    header: "Members",
                    render: (row) => row.member_count,
                  },
                  {
                    key: "ownership",
                    header: "Ownership",
                    render: (row) => row.house_ownership,
                  },
                  {
                    key: "income",
                    header: "Income",
                    render: (row) => row.total_monthly_income ?? "-",
                  },
                ]}
                rows={rows}
                rowKey={(row) => row.id}
                loading={loading}
                emptyTitle="No households found"
                emptyDescription="No households match your current search and zone filters."
              />

              <SectionCard>
                <div className="flex items-center justify-between text-sm">
                  <p className="text-zinc-600">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <SecondaryButton
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page <= 1 || loading}
                    >
                      Previous
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      Next
                    </SecondaryButton>
                  </div>
                </div>
              </SectionCard>
            </div>

            <StatisticsSidebar
              title="Statistics Sidebar"
              stats={[
                { label: "Active Zone Filter", value: zone || "All zones" },
                { label: "Search Term", value: query || "None" },
                { label: "Rows Loaded", value: String(rows.length) },
                { label: "Total Pages", value: String(totalPages) },
              ]}
            />
          </section>
        </>
      ) : null}
    </ContentContainer>
  );
}
