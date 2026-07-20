"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createQuickResidentDocumentRequest,
  getResidentQuickView,
  logResidentVisitToday,
  type ResidentQuickViewPayload,
} from "@/lib/api";

type DocType =
  | "certificate_of_residency"
  | "certificate_of_indigency"
  | "barangay_clearance"
  | "business_clearance";

export default function ResidentQuickViewPage() {
  const params = useParams<{ residentId: string }>();
  const residentId = params.residentId;

  const [data, setData] = useState<ResidentQuickViewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadQuickView = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getResidentQuickView(residentId);
      setData(payload);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load resident quick view.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuickView();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadQuickView]);

  async function markVisited() {
    setBusyAction("visit");
    setMessage(null);
    setError(null);
    try {
      const response = await logResidentVisitToday(residentId);
      setMessage(response.detail);
      await loadQuickView();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to mark visit.";
      setError(text);
    } finally {
      setBusyAction(null);
    }
  }

  async function createDoc(documentType: DocType) {
    setBusyAction(documentType);
    setMessage(null);
    setError(null);
    try {
      const response = await createQuickResidentDocumentRequest(residentId, documentType);
      setMessage(`${response.document_type_display} request created: ${response.tracking_number}`);
      await loadQuickView();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to create document request.";
      setError(text);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <ContentContainer>
      <PageHeader
        eyebrow="QR Workflow"
        title="Resident Quick View"
        description={data ? data.resident.full_name : "Load resident quick profile from QR resolution."}
        meta={data ? <StatusBadge label={data.resident.is_active ? "Active" : "Inactive"} tone={data.resident.is_active ? "success" : "warning"} /> : undefined}
        actions={(
          <>
            <Link href="/residents" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">Back to Residents</Link>
            {data ? <Link href={`/residents/${data.resident.id}`} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">Open Full Profile</Link> : null}
            <Link href="/residents/scan/test" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">Scan Another QR</Link>
          </>
        )}
      />

      {loading ? <SectionCard description="Loading resident quick view..." /> : null}

      {error ? <ErrorState message={error} /> : null}

      {message ? <StatusBadge label={message} tone="success" /> : null}

      {data ? (
        <>
          <SectionCard>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton
                onClick={() => {
                  void markVisited();
                }}
                disabled={busyAction !== null}
              >
                {busyAction === "visit" ? "Marking..." : "Mark Visited Today"}
              </PrimaryButton>
              <SecondaryButton onClick={() => { void createDoc("certificate_of_residency"); }} disabled={busyAction !== null}>Create Residency Request</SecondaryButton>
              <SecondaryButton onClick={() => { void createDoc("certificate_of_indigency"); }} disabled={busyAction !== null}>Create Indigency Request</SecondaryButton>
              <SecondaryButton onClick={() => { void createDoc("barangay_clearance"); }} disabled={busyAction !== null}>Create Barangay Clearance</SecondaryButton>
              <SecondaryButton onClick={() => { void createDoc("business_clearance"); }} disabled={busyAction !== null}>Create Business Clearance</SecondaryButton>
            </div>
          </SectionCard>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Resident Summary" className="lg:col-span-2">
                <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Full Name</dt>
                    <dd className="font-medium">{data.resident.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Age</dt>
                    <dd>{data.resident.age}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Gender</dt>
                    <dd>{data.resident.gender}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Civil Status</dt>
                    <dd>{data.resident.civil_status || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Contact</dt>
                    <dd>{data.resident.contact_number || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Precinct</dt>
                    <dd>{data.resident.precinct_number || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Voter ID</dt>
                    <dd>{data.resident.voters_id || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">QR Code</dt>
                    <dd>{data.resident.qr_code || "N/A"}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-zinc-500">Address</dt>
                    <dd>{data.resident.complete_address || "N/A"}</dd>
                  </div>
                </dl>

                <h3 className="mt-5 text-base font-semibold">Emergency Information</h3>
                <dl className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Name</dt>
                    <dd>{data.resident.emergency_contact_name || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Number</dt>
                    <dd>{data.resident.emergency_contact_number || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Relationship</dt>
                    <dd>{data.resident.emergency_contact_relationship || "N/A"}</dd>
                  </div>
                </dl>
            </SectionCard>

            <SectionCard title="Special Categories">
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded px-2 py-1 ${data.resident.is_senior_citizen ? "bg-sky-100 text-sky-800" : "bg-zinc-100 text-zinc-600"}`}>
                    Senior
                  </span>
                  <span className={`rounded px-2 py-1 ${data.resident.is_4ps_beneficiary ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>
                    4Ps
                  </span>
                  <span className={`rounded px-2 py-1 ${data.resident.is_pwd ? "bg-violet-100 text-violet-800" : "bg-zinc-100 text-zinc-600"}`}>
                    PWD
                  </span>
                  <span className={`rounded px-2 py-1 ${data.resident.is_solo_parent ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
                    Solo Parent
                  </span>
                </div>
            </SectionCard>
          </section>

          <SectionCard title="Recent Service Logs">
            <DataTable
              columns={[
                { key: "action", header: "Action", render: (log) => log.action_display },
                { key: "notes", header: "Notes", render: (log) => log.notes || "-" },
                { key: "loggedBy", header: "Logged By", render: (log) => log.logged_by || "-" },
                { key: "created", header: "Created", render: (log) => new Date(log.created_at).toLocaleString() },
              ]}
              rows={data.recent_logs}
              rowKey={(log) => log.id}
              emptyTitle="No recent logs"
              emptyDescription="No recent logs yet."
            />
          </SectionCard>
        </>
      ) : null}
    </ContentContainer>
  );
}
