"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">QR Workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Resident Quick View</h1>
          {data && (
            <p className="mt-2 text-sm text-zinc-600">
              {data.resident.full_name} • {data.resident.is_active ? "Active" : "Inactive"}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/residents" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Back to Residents
            </Link>
            {data && (
              <Link
                href={`/residents/${data.resident.id}`}
                className="rounded border px-3 py-2 text-sm hover:bg-zinc-100"
              >
                Open Full Profile
              </Link>
            )}
            <Link href="/residents/scan/test" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Scan Another QR
            </Link>
          </div>
        </section>

        {loading && (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-sm shadow-sm">
            Loading resident quick view...
          </section>
        )}

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {message && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </section>
        )}

        {data && (
          <>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void markVisited();
                  }}
                  disabled={busyAction !== null}
                  className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {busyAction === "visit" ? "Marking..." : "Mark Visited Today"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void createDoc("certificate_of_residency");
                  }}
                  disabled={busyAction !== null}
                  className="rounded border px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                >
                  Create Residency Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void createDoc("certificate_of_indigency");
                  }}
                  disabled={busyAction !== null}
                  className="rounded border px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                >
                  Create Indigency Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void createDoc("barangay_clearance");
                  }}
                  disabled={busyAction !== null}
                  className="rounded border px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                >
                  Create Barangay Clearance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void createDoc("business_clearance");
                  }}
                  disabled={busyAction !== null}
                  className="rounded border px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                >
                  Create Business Clearance
                </button>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-semibold">Resident Summary</h2>
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
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Special Categories</h2>
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
              </article>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Recent Service Logs</h2>
              {data.recent_logs.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No recent logs yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="px-2 py-1 font-medium">Action</th>
                        <th className="px-2 py-1 font-medium">Notes</th>
                        <th className="px-2 py-1 font-medium">Logged By</th>
                        <th className="px-2 py-1 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_logs.map((log) => (
                        <tr key={log.id} className="border-b border-zinc-100">
                          <td className="px-2 py-1">{log.action_display}</td>
                          <td className="px-2 py-1">{log.notes || "-"}</td>
                          <td className="px-2 py-1">{log.logged_by || "-"}</td>
                          <td className="px-2 py-1">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
