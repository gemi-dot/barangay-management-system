"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, Crown, RotateCcw, Save, UserMinus, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";

import { ExecutivePageHeader } from "@/components/enterprise/ExecutivePageHeader";
import { ContentContainer } from "@/components/layout/ContentContainer";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  addHouseholdMember,
  changeHouseholdHead,
  getHousehold,
  getResidentsPaginated,
  removeHouseholdMember,
  reactivateHousehold,
  setHouseholdArchived,
  updateHousehold,
  type HouseholdDetail,
  type HouseholdMember,
  type ResidentListItem,
} from "@/lib/api";
import { canSubmitHeadChange } from "@/lib/household-head-workflow.mjs";
import { canReactivateHousehold, householdPermissions } from "@/lib/household-authorization.mjs";

const PUROKS = ["Purok Talisay", "Purok Malunggay", "Purok Mancinitas", "Purok Narra", "Purok Kulo", "Purok Ipil-ipil", "Purok Tugas"];
const RELATIONSHIPS = [
  ["spouse", "Spouse"], ["son", "Son"], ["daughter", "Daughter"], ["child", "Child"],
  ["father", "Father"], ["mother", "Mother"], ["parent", "Parent"], ["brother", "Brother"],
  ["sister", "Sister"], ["sibling", "Sibling"], ["grandfather", "Grandfather"],
  ["grandmother", "Grandmother"], ["grandparent", "Grandparent"], ["grandchild", "Grandchild"],
  ["guardian", "Guardian"], ["ward", "Ward"], ["other_relative", "Other relative"],
  ["non_relative", "Non-relative"],
] as const;

function memberTone(member: HouseholdMember) {
  return member.resident_status === "active" ? "success" as const : "warning" as const;
}

