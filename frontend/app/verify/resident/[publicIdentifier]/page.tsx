"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, BadgeX } from "lucide-react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { verifyPublicResidentQr, type PublicResidentVerification } from "@/lib/api";

const STATUS_COPY: Record<string, string> = {
  valid: "This is a valid Barangay Resident QR identity.",
  unknown: "This QR identity is unknown or unavailable.",
  revoked: "This QR identity has been revoked and is no longer valid.",
  reissued: "This QR identity has been replaced by a newer identity.",
  inactive_resident: "This resident record is currently inactive; this QR is not valid for active-residency verification.",
  transferred_resident: "Barangay records indicate that this resident has transferred; this QR is no longer valid for active-residency verification.",
  deceased_resident: "Barangay records respectfully indicate that this resident is deceased; this QR is no longer valid.",
  archived_resident: "This resident record is archived or unavailable; this QR is no longer valid.",
};

export default function PublicResidentVerificationPage() {
  const params = useParams<{ publicIdentifier: string }>();
  const [data, setData] = useState<PublicResidentVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyPublicResidentQr(decodeURIComponent(params.publicIdentifier || "")).then((result) => {
      if (!cancelled) setData(result);
    }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Verification failed."); });
    return () => { cancelled = true; };
  }, [params.publicIdentifier]);

  return <ContentContainer><div className="mx-auto max-w-3xl py-10">
    {error ? <ErrorState message={error} /> : null}
    {!data && !error ? <SectionCard description="Verifying resident QR identity..." /> : null}
    {data ? <SectionCard className={data.valid ? "border-emerald-300" : "border-amber-300"}>
      <div className="text-center">{data.valid ? <BadgeCheck className="mx-auto h-16 w-16 text-emerald-600" /> : <BadgeX className="mx-auto h-16 w-16 text-amber-600" />}<h1 className="mt-4 text-2xl font-bold text-slate-950">Resident QR Verification</h1><div className="mt-3"><StatusBadge label={data.status.replaceAll("_", " ")} tone={data.valid ? "success" : "warning"} /></div><p className="mx-auto mt-3 max-w-xl text-slate-600">{STATUS_COPY[data.status] || STATUS_COPY.unknown}</p></div>
      {data.resident_name ? <dl className="mx-auto mt-6 max-w-lg divide-y divide-slate-100 rounded-xl bg-slate-50 px-5"><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Resident</dt><dd className="font-semibold text-slate-900">{data.resident_name}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Barangay</dt><dd>{data.barangay}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Residency status</dt><dd>{data.residency_status}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">QR status</dt><dd>{data.qr_status}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Issued</dt><dd>{data.issued_at ? new Date(data.issued_at).toLocaleDateString() : "—"}</dd></div></dl> : null}
      <p className="mt-6 text-center text-xs text-slate-500">This public verification intentionally excludes contact details, birth information, private address, health, family, and internal barangay records.</p>
    </SectionCard> : null}
  </div></ContentContainer>;
}
