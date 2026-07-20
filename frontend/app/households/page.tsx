"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

      <PageHeader
        eyebrow="Households"
        title="Household Groupings by Purok"
        description="Staff-only households module migrated to Next.js with summary and searchable listing."
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
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
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Households" value={summary?.total_households ?? 0} />
            <StatCard label="Active Residents" value={summary?.total_residents ?? 0} />
            <StatCard label="Zones Covered" value={summary?.by_zone.length ?? 0} />
          </section>

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
        </>
      ) : null}
    </ContentContainer>
  );
}
