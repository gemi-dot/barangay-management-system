"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ResidentListItem } from "@/lib/api";

type Props = {
  residents: ResidentListItem[];
  loading?: boolean;
  error?: string | null;
};

const PAGE_SIZE = 5;

function getResidentName(resident: ResidentListItem) {
  if (resident.full_name) {
    return resident.full_name;
  }

  return [resident.last_name, resident.first_name]
    .filter(Boolean)
    .join(", ");
}

function matchesSearch(resident: ResidentListItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    resident.full_name,
    resident.first_name,
    resident.middle_name,
    resident.last_name,
    resident.zone,
    resident.precinct_number,
    resident.gender,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function DashboardResidentsPreview({ residents, loading = false, error = null }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => matchesSearch(resident, search.trim()));
  }, [residents, search]);

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageResidents = filteredResidents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Residents Preview
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Latest resident records</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search residents"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-72"
          />
          <Link
            href="/residents"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          >
            View All
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Resident Name</th>
                <th className="px-4 py-3 font-semibold">Purok</th>
                <th className="px-4 py-3 font-semibold">Gender</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold">Precinct</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading resident preview...
                  </td>
                </tr>
              )}

              {!loading && pageResidents.length > 0 ? (
                pageResidents.map((resident) => (
                  <tr key={resident.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {getResidentName(resident)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{resident.zone || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{resident.gender || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">-</td>
                    <td className="px-4 py-3 text-slate-600">{resident.precinct_number || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          resident.is_active === false
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {resident.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/residents/${resident.id}`} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                        View Resident
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No residents match the current search.
                  </td>
                </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing {pageResidents.length} of {filteredResidents.length} resident(s)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={safePage <= 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={safePage >= totalPages}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
