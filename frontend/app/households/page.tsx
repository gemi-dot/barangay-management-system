"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, Home, Plus, UserPlus, X } from "lucide-react";

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
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import {
  getHouseholds,
  getHouseholdSummary,
  createHousehold,
  getResidentsPaginated,
  type HouseholdListItem,
  type HouseholdStatus,
  type HouseholdSummary,
  type ResidentListItem,
} from "@/lib/api";
import { householdPermissions } from "@/lib/household-authorization.mjs";

const PAGE_SIZE = 20;

export default function HouseholdsPage() {
  const { can } = useSessionAuth();
  const permissions = useMemo(() => householdPermissions(can), [can]);

  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [rows, setRows] = useState<HouseholdListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [status, setStatus] = useState<HouseholdStatus | "">("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [residentSearch, setResidentSearch] = useState("");
  const [residentOptions, setResidentOptions] = useState<ResidentListItem[]>([]);
  const [form, setForm] = useState({
    household_number: "",
    household_head_id: "",
    complete_address: "",
    purok: "Purok Talisay",
    house_ownership: "owned",
    total_monthly_income: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadHouseholds() {
      if (!permissions.view) {
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
            status,
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
  }, [page, permissions.view, query, refreshTick, status, zone]);

  useEffect(() => {
    if (!createOpen || !permissions.manage) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await getResidentsPaginated({
          page: 1,
          page_size: 30,
          search: residentSearch || undefined,
          is_active: true,
          ordering: "last_name",
        });
        if (!cancelled) setResidentOptions(result.results);
      } catch (err) {
        if (!cancelled) setCreateError(err instanceof Error ? err.message : "Failed to load residents.");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [createOpen, permissions.manage, residentSearch]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const headId = Number(form.household_head_id);
    if (!headId) {
      setCreateError("Select a household head.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createHousehold({
        household_number: form.household_number,
        household_head_id: headId,
        complete_address: form.complete_address,
        purok: form.purok,
        house_ownership: form.house_ownership as "owned" | "rented" | "shared" | "caretaker",
        total_monthly_income: form.total_monthly_income || null,
        notes: form.notes,
      });
      setCreateOpen(false);
      setForm({ household_number: "", household_head_id: "", complete_address: "", purok: "Purok Talisay", house_ownership: "owned", total_monthly_income: "", notes: "" });
      setResidentSearch("");
      setPage(1);
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create household.");
    } finally {
      setCreating(false);
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <ExecutivePageHeader
        subtitle="Households Module"
        title="Household Executive Workspace"
        description="Advanced household registry with operational KPIs, filtering, exports, and cross-module quick actions."
        badges={permissions.manage ? <StatusBadge label="Household management enabled" tone="success" /> : permissions.view ? <StatusBadge label="Household view access" tone="default" /> : <StatusBadge label="No household access" tone="warning" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            {permissions.manage ? <PrimaryButton onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>New Household</PrimaryButton> : null}
            <ExportButtons
              rows={rows}
              fileName="households-export.csv"
              toExportRecord={(row) => ({
                household_number: row.household_number,
                head_full_name: row.head_full_name,
                zone: row.zone,
                status: row.status,
                member_count: row.member_count,
                house_ownership: row.house_ownership,
                total_monthly_income: row.total_monthly_income || "",
              })}
              disabled={loading}
            />
          </div>
        )}
      />

      {!permissions.view ? (
        <SectionCard
          title="Restricted module"
          description="Your account does not have permission to view household data."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {permissions.view ? (
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

          <SectionCard title="Advanced Search and Filters" description="Search by code, head, member, address, purok, or status.">
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
                <span className="mb-1 block font-medium text-gray-700">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as HouseholdStatus | "");
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="archived">Archived</option>
                </select>
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 w-full overflow-x-auto">
                <DataTable
                  tableClassName="min-w-[1000px]"
                columns={[
                  {
                    key: "household",
                    header: "Household #",
                    className: "min-w-[130px] whitespace-nowrap",
                    render: (row) =>
                      <Link className="font-medium text-blue-700 hover:underline" href={`/households/${row.id}`}>
                        {row.household_number}
                      </Link>,
                  },
                  {
                    key: "head",
                    header: "Head",
                    className: "min-w-[220px] whitespace-nowrap",
                    render: (row) => row.head_full_name,
                  },
                  {
                    key: "zone",
                    header: "Purok",
                    className: "min-w-[150px] whitespace-nowrap",
                    render: (row) => row.zone,
                  },
                  {
                    key: "status",
                    header: "Status",
                    className: "min-w-[120px] whitespace-nowrap",
                    render: (row) => <StatusBadge label={row.status} tone={row.status === "active" ? "success" : row.status === "archived" ? "default" : "warning"} />,
                  },
                  {
                    key: "members",
                    header: "Members",
                    className: "min-w-[110px] whitespace-nowrap",
                    render: (row) => row.member_count,
                  },
                  {
                    key: "ownership",
                    header: "Ownership",
                    className: "min-w-[150px]",
                    render: (row) => row.house_ownership,
                  },
                  {
                    key: "income",
                    header: "Income",
                    className: "min-w-[170px] whitespace-nowrap",
                    render: (row) => row.total_monthly_income ?? "-",
                  },
                ]}
                rows={rows}
                rowKey={(row) => row.id}
                loading={loading}
                emptyTitle="No households found"
                emptyDescription="No households match your current search and zone filters."
                />
              </div>

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

            <div className="min-w-0 xl:w-[250px] xl:max-w-[250px] xl:justify-self-end xl:sticky xl:top-24">
              <StatisticsSidebar
                title="Statistics Sidebar"
                stats={[
                  { label: "Active Zone Filter", value: zone || "All zones" },
                  { label: "Search Term", value: query || "None" },
                  { label: "Status Filter", value: status || "All statuses" },
                  { label: "Rows Loaded", value: String(rows.length) },
                  { label: "Total Pages", value: String(totalPages) },
                ]}
                statsContainerClassName="grid grid-cols-2 gap-3 space-y-0 xl:grid-cols-1"
                statCardClassName="min-w-0"
              />
            </div>
          </section>
        </>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
          <form onSubmit={handleCreate} className="mx-auto w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Register household</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Select an existing resident as the initial household head.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {createError ? <div className="mt-4"><ErrorState message={createError} /></div> : null}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Find resident</span>
                <SearchInput value={residentSearch} onChange={(event) => setResidentSearch(event.target.value)} placeholder="Search resident name" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Household head</span>
                <select required value={form.household_head_id} onChange={(event) => setForm((value) => ({ ...value, household_head_id: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">
                  <option value="">Select resident</option>
                  {residentOptions.map((resident) => <option key={resident.id} value={resident.id}>{resident.full_name || `${resident.last_name}, ${resident.first_name}`}</option>)}
                </select>
              </label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Household code</span><input value={form.household_number} onChange={(event) => setForm((value) => ({ ...value, household_number: event.target.value }))} placeholder="Auto-generated when blank" className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Purok</span><select value={form.purok} onChange={(event) => setForm((value) => ({ ...value, purok: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">{["Purok Talisay", "Purok Malunggay", "Purok Mancinitas", "Purok Narra", "Purok Kulo", "Purok Ipil-ipil", "Purok Tugas"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium text-slate-700">Complete address</span><textarea value={form.complete_address} onChange={(event) => setForm((value) => ({ ...value, complete_address: event.target.value }))} rows={2} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Ownership</span><select value={form.house_ownership} onChange={(event) => setForm((value) => ({ ...value, house_ownership: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"><option value="owned">Owned</option><option value="rented">Rented</option><option value="shared">Shared</option><option value="caretaker">Caretaker</option></select></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Monthly income</span><input type="number" min="0" step="0.01" value={form.total_monthly_income} onChange={(event) => setForm((value) => ({ ...value, total_monthly_income: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium text-slate-700">Notes</span><textarea value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} rows={3} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2"><SecondaryButton onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={creating}>{creating ? "Creating..." : "Create Household"}</PrimaryButton></div>
          </form>
        </div>
      ) : null}
    </ContentContainer>
  );
}
