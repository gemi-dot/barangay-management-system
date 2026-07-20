"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { ErrorState } from "@/components/ui/ErrorState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getOfficeProfile, updateOfficeProfile, type OfficeProfile } from "@/lib/api";

const EMPTY_PROFILE: OfficeProfile = {
  office_name: "",
  barangay: "",
  city_municipality: "",
  province: "",
  captain_name: "",
  default_or_number: "",
  default_control_number: "",
  updated_at: "",
};

export default function SettingsPage() {
  const { canWrite } = useSessionAuth();
  const [profile, setProfile] = useState<OfficeProfile>(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] = useState<OfficeProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!canWrite) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getOfficeProfile();
        if (!cancelled) {
          setProfile(data);
          setSavedProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          const text = err instanceof Error ? err.message : "Failed to load office profile.";
          setError(text);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [canWrite]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(savedProfile);
  }, [profile, savedProfile]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateOfficeProfile({
        office_name: profile.office_name,
        barangay: profile.barangay,
        city_municipality: profile.city_municipality,
        province: profile.province,
        captain_name: profile.captain_name,
        default_or_number: profile.default_or_number,
        default_control_number: profile.default_control_number,
      });
      setProfile(updated);
      setSavedProfile(updated);
      setMessage("Office profile updated successfully.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save office profile.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setProfile(savedProfile);
    setMessage(null);
    setError(null);
  }

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Configure the barangay office profile used by certificate templates, branding, and system headers."
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to edit system settings."
          className="border-amber-200 bg-amber-50"
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {message ? <StatusBadge label={message} tone="success" /> : null}

      <SectionCard title="Office Profile" description="These values are used by the resident portal and printable certificate screens.">
        <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Last saved: {savedProfile.updated_at ? new Date(savedProfile.updated_at).toLocaleString() : "Never"}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
            Loading office profile...
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-2 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Office Name</span>
                  <input
                    value={profile.office_name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, office_name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Barangay Abgao"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Captain Name</span>
                  <input
                    value={profile.captain_name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, captain_name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="HON. BARANGAY CAPTAIN"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Barangay</span>
                  <input
                    value={profile.barangay}
                    onChange={(event) => setProfile((prev) => ({ ...prev, barangay: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="ABGAO"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">City / Municipality</span>
                  <input
                    value={profile.city_municipality}
                    onChange={(event) => setProfile((prev) => ({ ...prev, city_municipality: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="MAASIN"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Province</span>
                  <input
                    value={profile.province}
                    onChange={(event) => setProfile((prev) => ({ ...prev, province: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="SOUTHERN LEYTE"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Default OR Number</span>
                  <input
                    value={profile.default_or_number}
                    onChange={(event) => setProfile((prev) => ({ ...prev, default_or_number: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Optional"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Default Control Number</span>
                  <input
                    value={profile.default_control_number}
                    onChange={(event) => setProfile((prev) => ({ ...prev, default_control_number: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Current certificate preview</p>
                <p className="mt-2 leading-6">
                  {profile.office_name || "Office name"} · {profile.barangay || "Barangay"}, {profile.city_municipality || "City / Municipality"}, {profile.province || "Province"}
                </p>
                <p className="mt-1 leading-6">Captain: {profile.captain_name || "—"}</p>
                <p className="mt-1 leading-6">OR: {profile.default_or_number || "—"} · Control: {profile.default_control_number || "—"}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {hasChanges ? "You have unsaved changes." : "All changes saved."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={handleReset}
                    disabled={!hasChanges || saving}
                  >
                    Reset
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    disabled={!canWrite || saving || loading || !hasChanges}
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </PrimaryButton>
                </div>
              </div>
          </form>
        )}
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-3">
          <Link href="/" className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Dashboard
          </Link>
          <Link href="/residents" className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Residents
          </Link>
          <Link href="/document-requests" className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Document Requests
          </Link>
      </section>
    </ContentContainer>
  );
}
