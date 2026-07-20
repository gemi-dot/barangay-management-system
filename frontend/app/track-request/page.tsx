"use client";

import { useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { trackDocumentRequest, type DocumentRequestTracking } from "@/lib/api";

export default function TrackRequestPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentRequestTracking | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = trackingNumber.trim().toUpperCase();
    if (!code) {
      setError("Please enter a tracking number.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await trackDocumentRequest(code);
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tracking lookup failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ContentContainer>
      <PageHeader
        eyebrow="Resident Services"
        title="Track Document Request"
        description="Enter your tracking number to view the latest document request status."
      />

      <SectionCard>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Example: DR-20260716-001"
            className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm uppercase"
          />
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Checking..." : "Track"}
          </PrimaryButton>
        </form>

        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}
      </SectionCard>

      {result ? (
        <SectionCard title="Request Details">
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Tracking Number</dt>
              <dd className="font-medium">{result.tracking_number}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Full Name</dt>
              <dd>{result.full_name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Document Type</dt>
              <dd>{result.document_type_display}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd><StatusBadge label={result.status_display} tone="info" /></dd>
            </div>
            <div>
              <dt className="text-zinc-500">Created</dt>
              <dd>{new Date(result.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last Updated</dt>
              <dd>{new Date(result.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
          <div className="mt-3 rounded-md border border-[var(--color-border)] bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <span className="font-medium">Remarks: </span>
            {result.remarks || "No remarks yet."}
          </div>
        </SectionCard>
      ) : null}
    </ContentContainer>
  );
}