export default function HouseholdDetailPage() {
  const params = useParams<{ id: string }>();
  const householdId = params.id;
  const { can } = useSessionAuth();
  const permissions = useMemo(() => householdPermissions(can), [can]);
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ complete_address: "", purok: "", status: "active", notes: "", house_ownership: "owned", total_monthly_income: "" });
  const [residentSearch, setResidentSearch] = useState("");
  const [residentOptions, setResidentOptions] = useState<ResidentListItem[]>([]);
  const [memberResidentId, setMemberResidentId] = useState("");
  const [relationship, setRelationship] = useState("other_relative");
  const [moveResident, setMoveResident] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null);
  const [newHeadId, setNewHeadId] = useState("");
  const [previousHeadRelationship, setPreviousHeadRelationship] = useState("parent");
  const [headConfirmationOpen, setHeadConfirmationOpen] = useState(false);
  const [headChangeError, setHeadChangeError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const loadHousehold = useCallback(async () => {
    if (!permissions.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getHousehold(householdId);
      setHousehold(data);
      setForm({
        complete_address: data.complete_address,
        purok: data.purok,
        status: data.status,
        notes: data.notes,
        house_ownership: data.house_ownership,
        total_monthly_income: data.total_monthly_income || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load household.");
    } finally {
      setLoading(false);
    }
  }, [householdId, permissions.view]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHousehold();
  }, [loadHousehold]);

  useEffect(() => {
    if (!permissions.manage) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await getResidentsPaginated({ page: 1, page_size: 30, search: residentSearch || undefined, is_active: true, ordering: "last_name" });
        if (!cancelled) setResidentOptions(result.results);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to search residents.");
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [permissions.manage, residentSearch]);

  const headCandidates = useMemo(
    () => household?.eligible_new_heads ?? [],
    [household],
  );
  const selectedHead = useMemo(
    () => headCandidates.find((member) => member.resident_id === Number(newHeadId)) ?? null,
    [headCandidates, newHeadId],
  );
  const canChangeHead = canSubmitHeadChange(selectedHead, memberBusy);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions.manage) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const updated = await updateHousehold(householdId, {
        complete_address: form.complete_address,
        purok: form.purok,
        notes: form.notes,
        house_ownership: form.house_ownership as HouseholdDetail["house_ownership"],
        total_monthly_income: form.total_monthly_income || null,
      });
      setHousehold(updated); setSuccess("Household information updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update household."); }
    finally { setSaving(false); }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions.manage) return;
    const residentId = Number(memberResidentId);
    if (!residentId) { setError("Select a resident to add."); return; }
    setMemberBusy(true); setError(null); setSuccess(null);
    try {
      await addHouseholdMember(householdId, { resident_id: residentId, relationship_to_head: relationship, move: moveResident });
      setMemberResidentId(""); setResidentSearch(""); setMoveResident(false); setSuccess("Household member added.");
      await loadHousehold();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add member."); }
    finally { setMemberBusy(false); }
  }

  async function confirmRemove() {
    if (!removeTarget || !permissions.manage) return;
    setMemberBusy(true); setError(null);
    try {
      await removeHouseholdMember(householdId, removeTarget.resident_id);
      setRemoveTarget(null); setSuccess("Household member removed."); await loadHousehold();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to remove member."); }
    finally { setMemberBusy(false); }
  }

  async function handleChangeHead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissions.changeHead) return;
    if (!selectedHead) { setHeadChangeError("Select a valid active household member."); return; }
    setHeadChangeError(null);
    setHeadConfirmationOpen(true);
  }

  async function confirmChangeHead() {
    if (!selectedHead || memberBusy || !permissions.changeHead) return;
    const residentId = selectedHead.resident_id;
    setMemberBusy(true); setHeadChangeError(null); setError(null); setSuccess(null);
    try {
      await changeHouseholdHead(householdId, { resident_id: residentId, previous_head_relationship: previousHeadRelationship });
      setHeadConfirmationOpen(false); setNewHeadId(""); setSuccess("Household head changed."); await loadHousehold();
    } catch (err) { setHeadChangeError(err instanceof Error ? err.message : "Failed to change household head."); setHeadConfirmationOpen(false); }
    finally { setMemberBusy(false); }
  }

  async function confirmArchive() {
    if (!permissions.manage) return;
    setSaving(true); setError(null);
    try {
      const updated = await setHouseholdArchived(householdId, "archived");
      setHousehold(updated); setForm((value) => ({ ...value, status: updated.status })); setArchiveOpen(false); setSuccess("Household archived.");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to archive household."); }
    finally { setSaving(false); }
  }

  async function confirmReactivate() {
    if (!permissions.manage || !canReactivateHousehold(household?.status, permissions)) return;
    setSaving(true); setError(null);
    try {
      const updated = await reactivateHousehold(householdId);
      setHousehold(updated); setForm((value) => ({ ...value, status: updated.status })); setReactivateOpen(false); setSuccess("Household reactivated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to reactivate household."); }
    finally { setSaving(false); }
  }

  if (!permissions.view) return <ContentContainer><SessionRoleBanner /><SectionCard title="Restricted module" description="Your account does not have permission to view household details." className="border-amber-200 bg-amber-50" /></ContentContainer>;
  if (loading && !household) return <ContentContainer><LoadingState label="Loading household..." /></ContentContainer>;

  return (
    <ContentContainer>
      <SessionRoleBanner />
      <ExecutivePageHeader
        subtitle="Household Profile"
        title={household?.household_number || "Household"}
        description={household ? `${household.head_of_household.full_name} · ${household.purok || "Unassigned purok"}` : "Household record"}
        badges={household ? <StatusBadge label={household.status} tone={household.status === "active" ? "success" : household.status === "archived" ? "default" : "warning"} /> : null}
        actions={<div className="flex gap-2"><Link href="/households"><SecondaryButton leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</SecondaryButton></Link>{permissions.manage && household?.status !== "archived" ? <SecondaryButton onClick={() => setArchiveOpen(true)} leftIcon={<Archive className="h-4 w-4" />}>Archive</SecondaryButton> : null}{household && canReactivateHousehold(household.status, permissions) ? <SecondaryButton onClick={() => setReactivateOpen(true)} leftIcon={<RotateCcw className="h-4 w-4" />}>Reactivate</SecondaryButton> : null}</div>}
      />
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}

      {household ? <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Members" value={household.statistics.total_members} />
          <StatCard label="Active Members" value={household.statistics.active_members} />
          <StatCard label="Children / Adults" value={`${household.statistics.children_count} / ${household.statistics.adult_count}`} />
          <StatCard label="Senior Citizens" value={household.statistics.senior_citizen_count} />
          <StatCard label="Voters" value={household.statistics.voter_count} />
          <StatCard label="PWD" value={household.statistics.pwd_count} />
          <StatCard label="4Ps Beneficiaries" value={household.statistics.four_ps_beneficiary_count} />
          <StatCard label="Male / Female" value={`${household.statistics.male_count} / ${household.statistics.female_count}`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Household information" description="Update registry information without changing membership.">
            {permissions.manage ? <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium">Complete address</span><textarea rows={2} value={form.complete_address} onChange={(event) => setForm((value) => ({ ...value, complete_address: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium">Purok</span><select value={form.purok} onChange={(event) => setForm((value) => ({ ...value, purok: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">{PUROKS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm"><span className="mb-1 block font-medium">Ownership</span><select value={form.house_ownership} onChange={(event) => setForm((value) => ({ ...value, house_ownership: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"><option value="owned">Owned</option><option value="rented">Rented</option><option value="shared">Shared</option><option value="caretaker">Caretaker</option></select></label>
              <label className="text-sm"><span className="mb-1 block font-medium">Monthly income</span><input type="number" min="0" step="0.01" value={form.total_monthly_income} onChange={(event) => setForm((value) => ({ ...value, total_monthly_income: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium">Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
              <div className="md:col-span-2"><PrimaryButton type="submit" disabled={saving} leftIcon={<Save className="h-4 w-4" />}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton></div>
            </form> : <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div className="md:col-span-2"><dt className="text-slate-500">Complete address</dt><dd className="font-medium text-slate-900">{household.complete_address || "Not recorded"}</dd></div>
              <div><dt className="text-slate-500">Purok</dt><dd className="font-medium text-slate-900">{household.purok || "Unassigned"}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-medium capitalize text-slate-900">{household.status}</dd></div>
              <div><dt className="text-slate-500">Ownership</dt><dd className="font-medium capitalize text-slate-900">{household.house_ownership}</dd></div>
              <div><dt className="text-slate-500">Monthly income</dt><dd className="font-medium text-slate-900">{household.total_monthly_income || "Not recorded"}</dd></div>
              <div className="md:col-span-2"><dt className="text-slate-500">Notes</dt><dd className="font-medium text-slate-900">{household.notes || "None"}</dd></div>
            </dl>}
          </SectionCard>

          {permissions.changeHead ? <SectionCard title="Change household head" description="The new head must already be an active member.">
            <form onSubmit={handleChangeHead} className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Current head</span><p className="font-semibold text-slate-900">{household.head_of_household.full_name}</p></div>
              <label className="block text-sm"><span className="mb-1 block font-medium">New head</span><select value={newHeadId} onChange={(event) => { setNewHeadId(event.target.value); setHeadChangeError(null); }} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"><option value="">Select active member</option>{headCandidates.map((member) => <option key={member.id} value={member.resident_id}>{member.full_name}</option>)}</select></label>
              <label className="block text-sm"><span className="mb-1 block font-medium">Previous head&apos;s new relationship</span><select value={previousHeadRelationship} onChange={(event) => setPreviousHeadRelationship(event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">{RELATIONSHIPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {headChangeError ? <ErrorState message={headChangeError} /> : null}
              <PrimaryButton type="submit" disabled={!canChangeHead} leftIcon={<Crown className="h-4 w-4" />}>{memberBusy ? "Processing..." : "Change Head"}</PrimaryButton>
            </form>
          </SectionCard> : null}
        </section>

        <SectionCard title="Household members" description="Active household membership and staff-relevant resident information.">
          <DataTable
            rows={household.members}
            rowKey={(member) => member.id}
            tableClassName="min-w-[900px]"
            columns={[
              { key: "name", header: "Resident", render: (member) => <div><p className="font-medium text-slate-900">{member.full_name}</p><p className="text-xs text-slate-500">{member.resident_code}</p></div> },
              { key: "relationship", header: "Relationship", render: (member) => member.relationship_to_head.replaceAll("_", " ") },
              { key: "age", header: "Age / Sex", render: (member) => `${member.age} · ${member.sex}` },
              { key: "voter", header: "Voter", render: (member) => member.voter_status ? "Registered" : "Not registered" },
              { key: "status", header: "Status", render: (member) => <StatusBadge label={member.resident_status} tone={memberTone(member)} /> },
              { key: "actions", header: "Actions", render: (member) => member.relationship_to_head === "head" ? <span className="text-xs font-semibold text-amber-700">Household head</span> : permissions.manage ? <SecondaryButton onClick={() => setRemoveTarget(member)} leftIcon={<UserMinus className="h-4 w-4" />}>Remove</SecondaryButton> : <span className="text-xs text-slate-500">View only</span> },
            ]}
          />
        </SectionCard>

        {permissions.manage ? <SectionCard title="Add household member" description="Select an existing resident. Moving a resident ends their previous ordinary membership.">
          <form onSubmit={handleAddMember} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm"><span className="mb-1 block font-medium">Search residents</span><SearchInput value={residentSearch} onChange={(event) => setResidentSearch(event.target.value)} placeholder="Search by name" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium">Resident</span><select value={memberResidentId} onChange={(event) => setMemberResidentId(event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"><option value="">Select resident</option>{residentOptions.map((resident) => <option key={resident.id} value={resident.id}>{resident.full_name || `${resident.last_name}, ${resident.first_name}`}</option>)}</select></label>
            <label className="text-sm"><span className="mb-1 block font-medium">Relationship</span><select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">{RELATIONSHIPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moveResident} onChange={(event) => setMoveResident(event.target.checked)} />Move from another household</label><PrimaryButton type="submit" disabled={memberBusy} leftIcon={<UserPlus className="h-4 w-4" />}>{memberBusy ? "Processing..." : "Add Member"}</PrimaryButton></div>
          </form>
        </SectionCard> : null}
      </> : null}

      {permissions.manage ? <ConfirmationModal open={Boolean(removeTarget)} title="Remove household member" message={removeTarget ? `Remove ${removeTarget.full_name} from this household? Their membership history will be retained.` : ""} onCancel={() => setRemoveTarget(null)} onConfirm={() => void confirmRemove()} confirming={memberBusy} confirmLabel="Remove Member" /> : null}
      {permissions.changeHead ? <ConfirmationModal open={headConfirmationOpen} title="Change household head" message={selectedHead && household ? `Make ${selectedHead.full_name} the new head of ${household.household_number}? The current head, ${household.head_of_household.full_name}, will become ${previousHeadRelationship.replaceAll("_", " ")}.` : ""} onCancel={() => setHeadConfirmationOpen(false)} onConfirm={() => void confirmChangeHead()} confirming={memberBusy} confirmLabel="Change Head" /> : null}
      {permissions.manage ? <ConfirmationModal open={archiveOpen} title="Archive household" message="Archive this household? Membership history and resident records will be preserved." onCancel={() => setArchiveOpen(false)} onConfirm={() => void confirmArchive()} confirming={saving} confirmLabel="Archive Household" /> : null}
      {permissions.manage ? <ConfirmationModal open={reactivateOpen} title="Reactivate household" message="Reactivate this household and return it to active status?" onCancel={() => setReactivateOpen(false)} onConfirm={() => void confirmReactivate()} confirming={saving} confirmLabel="Reactivate Household" /> : null}
    </ContentContainer>
  );
}
