"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { useSessionAuth } from "@/components/session-context";
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
  const [submitting, setSubmitting] = useState(false);

  const { session, loading: authLoading, canWrite } = useSessionAuth();

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [count]);

  async function reloadResidents(targetPage = page) {
    setLoading(true);
    setError(null);

    try {
      const response = await getResidentsPaginated({
        page: targetPage,
        page_size: PAGE_SIZE,
        search: searchQuery || undefined,
        zone: zone !== "all" ? zone : undefined,
        is_active:
          status === "all" ? undefined : status === "active" ? true : false,
        ordering: "last_name",
      });

      setResidents(response.results);
      setCount(response.count);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load residents.";
      setError(message);
    } finally {
      setLoading(false);
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
    let cancelled = false;

    async function loadResidents() {
      setLoading(true);
      setError(null);

      try {
        const response = await getResidentsPaginated({
          page,
          page_size: PAGE_SIZE,
          search: searchQuery || undefined,
          zone: zone !== "all" ? zone : undefined,
          is_active:
            status === "all" ? undefined : status === "active" ? true : false,
          ordering: "last_name",
        });

        if (cancelled) {
          return;
        }

        setResidents(response.results);
        setCount(response.count);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load residents.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      if (cancelled) {
        return;
      }
    }

    void loadResidents();

    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, status, zone]);

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
    await reloadResidents(page);
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
      } else {
        await createResident(payload);
      }

      setIsFormOpen(false);
      resetForm();
      await refreshCurrentPage();
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
      await refreshCurrentPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update resident status.";
      setError(message);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl bg-white px-6 py-5 shadow">
          <h1 className="text-3xl font-bold text-gray-900">Residents</h1>
          <p className="mt-1 text-gray-600">Search, manage, and review resident records.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {authLoading && (
              <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                Checking session...
              </span>
            )}
            {!authLoading && canWrite && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                Staff session active ({session?.username})
              </span>
            )}
            {!authLoading && session?.is_authenticated && !session.is_staff && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                Logged in as non-staff (read-only)
              </span>
            )}
            {!authLoading && !session?.is_authenticated && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                Not logged in (read-only)
              </span>
            )}
            {canWrite && (
              <button
                type="button"
                onClick={openCreateForm}
                className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
              >
                Add resident
              </button>
            )}
          </div>
        </header>

        {!session?.is_authenticated && !authLoading && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-900">Staff sign-in for write actions</h2>
            <p className="mt-1 text-sm text-amber-800">
              Use the top navigation sign-in to enable create, edit, deactivate, and reactivate.
            </p>
          </section>
        )}

        <section className="rounded-xl bg-white p-4 shadow">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void reloadResidents(page);
              }}
              disabled={loading}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Search</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, precinct, city"
                className="w-full rounded-md border px-3 py-2"
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
                className="w-full rounded-md border px-3 py-2"
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
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <div className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Totals</span>
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-gray-800">
                {count} resident{count === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Purok</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Precinct</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Gender</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && residents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                      No residents found for the current filters.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                      Loading residents...
                    </td>
                  </tr>
                )}

                {!loading &&
                  residents.map((resident) => (
                    <tr key={resident.id} className="border-t hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/residents/${resident.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {getResidentName(resident)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{getResidentPurok(resident)}</td>
                      <td className="px-5 py-3 text-gray-700">{resident.precinct_number || "-"}</td>
                      <td className="px-5 py-3 text-gray-700">{resident.gender || "-"}</td>
                      <td className="px-5 py-3 text-gray-700">
                        {resident.is_active === false ? "Inactive" : "Active"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => {
                                void openEditForm(resident);
                              }}
                              className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                          )}
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => {
                                void handleToggleActive(resident);
                              }}
                              className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              {resident.is_active === false ? "Reactivate" : "Deactivate"}
                            </button>
                          )}
                          <Link
                            href={`/residents/${resident.id}`}
                            className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
            <p className="text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages || loading}
                className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

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
    </main>
  );
}
