"use client";

import { useEffect, useState } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
      return undefined;
    }

    const query = requestForm.full_name.trim();
    if (query.length < 2) {
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
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="Resident Portal"
        title="Resident Self-Service"
        description="Migration includes registration, dashboard summary, and document request submission."
        meta={session?.is_authenticated ? <StatusBadge label="Signed in" tone="success" /> : <StatusBadge label="Guest" />}
      />

      {error ? <ErrorState message={error} /> : null}
      {registerMessage ? <StatusBadge label={registerMessage} tone="success" /> : null}

      {!session?.is_authenticated ? (
        <SectionCard title="Create Resident Portal Account">
          <form onSubmit={handleRegister} className="mt-3 grid gap-3 md:grid-cols-2">
            <input name="username" required placeholder="Username" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="Email" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input name="first_name" required placeholder="First name" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input name="last_name" required placeholder="Last name" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input name="password1" type="password" required placeholder="Password" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input name="password2" type="password" required placeholder="Confirm password" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <PrimaryButton type="submit" disabled={registering} className="md:col-span-2">
              {registering ? "Registering..." : "Register and sign in"}
            </PrimaryButton>
          </form>
        </SectionCard>
      ) : null}

      {session?.is_authenticated ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Requests" value={dashboard?.counts.total_requests ?? 0} />
            <StatCard label="Pending" value={dashboard?.counts.pending_requests ?? 0} />
            <StatCard label="Ready" value={dashboard?.counts.ready_requests ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Submit Document Request" description="Start typing a resident name to search the full resident list, or enter the name manually.">
              <form onSubmit={handleCreateRequest} className="mt-3 grid gap-3">
                <datalist id="resident-name-suggestions">
                  {residentSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <input
                  value={requestForm.full_name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRequestForm((prev) => ({ ...prev, full_name: value }));
                    if (value.trim().length < 2) {
                      setResidentSuggestions([]);
                    }
                  }}
                  placeholder="Search or encode full name"
                  list="resident-name-suggestions"
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  required
                />
                <input
                  value={requestForm.contact_number}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, contact_number: event.target.value }))}
                  placeholder="Contact number"
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  required
                />
                <input
                  type="email"
                  value={requestForm.email}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                />
                <input
                  value={requestForm.address}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Address"
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  required
                />
                <select
                  value={requestForm.document_type}
                  onChange={(event) =>
                    setRequestForm((prev) => ({ ...prev, document_type: event.target.value }))
                  }
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
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
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  rows={3}
                  required
                />
                <input
                  type="date"
                  value={requestForm.preferred_release_date}
                  onChange={(event) =>
                    setRequestForm((prev) => ({ ...prev, preferred_release_date: event.target.value }))
                  }
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                />
                <PrimaryButton type="submit" disabled={submittingRequest}>
                  {submittingRequest ? "Submitting..." : "Submit request"}
                </PrimaryButton>
              </form>
            </SectionCard>

            <SectionCard title="My Requests">
              <DataTable
                columns={[
                  { key: "tracking", header: "Tracking", render: (request) => request.tracking_number },
                  { key: "type", header: "Type", render: (request) => request.document_type },
                  { key: "status", header: "Status", render: (request) => request.status },
                ]}
                rows={requests}
                rowKey={(request) => request.tracking_number}
                loading={loading}
                emptyTitle="No requests yet"
                emptyDescription="Submit your first document request to see it here."
              />
            </SectionCard>
          </section>
        </>
      ) : null}
    </ContentContainer>
  );
}
