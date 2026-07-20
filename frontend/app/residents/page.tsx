"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, House, ScanLine, UserPlus, Users } from "lucide-react";

import { ExecutivePageHeader } from "@/components/enterprise/ExecutivePageHeader";
import { ExportButtons } from "@/components/enterprise/ExportButtons";
import { ModuleQuickActions } from "@/components/enterprise/ModuleQuickActions";
import { StatisticsSidebar } from "@/components/enterprise/StatisticsSidebar";
import { ContentContainer } from "@/components/layout/ContentContainer";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createResident,
  getResidentById,
  getResidentsPaginated,
  setResidentActive,
  type ResidentListItem,
  type ResidentUpsertPayload,
  updateResident,
} from "@/lib/api";

const PAGE_SIZE = 20;
const ZONE_OPTIONS = [
  "Purok Talisay",
  "Purok Malunggay",
  "Purok Mancinitas",
  "Purok Narra",
  "Purok Kulo",
  "Purok Ipil-ipil",
  "Purok Tugas",
];

type ResidentFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  date_of_birth: string;
  gender: "M" | "F";
  zone: string;
  precinct_number: string;
  contact_number: string;
  email: string;
};

type FormErrors = Partial<Record<keyof ResidentFormState, string>>;

const EMPTY_FORM: ResidentFormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  date_of_birth: "",
  gender: "M",
  zone: "Purok Talisay",
  precinct_number: "",
  contact_number: "",
  email: "",
};

function getResidentName(resident: ResidentListItem) {
  if (resident.full_name) {
    return resident.full_name;
  }

  return [resident.first_name, resident.middle_name, resident.last_name]
    .filter(Boolean)
    .join(" ");
}

function getResidentPurok(resident: ResidentListItem) {
  return resident.purok || resident.zone || "-";
}

function validateForm(form: ResidentFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.first_name.trim()) {
    errors.first_name = "First name is required.";
  }
  if (!form.last_name.trim()) {
    errors.last_name = "Last name is required.";
  }
  if (!form.date_of_birth) {
    errors.date_of_birth = "Date of birth is required.";
  }
  if (!ZONE_OPTIONS.includes(form.zone)) {
    errors.zone = "Please select a valid purok.";
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (form.contact_number && !/^\+?[0-9]{9,15}$/.test(form.contact_number)) {
    errors.contact_number = "Use 9-15 digits, optional leading +.";
  }

  return errors;
}

