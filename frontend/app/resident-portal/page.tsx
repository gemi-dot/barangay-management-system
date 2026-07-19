"use client";

import { useEffect, useState } from "react";

import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import {
  createPortalRequest,
  getPortalDashboard,
  getPortalRequests,
  getResidentsPaginated,
  portalRegister,
  type ResidentListItem,
  type PortalDashboard,
  type PortalRequest,
} from "@/lib/api";

type RequestForm = {
  full_name: string;
  contact_number: string;
  email: string;
  address: string;
  document_type: string;
  purpose: string;
  preferred_release_date: string;
};

const EMPTY_REQUEST_FORM: RequestForm = {
  full_name: "",
  contact_number: "",
  email: "",
  address: "",
  document_type: "barangay_clearance",
  purpose: "",
  preferred_release_date: "",
};

function getResidentDisplayName(resident: ResidentListItem) {
  if (resident.full_name?.trim()) {
    return resident.full_name.trim();
  }

  return [resident.first_name, resident.middle_name, resident.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export default function ResidentPortalPage() {
  const { session, login, refreshSession } = useSessionAuth();

  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [residentSuggestions, setResidentSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState<RequestForm>(EMPTY_REQUEST_FORM);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPortalData() {
      if (!session?.is_authenticated) {
        setDashboard(null);
        setRequests([]);
        setResidentSuggestions([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [dash, reqs] = await Promise.all([
          getPortalDashboard(),
          getPortalRequests(),
        ]);
        if (!cancelled) {
          setDashboard(dash);
          setRequests(reqs.results);
          setRequestForm((prev) => ({
            ...prev,
            full_name: dash.user.full_name || prev.full_name,
            email: dash.user.email || prev.email,
            contact_number: dash.resident?.contact_number || prev.contact_number,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load portal data.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPortalData();

    return () => {
      cancelled = true;
    };
  }, [session?.is_authenticated]);

  useEffect(() => {
    let cancelled = false;

    if (!session?.is_authenticated) {
      setResidentSuggestions([]);
      return undefined;
    }

    const query = requestForm.full_name.trim();
    if (query.length < 2) {
      setResidentSuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const residents = await getResidentsPaginated({
            search: query,
            page: 1,
            page_size: 10,
            is_active: true,
            ordering: "last_name",
            fields: ["id", "first_name", "middle_name", "last_name", "full_name"],
          });

          if (!cancelled) {
            const names = Array.from(
              new Set(
                residents.results
                  .map((resident) => getResidentDisplayName(resident))
                  .filter((name) => name.length > 0),
              ),
            );
            setResidentSuggestions(names);
          }
        } catch {
          if (!cancelled) {
            setResidentSuggestions([]);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session?.is_authenticated, requestForm.full_name]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setRegistering(true);
    setError(null);
    setRegisterMessage(null);

    try {
      const username = String(formData.get("username") || "").trim();
      const firstName = String(formData.get("first_name") || "").trim();
      const lastName = String(formData.get("last_name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const password1 = String(formData.get("password1") || "");
      const password2 = String(formData.get("password2") || "");

      await portalRegister({
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        password1,
        password2,
      });

      await login(username, password1);
      await refreshSession();
      setRegisterMessage("Registration complete. You are now signed in.");
      event.currentTarget.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      setError(message);
    } finally {
      setRegistering(false);
    }
  }

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.is_authenticated) {
      return;
    }

    setSubmittingRequest(true);
    setError(null);
    try {
      await createPortalRequest({
        ...requestForm,
        preferred_release_date: requestForm.preferred_release_date || undefined,
      });
      setRequestForm((prev) => ({ ...prev, purpose: "", preferred_release_date: "" }));
      const reqs = await getPortalRequests();
      setRequests(reqs.results);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request submission failed.";
      setError(message);
    } finally {
      setSubmittingRequest(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Resident Portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Resident Self-Service</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Migration includes registration, dashboard summary, and document request submission.
          </p>
        </section>

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {registerMessage && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {registerMessage}
          </section>
        )}

        {!session?.is_authenticated && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Create Resident Portal Account</h2>
            <form onSubmit={handleRegister} className="mt-3 grid gap-3 md:grid-cols-2">
              <input name="username" required placeholder="Username" className="rounded-md border px-3 py-2 text-sm" />
              <input name="email" type="email" required placeholder="Email" className="rounded-md border px-3 py-2 text-sm" />
              <input name="first_name" required placeholder="First name" className="rounded-md border px-3 py-2 text-sm" />
              <input name="last_name" required placeholder="Last name" className="rounded-md border px-3 py-2 text-sm" />
              <input name="password1" type="password" required placeholder="Password" className="rounded-md border px-3 py-2 text-sm" />
              <input name="password2" type="password" required placeholder="Confirm password" className="rounded-md border px-3 py-2 text-sm" />
              <button
                type="submit"
                disabled={registering}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 md:col-span-2"
              >
                {registering ? "Registering..." : "Register and sign in"}
              </button>
            </form>
          </section>
        )}

        {session?.is_authenticated && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total Requests</p>
                <p className="mt-1 text-2xl font-bold">{dashboard?.counts.total_requests ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{dashboard?.counts.pending_requests ?? 0}</p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Ready</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{dashboard?.counts.ready_requests ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Submit Document Request</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Start typing a resident name to search the full resident list, or enter the name manually.
                </p>
                <form onSubmit={handleCreateRequest} className="mt-3 grid gap-3">
                  <datalist id="resident-name-suggestions">
                    {residentSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <input
                    value={requestForm.full_name}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, full_name: event.target.value }))}
                    placeholder="Search or encode full name"
                    list="resident-name-suggestions"
                    className="rounded-md border px-3 py-2 text-sm"
                    required
                  />
                  <input
                    value={requestForm.contact_number}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, contact_number: event.target.value }))}
                    placeholder="Contact number"
                    className="rounded-md border px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="email"
                    value={requestForm.email}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    value={requestForm.address}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="Address"
                    className="rounded-md border px-3 py-2 text-sm"
                    required
                  />
                  <select
                    value={requestForm.document_type}
                    onChange={(event) =>
                      setRequestForm((prev) => ({ ...prev, document_type: event.target.value }))
                    }
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="barangay_clearance">Barangay Clearance</option>
                    <option value="certificate_of_residency">Certificate of Residency</option>
                    <option value="certificate_of_indigency">Certificate of Indigency</option>
                    <option value="business_clearance">Business Clearance</option>
                  </select>
                  <textarea
                    value={requestForm.purpose}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, purpose: event.target.value }))}
                    placeholder="Purpose"
                    className="rounded-md border px-3 py-2 text-sm"
                    rows={3}
                    required
                  />
                  <input
                    type="date"
                    value={requestForm.preferred_release_date}
                    onChange={(event) =>
                      setRequestForm((prev) => ({ ...prev, preferred_release_date: event.target.value }))
                    }
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {submittingRequest ? "Submitting..." : "Submit request"}
                  </button>
                </form>
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">My Requests</h2>
                {loading ? (
                  <p className="mt-3 text-sm text-zinc-600">Loading requests...</p>
                ) : (
                  <div className="mt-3 max-h-[26rem] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                          <th className="px-2 py-1 font-medium">Tracking</th>
                          <th className="px-2 py-1 font-medium">Type</th>
                          <th className="px-2 py-1 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((request) => (
                          <tr key={request.tracking_number} className="border-b border-zinc-100">
                            <td className="px-2 py-1">{request.tracking_number}</td>
                            <td className="px-2 py-1">{request.document_type}</td>
                            <td className="px-2 py-1">{request.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
