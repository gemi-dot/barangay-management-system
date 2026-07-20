"use client";

import { useEffect, useMemo, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  const [pendingAction, setPendingAction] = useState<{
    row: StaffDocumentRequest;
    nextStatus: string;
    label: string;
  } | null>(null);
  const [remarks, setRemarks] = useState("");

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

  async function runStatusUpdate(requestId: number, nextStatus: string, nextRemarks: string) {
    setUpdatingId(requestId);
    setError(null);
    try {
      await updateStaffDocumentRequestStatus(requestId, nextStatus, nextRemarks.trim());
      const refreshed = await getStaffDocumentRequests({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
      });
      setRows(refreshed.results);
      setCount(refreshed.count);
      setPendingAction(null);
      setRemarks("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update request status.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="Document Requests"
        title="Document Requests Queue"
        description="Staff module for tracking, filtering, and updating request statuses in real time."
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to access document request queue data."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {canWrite ? (
        <>
          <FilterBar>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Filter by status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Totals</span>
              <div className="rounded-md border border-[var(--color-border)] bg-gray-50 px-3 py-2 text-gray-800">
                {count} request{count === 1 ? "" : "s"}
              </div>
            </div>
          </FilterBar>

          <DataTable
            columns={[
              {
                key: "tracking",
                header: "Tracking #",
                render: (row) => <span className="font-medium text-gray-900">{row.tracking_number}</span>,
              },
              {
                key: "resident",
                header: "Resident",
                render: (row) => (
                  <div>
                    <p className="font-medium text-gray-900">{row.full_name}</p>
                    <p>{row.contact_number}</p>
                    <p>{row.email || "-"}</p>
                  </div>
                ),
              },
              {
                key: "document",
                header: "Document",
                render: (row) => (
                  <div>
                    <p className="font-medium text-gray-900">{row.document_type_display}</p>
                    <p className="max-w-xs">{row.purpose}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <div>
                    <p className="font-medium text-gray-900">{row.status_display}</p>
                    <p className="text-xs text-gray-500">By: {row.processed_by || "-"}</p>
                    <p className="text-xs text-gray-500">Remarks: {row.remarks || "-"}</p>
                  </div>
                ),
              },
              {
                key: "submitted",
                header: "Submitted",
                render: (row) => new Date(row.created_at).toLocaleString(),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <SecondaryButton
                        key={action.value}
                        onClick={() => {
                          setPendingAction({ row, nextStatus: action.value, label: action.label });
                        }}
                        disabled={updatingId === row.id}
                        className="px-2 py-1 text-xs"
                      >
                        {updatingId === row.id ? "Updating..." : action.label}
                      </SecondaryButton>
                    ))}
                  </div>
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="No requests found"
            emptyDescription="No document requests found for the selected filter."
          />

          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-gray-600">
                Page {page} of {totalPages}
              </p>
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

      <ConfirmationModal
        open={Boolean(pendingAction)}
        title={pendingAction ? pendingAction.label : "Update status"}
        message={pendingAction ? `Update ${pendingAction.row.tracking_number} to ${pendingAction.row.status_display}?` : ""}
        confirmLabel="Apply status"
        confirming={pendingAction ? updatingId === pendingAction.row.id : false}
        onCancel={() => {
          setPendingAction(null);
          setRemarks("");
        }}
        onConfirm={() => {
          if (pendingAction) {
            void runStatusUpdate(pendingAction.row.id, pendingAction.nextStatus, remarks);
          }
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Remarks (optional)</span>
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
          />
        </label>
      </ConfirmationModal>
    </ContentContainer>
  );
}
