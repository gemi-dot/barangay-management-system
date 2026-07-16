import Link from "next/link";

import type { StaffDocumentRequest } from "@/lib/api";

type DashboardDocumentQueueProps = {
  requests: StaffDocumentRequest[];
  loading?: boolean;
  canWrite: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusClasses(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "ready_for_pickup":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "released":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

export function DashboardDocumentQueue({ requests, loading = false, canWrite }: DashboardDocumentQueueProps) {
  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document Service Queue</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Recent service requests</h2>
        </div>
        <Link href="/document-requests" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
          View all
        </Link>
      </div>

      {!canWrite ? (
        <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Staff login is required to view document service queue records.
        </div>
      ) : loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-[0.9rem] bg-slate-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No recent document requests found.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-semibold">Request #</th>
                <th className="px-2 py-2 font-semibold">Resident</th>
                <th className="px-2 py-2 font-semibold">Document</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Submitted</th>
                <th className="px-2 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 5).map((request) => (
                <tr key={request.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-3 font-semibold text-slate-900">{request.tracking_number}</td>
                  <td className="px-2 py-3 text-slate-700">{request.full_name}</td>
                  <td className="px-2 py-3 text-slate-700">{request.document_type_display}</td>
                  <td className="px-2 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(request.status)}`}>
                      {request.status_display}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-slate-600">{formatDate(request.created_at)}</td>
                  <td className="px-2 py-3">
                    <Link href="/document-requests" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
