"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { issueResidentQr, reissueResidentQr, revokeResidentQr, type ResidentDetailResponse } from "@/lib/api";
import { qrActionAvailability } from "@/lib/resident-phase2.mjs";
import { LocalDateTime } from "./LocalDateTime";

export function ResidentQrIdentityTab({ resident }: { resident: ResidentDetailResponse }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identity = resident.qr_profile.identity;
  const actions = qrActionAvailability(identity?.status, reason);
  const permissions = resident.permissions.actions;

  async function act(action: "issue" | "reissue" | "revoke") {
    setBusy(true); setError(null);
    try {
      if (action === "issue") await issueResidentQr(resident.identity.id);
      if (action === "reissue") await reissueResidentQr(resident.identity.id, reason);
      if (action === "revoke") await revokeResidentQr(resident.identity.id, reason);
      setReason(""); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "QR action failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    {error ? <ErrorState message={error} /> : null}
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <SectionCard title="Resident QR identity">{resident.qr_profile.image_url ? <Image src={resident.qr_profile.image_url} alt={`QR identity for ${resident.identity.full_name}`} width={260} height={260} className="mx-auto h-64 w-64 object-contain" unoptimized /> : <p className="py-20 text-center text-sm text-slate-500">QR image unavailable</p>}</SectionCard>
      <SectionCard title="Identity status"><div className="flex flex-wrap items-center gap-2"><StatusBadge label={identity?.status || "Not issued"} tone={identity?.status === "active" && resident.system.is_active ? "success" : "warning"} />{!resident.system.is_active ? <StatusBadge label="Inactive resident" tone="danger" /> : null}</div><dl className="mt-4 space-y-2 text-sm"><div><dt className="text-slate-500">Public identifier</dt><dd className="font-mono font-medium">{identity?.identifier || resident.qr_profile.code}</dd></div><div><dt className="text-slate-500">Issued</dt><dd>{identity ? <LocalDateTime value={identity.issued_at} /> : "Legacy identity not registered"}</dd></div><div><dt className="text-slate-500">Issued by</dt><dd>{identity?.issued_by || "System"}</dd></div></dl><div className="mt-5 flex flex-wrap gap-2">{permissions.issue_qr && actions.issue ? <PrimaryButton disabled={busy} onClick={() => void act("issue")}>Issue QR Identity</PrimaryButton> : null}{identity?.status === "active" ? <>{permissions.reissue_qr ? <SecondaryButton disabled={busy || !actions.reissue} onClick={() => void act("reissue")}>Reissue</SecondaryButton> : null}{permissions.revoke_qr ? <SecondaryButton disabled={busy || !actions.revoke} onClick={() => void act("revoke")}>Revoke</SecondaryButton> : null}</> : null}{permissions.verify_qr ? <Link href={`/verify/resident/${encodeURIComponent(identity?.identifier || resident.qr_profile.code)}`} target="_blank" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Public Verification</Link> : null}{permissions.print_qr ? <Link href={`/residents/documents/barangay-id/sample/${resident.identity.id}/`} target="_blank" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Print QR ID</Link> : null}</div>{identity?.status === "active" && (permissions.reissue_qr || permissions.revoke_qr) ? <label className="mt-4 block text-sm"><span className="mb-1 block font-medium">Required reason for reissue or revocation</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label> : null}</SectionCard>
    </section>
    <SectionCard title="QR audit history">{resident.qr_profile.history.length ? <div className="divide-y divide-slate-100">{resident.qr_profile.history.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-3 py-3"><div><p className="font-medium">{event.event_display}</p><p className="text-sm text-slate-600">{event.remarks || event.result}</p><p className="text-xs text-slate-500">{event.performed_by || "Public/System"}</p></div><LocalDateTime value={event.created_at} /></div>)}</div> : <p className="text-sm text-slate-500">No QR audit events recorded.</p>}</SectionCard>
  </div>;
}
