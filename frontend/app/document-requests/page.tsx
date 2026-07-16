"use client";

import { useEffect, useMemo, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import {
  getStaffDocumentRequests,
  updateStaffDocumentRequestStatus,
  type StaffDocumentRequest,
} from "@/lib/api";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "released", label: "Released" },
  { value: "rejected", label: "Rejected" },
] as const;

const QUICK_ACTIONS = [
  { value: "processing", label: "Mark processing" },
  { value: "ready_for_pickup", label: "Mark ready" },
  { value: "released", label: "Mark released" },
  { value: "rejected", label: "Reject" },
] as const;

export default function DocumentRequestsPage() {
  const { canWrite } = useSessionAuth();

  const [rows, setRows] = useState<StaffDocumentRequest[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!canWrite) {
        setRows([]);
        setCount(0);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getStaffDocumentRequests({
          page,
          page_size: PAGE_SIZE,
          status: status || undefined,
        });

        if (!cancelled) {
          setRows(data.results);
          setCount(data.count);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load document requests.";
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
  }, [canWrite, page, status]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  async function runStatusUpdate(requestId: number, nextStatus: string) {
    const remarksInput = window.prompt("Remarks (optional)", "") ?? null;
    if (remarksInput === null) {
      return;
    }

    setUpdatingId(requestId);
    setError(null);
    try {
      await updateStaffDocumentRequestStatus(requestId, nextStatus, remarksInput.trim());
      const refreshed = await getStaffDocumentRequests({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
      });
      setRows(refreshed.results);
      setCount(refreshed.count);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update request status.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Document Requests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Document Requests Queue</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Staff module for tracking, filtering, and updating request statuses in real time.
          </p>
        </section>

        {!canWrite && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Staff login is required to access document request queue data.
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
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Filter by status</span>
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Totals</span>
                  <div className="rounded-md border bg-gray-50 px-3 py-2 text-gray-800">
                    {count} request{count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl bg-white shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Tracking #</th>
                      <th className="px-4 py-3 text-left font-semibold">Resident</th>
                      <th className="px-4 py-3 text-left font-semibold">Document</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          No document requests found for the selected filter.
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          Loading document requests...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      rows.map((row) => (
                        <tr key={row.id} className="border-t align-top hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.tracking_number}</td>
                          <td className="px-4 py-3 text-gray-700">
                            <p className="font-medium text-gray-900">{row.full_name}</p>
                            <p>{row.contact_number}</p>
                            <p>{row.email || "-"}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <p className="font-medium text-gray-900">{row.document_type_display}</p>
                            <p className="max-w-xs">{row.purpose}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <p className="font-medium text-gray-900">{row.status_display}</p>
                            <p className="text-xs text-gray-500">By: {row.processed_by || "-"}</p>
                            <p className="text-xs text-gray-500">Remarks: {row.remarks || "-"}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {QUICK_ACTIONS.map((action) => (
                                <button
                                  key={action.value}
                                  type="button"
                                  onClick={() => {
                                    void runStatusUpdate(row.id, action.value);
                                  }}
                                  disabled={updatingId === row.id}
                                  className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {updatingId === row.id ? "Updating..." : action.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
                <p className="text-gray-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
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
