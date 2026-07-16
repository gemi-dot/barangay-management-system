"use client";

import { useState } from "react";

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
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Resident Services</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Track Document Request</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter your tracking number to view the latest document request status.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Example: DR-20260716-001"
              className="flex-1 rounded-md border px-3 py-2 text-sm uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Track"}
            </button>
          </form>

          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Request Details</h2>
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
                <dd className="font-medium">{result.status_display}</dd>
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
            <div className="mt-3 rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <span className="font-medium">Remarks: </span>
              {result.remarks || "No remarks yet."}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
