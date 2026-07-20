"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getQuickGenderCorrection,
  saveQuickGenderCorrection,
  type QuickGenderResidentRow,
} from "@/lib/api";

type RowDraft = QuickGenderResidentRow;

export default function QuickGenderCorrectionPage() {
  const [zone, setZone] = useState("Purok Ipil-ipil");
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const maleCount = useMemo(() => rows.filter((row) => row.gender === "M").length, [rows]);
  const femaleCount = useMemo(() => rows.filter((row) => row.gender === "F").length, [rows]);

  const loadData = useCallback(async (nextZone?: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await getQuickGenderCorrection(nextZone || zone);
      setZone(data.zone_filter);
      setZoneOptions(data.zone_options);
      setRows(data.residents);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load quick gender correction data.";
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
      const result = await saveQuickGenderCorrection(
        zone,
        rows.map((row) => ({ id: row.id, date_of_birth: row.date_of_birth, gender: row.gender })),
      );
      setMessage(
        `Updated ${result.gender_updates} gender record(s) and ${result.birthday_updates} birthday record(s).`,
      );
      if (result.invalid_birthday_rows > 0) {
        setMessage((prev) => `${prev} ${result.invalid_birthday_rows} invalid birthday value(s) were skipped.`);
      }
      await loadData(zone);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save corrections.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ContentContainer>
      <PageHeader
        eyebrow="Quick Tools"
        title="Quick Resident Record Correction"
        actions={<Link href="/residents" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">Back to Residents</Link>}
      />

      <FilterBar
        rightSlot={
          <div className="flex flex-wrap gap-2 text-sm">
            <StatusBadge label={`Total: ${rows.length}`} />
            <StatusBadge label={`Male: ${maleCount}`} tone="info" />
            <StatusBadge label={`Female: ${femaleCount}`} tone="info" />
          </div>
        }
      >
            <label className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Purok</span>
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                {zoneOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <SecondaryButton onClick={() => { void loadData(zone); }}>
              Load Residents
            </SecondaryButton>
      </FilterBar>

      {error ? <ErrorState message={error} /> : null}

      {message ? <StatusBadge label={message} tone="success" /> : null}

      <SectionCard
        title="Update Resident Record by Resident"
        actions={<PrimaryButton onClick={() => { void onSaveAll(); }} disabled={saving || loading}>{saving ? "Saving..." : "Save All Changes"}</PrimaryButton>}
      >
        <DataTable
          columns={[
            { key: "id", header: "ID", render: (row) => row.id },
            { key: "name", header: "Name", render: (row) => row.full_name },
            {
              key: "dob",
              header: "Date of Birth",
              render: (row) => (
                <input
                  type="date"
                  value={row.date_of_birth || ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, date_of_birth: value } : item)));
                  }}
                  className="rounded border border-[var(--color-border)] px-2 py-1"
                />
              ),
            },
            {
              key: "gender",
              header: "Gender",
              render: (row) => (
                <select
                  value={row.gender}
                  onChange={(event) => {
                    const value = event.target.value as "M" | "F";
                    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, gender: value } : item)));
                  }}
                  className="rounded border border-[var(--color-border)] px-2 py-1"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No active residents"
          emptyDescription="No active residents found for this purok."
        />
      </SectionCard>
    </ContentContainer>
  );
}
