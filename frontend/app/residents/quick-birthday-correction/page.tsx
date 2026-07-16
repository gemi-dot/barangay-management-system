"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  getQuickBirthdayCorrection,
  saveQuickBirthdayCorrection,
  type QuickBirthdayResidentRow,
} from "@/lib/api";

type RowDraft = QuickBirthdayResidentRow;

export default function QuickBirthdayCorrectionPage() {
  const [zone, setZone] = useState("Purok Ipil-ipil");
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [defaultDobCount, setDefaultDobCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async (nextZone?: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await getQuickBirthdayCorrection(nextZone || zone);
      setZone(data.zone_filter);
      setZoneOptions(data.zone_options);
      setRows(data.residents);
      setDefaultDobCount(data.default_dob_count);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load quick birthday correction data.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }, [zone]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function onSaveAll() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await saveQuickBirthdayCorrection(
        zone,
        rows.map((row) => ({ id: row.id, date_of_birth: row.date_of_birth })),
      );
      setMessage(`Updated ${result.birthday_updates} resident birthday record(s).`);
      if (result.invalid_birthday_rows > 0) {
        setMessage((prev) => `${prev} ${result.invalid_birthday_rows} invalid birthday value(s) were skipped.`);
      }
      await loadData(zone);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save birthday corrections.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick Tools</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Quick Birthday Correction</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/residents" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Back to Residents
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Purok</span>
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                className="rounded-md border px-3 py-2"
              >
                {zoneOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                void loadData(zone);
              }}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Load Residents
            </button>
            <div className="ml-auto flex flex-wrap gap-3 text-sm">
              <span>
                <strong>Total:</strong> {rows.length}
              </span>
              <span>
                <strong>Needs DOB Review:</strong> {defaultDobCount}
              </span>
            </div>
          </div>
        </section>

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

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Update Birthday by Resident</h2>
            <button
              type="button"
              onClick={() => {
                void onSaveAll();
              }}
              disabled={saving || loading}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-600">Loading residents...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-zinc-600">No active residents found for this purok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="px-2 py-1 font-medium">ID</th>
                    <th className="px-2 py-1 font-medium">Name</th>
                    <th className="px-2 py-1 font-medium">Date of Birth</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100">
                      <td className="px-2 py-1">{row.id}</td>
                      <td className="px-2 py-1">{row.full_name}</td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={row.date_of_birth || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRows((prev) =>
                              prev.map((item) => (item.id === row.id ? { ...item, date_of_birth: value } : item)),
                            );
                          }}
                          className="rounded border px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
