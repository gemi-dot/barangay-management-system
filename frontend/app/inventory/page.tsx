"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Archive, ClipboardList, Download, PlusCircle, ScanLine } from "lucide-react";

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
  createInventoryAssetEntry,
  getInventoryAssets,
  getInventoryCategoryOptions,
  getInventorySummary,
  type InventoryAsset,
  type InventoryCategoryOption,
  type InventorySummary,
} from "@/lib/api";

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const { canWrite } = useSessionAuth();

  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<InventoryCategoryOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    property_number: "",
    category: "",
    description: "",
    serial_number: "",
    brand_model: "",
    date_acquired: "",
    cost: "",
    location: "barangay_hall",
    condition: "good",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      if (!canWrite) {
        setLoading(false);
        setSummary(null);
        setAssets([]);
        setCount(0);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [summaryData, list] = await Promise.all([
          getInventorySummary(),
          getInventoryAssets({ page, page_size: PAGE_SIZE, q: search || undefined, status: status || undefined }),
        ]);
        if (!cancelled) {
          setSummary(summaryData);
          setAssets(list.results);
          setCount(list.count);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load inventory.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [canWrite, page, search, status, refreshTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryOptions() {
      if (!canWrite) {
        setCategoryOptions([]);
        return;
      }

      setOptionsLoading(true);
      try {
        const options = await getInventoryCategoryOptions();
        if (!cancelled) {
          setCategoryOptions(options);
          setForm((current) => ({
            ...current,
            category: current.category || options[0]?.value || "",
          }));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load category options.";
          setSubmitError(message);
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadCategoryOptions();

    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const backendRoot = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/api\/?$/, "");
  const backendFormHref = backendRoot ? `${backendRoot}/inventory/items/add/` : "/inventory/items/add/";

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category || !form.description.trim()) {
      setSubmitError("Category and description are required.");
      setSubmitSuccess(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await createInventoryAssetEntry({
        property_number: form.property_number.trim(),
        category: form.category,
        description: form.description.trim(),
        serial_number: form.serial_number.trim(),
        brand_model: form.brand_model.trim(),
        date_acquired: form.date_acquired,
        cost: form.cost.trim(),
        location: form.location,
        condition: form.condition,
        status: form.status,
        notes: form.notes.trim(),
      });

      setSubmitSuccess("Asset entry saved successfully.");
      setForm((current) => ({
        ...current,
        property_number: "",
        description: "",
        serial_number: "",
        brand_model: "",
        date_acquired: "",
        cost: "",
        notes: "",
      }));
      setPage(1);
      setRefreshTick((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create asset entry.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <ExecutivePageHeader
        subtitle="Inventory Module"
        title="Inventory Executive Workspace"
        description="Enterprise asset registry with inspection visibility, quick filters, and export-ready tabular reporting."
        badges={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
        actions={
          <ExportButtons
            rows={assets}
            fileName="inventory-assets-export.csv"
            toExportRecord={(asset) => ({
              property_number: asset.property_number,
              description: asset.description,
              category: asset.category,
              status: asset.status,
              condition: asset.condition,
              location: asset.location,
            })}
            disabled={loading}
          />
        }
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to access inventory records."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <ModuleQuickActions
            actions={[
              { label: "Add Asset", description: "Create a new inventory entry", href: "/inventory", icon: PlusCircle, tone: "blue" },
              { label: "View Reports", description: "Open reports workspace", href: "/reports", icon: ClipboardList, tone: "emerald" },
              { label: "Visitor Logs", description: "Access today visitor logs", href: "/reports/today-visitors", icon: ScanLine, tone: "amber" },
              { label: "Export Assets", description: "Download active table rows", href: "/inventory", icon: Download, tone: "slate" },
            ]}
          />

          <SectionCard title="Add Asset Entry Form" description="Register new assets while keeping compatibility with existing backend inventory flows.">
            <div className="mb-4 flex items-center justify-end">
              <a
                href={backendFormHref}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                Open backend form
              </a>
            </div>

            {submitError ? <ErrorState message={submitError} /> : null}
            {submitSuccess ? <StatusBadge label={submitSuccess} tone="success" /> : null}

            <form onSubmit={handleCreateAsset} className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={form.property_number}
                onChange={(event) => setForm((current) => ({ ...current, property_number: event.target.value }))}
                placeholder="Property number (optional)"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />

              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                disabled={optionsLoading}
                required
              >
                {optionsLoading ? <option value="">Loading categories...</option> : null}
                {!optionsLoading && categoryOptions.length === 0 ? <option value="">No categories</option> : null}
                {!optionsLoading &&
                  categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>

              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm md:col-span-2"
                required
              />

              <input
                value={form.serial_number}
                onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))}
                placeholder="Serial number"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <input
                value={form.brand_model}
                onChange={(event) => setForm((current) => ({ ...current, brand_model: event.target.value }))}
                placeholder="Brand / Model"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.date_acquired}
                onChange={(event) => setForm((current) => ({ ...current, date_acquired: event.target.value }))}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
                placeholder="Cost"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              />

              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="under_repair">Under Repair</option>
                <option value="lost">Lost</option>
                <option value="disposed">Disposed</option>
              </select>
              <select
                value={form.condition}
                onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <option value="excellent">Excellent</option>
                <option value="very_good">Very Good</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="unserviceable">Unserviceable</option>
                <option value="for_disposal">For Disposal</option>
              </select>
              <select
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <option value="barangay_hall">Barangay Hall</option>
                <option value="barangay_office">Barangay Office</option>
                <option value="health_center">Health Center</option>
                <option value="multi_purpose_hall">Multi-Purpose Hall</option>
                <option value="covered_court">Covered Court</option>
                <option value="session_hall">Session Hall</option>
                <option value="drrm_storage">DRRM Storage</option>
                <option value="records_room">Records Room</option>
                <option value="storage_room">Storage Room</option>
                <option value="garage">Garage</option>
                <option value="day_care_center">Day Care Center</option>
                <option value="senior_citizen_center">Senior Citizen Center</option>
              </select>

              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm xl:col-span-3"
                rows={2}
              />

              <PrimaryButton type="submit" disabled={submitting || optionsLoading}>
                {submitting ? "Saving..." : "Add Asset Entry"}
              </PrimaryButton>
            </form>
          </SectionCard>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total" value={summary?.total_assets ?? 0} />
            <StatCard label="Active" value={summary?.active_assets ?? 0} />
            <StatCard label="Under Repair" value={summary?.under_repair_assets ?? 0} />
            <StatCard label="Lost" value={summary?.lost_assets ?? 0} />
            <StatCard label="Disposed" value={summary?.disposed_assets ?? 0} />
          </section>

          <SectionCard title="Advanced Search and Filters" description="Use text and status criteria to find inventory assets faster.">
            <FilterBar>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Search</span>
                <SearchInput
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search property no, description, category"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="lost">Lost</option>
                  <option value="disposed">Disposed</option>
                </select>
              </label>
              <div className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Totals</span>
                <div className="rounded-md border border-[var(--color-border)] bg-zinc-50 px-3 py-2 text-zinc-700">
                  {count} assets
                </div>
              </div>
            </FilterBar>
          </SectionCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
            <div className="space-y-4">
              <DataTable
                columns={[
                  {
                    key: "property",
                    header: "Property #",
                    render: (asset) => <span className="font-medium">{asset.property_number}</span>,
                  },
                  {
                    key: "description",
                    header: "Description",
                    render: (asset) => asset.description,
                  },
                  {
                    key: "category",
                    header: "Category",
                    render: (asset) => asset.category,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (asset) => <StatusBadge label={asset.status} tone="info" />,
                  },
                  {
                    key: "location",
                    header: "Location",
                    render: (asset) => asset.location,
                  },
                ]}
                rows={assets}
                rowKey={(asset) => asset.id}
                loading={loading}
                emptyTitle="No assets found"
                emptyDescription="No inventory assets match your current search and status filters."
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
                { label: "Search Term", value: search || "None" },
                { label: "Status Filter", value: status || "All statuses" },
                { label: "Visible Rows", value: String(assets.length) },
                { label: "Asset Totals", value: String(summary?.total_assets ?? 0), note: "Total from summary endpoint." },
              ]}
            />
          </section>
        </>
      ) : null}
    </ContentContainer>
  );
}
