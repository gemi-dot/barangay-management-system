"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, HeartPulse, ScanLine, Users } from "lucide-react";

import { ExecutivePageHeader } from "@/components/enterprise/ExecutivePageHeader";
import { ExportButtons } from "@/components/enterprise/ExportButtons";
import { ModuleQuickActions } from "@/components/enterprise/ModuleQuickActions";
import { StatisticsSidebar } from "@/components/enterprise/StatisticsSidebar";
import { ContentContainer } from "@/components/layout/ContentContainer";
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

      <ExecutivePageHeader
        subtitle="Reports Module"
        title="Reports Executive Workspace"
        description="Commercial-style analytics cockpit for voters, precincts, and purok distribution with export-ready data tables."
        badges={
          <>
            <Link href="/reports/today-visitors" className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">
              Today Visitors
            </Link>
            <Link href="/reports/senior-citizens" className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">
              Senior Citizens
            </Link>
            <Link href="/reports/businesses" className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">
              Businesses
            </Link>
            <Link href="/reports/fourps" className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">
              4Ps
            </Link>
            <Link href="/reports/pregnancy" className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">
              Pregnancy
            </Link>
          </>
        }
        actions={
          <ExportButtons
            rows={filteredVoters}
            fileName="reports-voters-export.csv"
            toExportRecord={(voter) => ({
              id: voter.id,
              full_name: [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" "),
              purok: voter.zone || "",
              precinct_number: voter.precinct_number || "",
              gender: voter.gender || "",
            })}
            disabled={loading}
          />
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <SectionCard title="Loading reports" description="Loading reports dataset..." />
      ) : (
        <>
          <ModuleQuickActions
            actions={[
              { label: "Visitor Trend", description: "Open today visitor report", href: "/reports/today-visitors", icon: ScanLine, tone: "blue" },
              { label: "Senior Reports", description: "Review senior citizen coverage", href: "/reports/senior-citizens", icon: Users, tone: "emerald" },
              { label: "Pregnancy Reports", description: "Review maternal indicators", href: "/reports/pregnancy", icon: HeartPulse, tone: "amber" },
              { label: "Export Data", description: "Download filtered voter rows", href: "/reports", icon: Download, tone: "slate" },
            ]}
          />

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

          <SectionCard title="Advanced Search and Filters" description="Search voters by name, precinct, and purok.">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full md:w-72"
                placeholder="Search name, precinct, purok"
              />
            </div>
          </SectionCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
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

            <StatisticsSidebar
              title="Statistics Sidebar"
              stats={[
                { label: "Search Term", value: search || "None" },
                { label: "Visible Voters", value: String(filteredVoters.length) },
                { label: "Total Precincts", value: String(dataset?.byPrecinct.length ?? 0) },
                { label: "Total Puroks", value: String(dataset?.byPurok.length ?? 0) },
              ]}
            />
          </section>
        </>
      )}
    </ContentContainer>
  );
}
