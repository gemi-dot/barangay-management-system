"use client";

import { type FormEvent, useEffect, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#eff6ff_45%,_#ffffff_75%)] px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/60">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-gradient-to-br from-orange-300/45 to-amber-200/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-gradient-to-br from-sky-300/40 to-cyan-200/20 blur-2xl" />

          <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Inventory</p>
          <h1 className="relative mt-2 text-3xl font-bold tracking-tight md:text-4xl">Asset Registry and Reports</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Unified operations view for barangay assets with live status tracking and searchable registry.
          </p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access inventory records.
          </section>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {canWrite && (
          <>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-900">Add Asset Entry Form</h2>
                <a
                  href={backendFormHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline"
                >
                  Open backend form
                </a>
              </div>

              {submitError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {submitSuccess}
                </p>
              )}

              <form onSubmit={handleCreateAsset} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={form.property_number}
                  onChange={(event) => setForm((current) => ({ ...current, property_number: event.target.value }))}
                  placeholder="Property number (optional)"
                  className="rounded-md border px-3 py-2 text-sm"
                />

                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                  disabled={optionsLoading}
                  required
                >
                  {optionsLoading && <option value="">Loading categories...</option>}
                  {!optionsLoading && categoryOptions.length === 0 && <option value="">No categories</option>}
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
                  className="rounded-md border px-3 py-2 text-sm md:col-span-2"
                  required
                />

                <input
                  value={form.serial_number}
                  onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))}
                  placeholder="Serial number"
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <input
                  value={form.brand_model}
                  onChange={(event) => setForm((current) => ({ ...current, brand_model: event.target.value }))}
                  placeholder="Brand / Model"
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={form.date_acquired}
                  onChange={(event) => setForm((current) => ({ ...current, date_acquired: event.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
                  placeholder="Cost"
                  className="rounded-md border px-3 py-2 text-sm"
                />

                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="lost">Lost</option>
                  <option value="disposed">Disposed</option>
                </select>
                <select
                  value={form.condition}
                  onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                  className="rounded-md border px-3 py-2 text-sm"
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
                  className="rounded-md border px-3 py-2 text-sm"
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
                  className="rounded-md border px-3 py-2 text-sm xl:col-span-3"
                  rows={2}
                />

                <button
                  type="submit"
                  disabled={submitting || optionsLoading}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Add Asset Entry"}
                </button>
              </form>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                <p className="mt-1 text-2xl font-bold">{summary?.total_assets ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Active</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{summary?.active_assets ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Under Repair</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{summary?.under_repair_assets ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Lost</p>
                <p className="mt-1 text-2xl font-bold text-orange-700">{summary?.lost_assets ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-rose-500 to-pink-600" />
                <p className="text-xs uppercase tracking-wide text-zinc-500">Disposed</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">{summary?.disposed_assets ?? 0}</p>
              </article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search property no, description, category"
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="lost">Lost</option>
                  <option value="disposed">Disposed</option>
                </select>
                <div className="rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {count} assets
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-zinc-600">Loading inventory assets...</p>
              ) : (
                <div className="max-h-[30rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-1 font-medium">Property #</th>
                        <th className="px-2 py-1 font-medium">Description</th>
                        <th className="px-2 py-1 font-medium">Category</th>
                        <th className="px-2 py-1 font-medium">Status</th>
                        <th className="px-2 py-1 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="px-2 py-1 font-medium">{asset.property_number}</td>
                          <td className="px-2 py-1">{asset.description}</td>
                          <td className="px-2 py-1">{asset.category}</td>
                          <td className="px-2 py-1">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-2 py-1">{asset.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-zinc-600">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
