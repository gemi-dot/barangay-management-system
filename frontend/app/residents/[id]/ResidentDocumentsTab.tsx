"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createQuickResidentDocumentRequest, getResidentDocumentRequirements,
  updateStaffDocumentRequestStatus, type ResidentDetailResponse, type ResidentDocumentRequirements,
} from "@/lib/api";
import { canSubmitResidentDocument } from "@/lib/resident-phase2.mjs";
import { LocalDateTime } from "./LocalDateTime";

type DocumentRecord = ResidentDetailResponse["documents"][number];

function tone(status: string) {
  if (status === "released" || status === "ready_for_pickup") return "success" as const;
  if (status === "rejected" || status === "cancelled") return "danger" as const;
  if (status === "processing") return "info" as const;
  return "warning" as const;
}

export function ResidentDocumentsTab({ residentId, documents, canManage }: { residentId: number; documents: DocumentRecord[]; canManage: boolean }) {
  const router = useRouter();
  const [requirements, setRequirements] = useState<ResidentDocumentRequirements | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getResidentDocumentRequirements(residentId).then((data) => {
      if (!cancelled) { setRequirements(data); setDocumentType(data.document_types[0]?.value || ""); }
    }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load document requirements."); });
    return () => { cancelled = true; };
  }, [residentId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await createQuickResidentDocumentRequest(residentId, documentType, purpose, remarks);
      setSuccess(`Request ${result.tracking_number} created.`); setPurpose(""); setRemarks(""); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create request."); }
    finally { setBusy(false); }
  }

  async function transition(document: DocumentRecord, status: string) {
    setBusy(true); setError(null);
    try { await updateStaffDocumentRequestStatus(document.id, status, "Updated from Resident Profile."); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update request."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    {error ? <ErrorState message={error} /> : null}
    {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div> : null}
    {canManage ? <SectionCard title="Request document" description="Resident identity is selected and auto-filled from this official profile.">
      {requirements ? <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><strong>Resident:</strong> {requirements.resident.full_name}</p><p><strong>Age:</strong> {requirements.resident.age}</p><p><strong>Civil status:</strong> {requirements.resident.civil_status}</p><p><strong>Address:</strong> {requirements.resident.address}</p></div> : null}
      {requirements?.warnings.length ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Complete the Resident Profile before requesting an official document:</p><ul className="mt-1 list-disc pl-5">{requirements.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><Link href={`/residents/${residentId}?tab=personal`} className="mt-2 inline-block font-semibold text-blue-700 hover:underline">Review Personal Information</Link></div> : null}
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><label className="text-sm"><span className="mb-1 block font-medium">Document type</span><select required value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">{requirements?.document_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-sm"><span className="mb-1 block font-medium">Purpose</span><input required value={purpose} onChange={(event) => setPurpose(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label><label className="text-sm md:col-span-2"><span className="mb-1 block font-medium">Additional remarks</span><textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label><div className="md:col-span-2"><PrimaryButton type="submit" disabled={!canSubmitResidentDocument(requirements?.warnings || [], canManage, busy)}>{busy ? "Submitting..." : "Submit Request"}</PrimaryButton></div></form>
    </SectionCard> : null}
    <SectionCard title="Documents and certificates" description={`${documents.length} linked request${documents.length === 1 ? "" : "s"}.`}>
      {documents.length ? <div className="divide-y divide-slate-100">{documents.map((document) => <article key={document.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{document.document_type_display}</h3><StatusBadge label={document.status_display} tone={tone(document.status)} /></div><p className="mt-1 text-sm text-slate-600">{document.purpose}</p><p className="mt-1 text-xs text-slate-500">{document.document_number} · {document.request_source_display} · <LocalDateTime value={document.created_at} /></p></div><div className="flex flex-wrap gap-2">{document.print_url ? <Link href={document.print_url} target="_blank" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print</Link> : null}{canManage ? document.available_transitions.map((status) => <SecondaryButton key={status} disabled={busy} onClick={() => void transition(document, status)}>{status.replaceAll("_", " ")}</SecondaryButton>) : null}</div></div><dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><div><dt>Processed by</dt><dd className="font-medium text-slate-900">{document.processed_by || "—"}</dd></div><div><dt>Approval date</dt><dd>{document.approved_at ? <LocalDateTime value={document.approved_at} /> : "—"}</dd></div><div><dt>Release date</dt><dd>{document.released_at ? <LocalDateTime value={document.released_at} /> : "—"}</dd></div></dl>{document.remarks ? <p className="mt-2 text-sm text-slate-600">Remarks: {document.remarks}</p> : null}</article>)}</div> : <p className="text-sm text-slate-500">No linked document requests.</p>}
    </SectionCard>
  </div>;
}