function buildPayload(form: ResidentFormState): ResidentUpsertPayload {
  return {
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    suffix: form.suffix.trim(),
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    zone: form.zone,
    precinct_number: form.precinct_number.trim(),
    contact_number: form.contact_number.trim(),
    email: form.email.trim(),
  };
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<ResidentListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);
  const [form, setForm] = useState<ResidentFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingStatusResident, setPendingStatusResident] = useState<ResidentListItem | null>(null);
  const requestIdRef = useRef(0);

  const { session, loading: authLoading, canWrite } = useSessionAuth();

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [count]);

  const tableColumns = useMemo(() => {
    return [
      {
        key: "name",
        header: "Name",
        render: (resident: ResidentListItem) => (
          <Link href={`/residents/${resident.id}`} className="font-medium text-gray-900 hover:underline">
            {getResidentName(resident)}
          </Link>
        ),
      },
      {
        key: "purok",
        header: "Purok",
        render: (resident: ResidentListItem) => getResidentPurok(resident),
      },
      {
        key: "precinct",
        header: "Precinct",
        render: (resident: ResidentListItem) => resident.precinct_number || "-",
      },
      {
        key: "gender",
        header: "Gender",
        render: (resident: ResidentListItem) => resident.gender || "-",
      },
      {
        key: "status",
        header: "Status",
        render: (resident: ResidentListItem) =>
          resident.is_active === false ? (
            <StatusBadge label="Inactive" tone="warning" />
          ) : (
            <StatusBadge label="Active" tone="success" />
          ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (resident: ResidentListItem) => (
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <SecondaryButton
                onClick={() => {
                  void openEditForm(resident);
                }}
                className="px-2 py-1 text-xs"
              >
                Edit
              </SecondaryButton>
            ) : null}
            {canWrite ? (
              <SecondaryButton
                onClick={() => {
                  setPendingStatusResident(resident);
                }}
                className="px-2 py-1 text-xs"
              >
                {resident.is_active === false ? "Reactivate" : "Deactivate"}
              </SecondaryButton>
            ) : null}
            <Link href={`/residents/${resident.id}`} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-slate-50">
              View
            </Link>
          </div>
        ),
      },
    ];
  }, [canWrite]);

  type ResidentsLoadOptions = {
    targetPage?: number;
    targetSearchQuery?: string;
    targetZone?: string;
    targetStatus?: "all" | "active" | "inactive";
  };

  async function reloadResidents({
    targetPage = page,
    targetSearchQuery = searchQuery,
    targetZone = zone,
    targetStatus = status,
  }: ResidentsLoadOptions = {}) {
    // Keep signed-out residents view clean and avoid noisy "Failed to fetch" banners.
    if (!authLoading && !session?.is_authenticated) {
      setResidents([]);
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await getResidentsPaginated({
        page: targetPage,
        page_size: PAGE_SIZE,
        search: targetSearchQuery || undefined,
        zone: targetZone !== "all" ? targetZone : undefined,
        is_active:
          targetStatus === "all"
            ? undefined
            : targetStatus === "active"
              ? true
              : false,
        ordering: "last_name",
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setResidents(response.results);
      setCount(response.count);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load residents.";

      if (
        /\b(401|403)\b/.test(message) ||
        /Authentication credentials|Staff access is required/i.test(message)
      ) {
        setResidents([]);
        setCount(0);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void reloadResidents({
      targetPage: page,
      targetSearchQuery: searchQuery,
      targetZone: zone,
      targetStatus: status,
    });
  }, [page, searchQuery, status, zone, authLoading, session?.is_authenticated]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitError(null);
    setEditingResidentId(null);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  async function openEditForm(resident: ResidentListItem) {
    setFormErrors({});
    setSubmitError(null);
    try {
      const record = await getResidentById(resident.id);
      setEditingResidentId(resident.id);
      setForm({
        first_name: String(record.first_name || resident.first_name || ""),
        middle_name: String(record.middle_name || resident.middle_name || ""),
        last_name: String(record.last_name || resident.last_name || ""),
        suffix: String(record.suffix || ""),
        date_of_birth: String(record.date_of_birth || ""),
        gender: (record.gender === "F" ? "F" : "M") as "M" | "F",
        zone: String(record.zone || resident.zone || "Purok Talisay"),
        precinct_number: String(record.precinct_number || resident.precinct_number || ""),
        contact_number: String(record.contact_number || ""),
        email: String(record.email || ""),
      });
      setIsFormOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load resident for editing.";
      setError(message);
    }
  }

  async function refreshCurrentPage() {
    await reloadResidents({ targetPage: page });
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite) {
      setSubmitError("Staff login is required for write actions.");
      return;
    }

    const errors = validateForm(form);
    setFormErrors(errors);
    setSubmitError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      if (editingResidentId) {
        await updateResident(editingResidentId, payload);
        setSubmitSuccess("Resident record updated successfully.");
        setIsFormOpen(false);
        resetForm();
        await refreshCurrentPage();
      } else {
        const created = await createResident(payload);
        setSubmitSuccess("Resident registered successfully.");
        setIsFormOpen(false);
        resetForm();

        const createdSearch = [created.first_name, created.last_name]
          .filter((value): value is string => Boolean(value && value.trim()))
          .join(" ")
          .trim() || [payload.first_name, payload.last_name].join(" ").trim();

        setZone("all");
        setStatus("all");
        setPage(1);
        setSearchInput(createdSearch);
        setSearchQuery(createdSearch);

        await reloadResidents({
          targetPage: 1,
          targetSearchQuery: createdSearch,
          targetZone: "all",
          targetStatus: "all",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save resident.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(resident: ResidentListItem) {
    if (!canWrite) {
      return;
    }

    const nextState = resident.is_active === false;
    try {
      await setResidentActive(resident.id, nextState);
      setSubmitSuccess(nextState ? "Resident reactivated successfully." : "Resident deactivated successfully.");
      await refreshCurrentPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update resident status.";
      setError(message);
    }
  }

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <ExecutivePageHeader
        subtitle="Residents Module"
        title="Residents Executive Workspace"
        description="Enterprise resident registry with advanced filtering, responsive records table, and frontline quick actions."
        badges={(
          <>
            {authLoading ? <StatusBadge label="Checking session..." /> : null}
            {!authLoading && canWrite ? <StatusBadge label={`Staff session active (${session?.username})`} tone="success" /> : null}
            {!authLoading && session?.is_authenticated && !canWrite ? <StatusBadge label="Logged in read-only" tone="warning" /> : null}
            {!authLoading && !session?.is_authenticated ? <StatusBadge label="Not logged in" tone="warning" /> : null}
          </>
        )}
        actions={(
          <div className="flex flex-wrap gap-2">
            <ExportButtons
              rows={residents}
              fileName="residents-export.csv"
              toExportRecord={(resident) => ({
                id: resident.id,
                full_name: getResidentName(resident),
                purok: getResidentPurok(resident),
                precinct_number: resident.precinct_number || "",
                gender: resident.gender || "",
                status: resident.is_active === false ? "Inactive" : "Active",
              })}
              disabled={loading}
            />
            {canWrite ? <PrimaryButton onClick={openCreateForm}>Add resident</PrimaryButton> : null}
          </div>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Residents" value={count} icon={Users} />
        <StatCard label="Active" value={residents.filter((item) => item.is_active !== false).length} icon={UserPlus} />
        <StatCard label="Inactive" value={residents.filter((item) => item.is_active === false).length} icon={Users} />
        <StatCard label="Purok In View" value={new Set(residents.map((item) => getResidentPurok(item))).size} icon={House} />
      </section>

      {!session?.is_authenticated && !authLoading ? (
        <SectionCard title="Staff sign-in for write actions" description="Use the top navigation sign-in to enable create, edit, deactivate, and reactivate." className="border-amber-200 bg-amber-50" />
      ) : null}

      {submitSuccess ? <StatusBadge label={submitSuccess} tone="success" /> : null}

      <ModuleQuickActions
        actions={[
          { label: "Register Resident", description: "Open resident create dialog", href: "/residents", icon: UserPlus, tone: "blue", disabled: !canWrite },
          { label: "Create Household", description: "Proceed to household management", href: "/households", icon: House, tone: "emerald", disabled: !canWrite },
          { label: "Visitor Reports", description: "Review daily visitor operations", href: "/reports/today-visitors", icon: ScanLine, tone: "amber" },
          { label: "Export Registry", description: "Download current filtered resident list", href: "/residents", icon: FileSpreadsheet, tone: "slate" },
        ]}
      />

      <SectionCard title="Advanced Search and Filters" description="Use keyword, purok, and status criteria to narrow resident records quickly.">
        <FilterBar
          rightSlot={
            <SecondaryButton
              onClick={() => {
                void reloadResidents({ targetPage: page });
              }}
              disabled={loading}
            >
              {loading ? "Retrying..." : "Retry"}
            </SecondaryButton>
          }
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Search</span>
            <SearchInput
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, precinct, city"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Purok</span>
            <select
              value={zone}
              onChange={(event) => {
                setZone(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            >
              <option value="all">All purok</option>
              {ZONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
              className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Totals</span>
            <div className="rounded-md border border-[var(--color-border)] bg-gray-50 px-3 py-2 text-gray-800">
              {count} resident{count === 1 ? "" : "s"}
            </div>
          </div>
        </FilterBar>
      </SectionCard>

      {error ? <ErrorState message={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_330px]">
        <div className="space-y-4">
          <DataTable
            columns={tableColumns}
            rows={residents}
            rowKey={(resident) => resident.id}
            loading={loading}
            emptyTitle="No residents found"
            emptyDescription="No residents found for the current filters."
          />

          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <SecondaryButton
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </SecondaryButton>
              </div>
            </div>
          </SectionCard>
        </div>

        <StatisticsSidebar
          title="Statistics Sidebar"
          stats={[
            { label: "Current Search", value: searchQuery || "All residents" },
            { label: "Status Filter", value: status },
            { label: "Zone Filter", value: zone === "all" ? "All purok" : zone },
            { label: "Visible Rows", value: String(residents.length), note: "Rows loaded for current page." },
          ]}
        />
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingResidentId ? "Edit resident" : "Add resident"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="rounded border px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">First name *</span>
                  <input
                    value={form.first_name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, first_name: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                  {formErrors.first_name && (
                    <span className="mt-1 block text-xs text-red-600">{formErrors.first_name}</span>
                  )}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Last name *</span>
                  <input
                    value={form.last_name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, last_name: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                  {formErrors.last_name && (
                    <span className="mt-1 block text-xs text-red-600">{formErrors.last_name}</span>
                  )}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Middle name</span>
                  <input
                    value={form.middle_name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, middle_name: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Suffix</span>
                  <input
                    value={form.suffix}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, suffix: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Date of birth *</span>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                  {formErrors.date_of_birth && (
                    <span className="mt-1 block text-xs text-red-600">{formErrors.date_of_birth}</span>
                  )}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Gender *</span>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, gender: event.target.value as "M" | "F" }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Purok *</span>
                  <select
                    value={form.zone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, zone: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    {ZONE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formErrors.zone && (
                    <span className="mt-1 block text-xs text-red-600">{formErrors.zone}</span>
                  )}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Precinct number</span>
                  <input
                    value={form.precinct_number}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, precinct_number: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Contact number</span>
                  <input
                    value={form.contact_number}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contact_number: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="+639123456789"
                  />
                  {formErrors.contact_number && (
                    <span className="mt-1 block text-xs text-red-600">
                      {formErrors.contact_number}
                    </span>
                  )}
                </label>

                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Email</span>
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="resident@example.com"
                  />
                  {formErrors.email && (
                    <span className="mt-1 block text-xs text-red-600">{formErrors.email}</span>
                  )}
                </label>
              </div>

              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                  className="rounded border px-4 py-2"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingResidentId
                      ? "Save changes"
                      : "Create resident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        open={Boolean(pendingStatusResident)}
        title={pendingStatusResident?.is_active === false ? "Reactivate resident" : "Deactivate resident"}
        message={pendingStatusResident ? `Are you sure you want to ${pendingStatusResident.is_active === false ? "reactivate" : "deactivate"} ${getResidentName(pendingStatusResident)}?` : ""}
        onCancel={() => setPendingStatusResident(null)}
        onConfirm={() => {
          if (pendingStatusResident) {
            void handleToggleActive(pendingStatusResident);
          }
          setPendingStatusResident(null);
        }}
      />
    </ContentContainer>
  );
}
