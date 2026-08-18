"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { GitBranch, Plus, Trash2, UserRound } from "lucide-react";

import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createFamilyRelationship,
  getFamilyRelationships,
  getFamilyTree,
  getResidentsPaginated,
  removeFamilyRelationship,
  type FamilyRelationshipRecord,
  type FamilyRelationshipType,
  type FamilyResidentNode,
  type FamilyTree,
  type ResidentListItem,
} from "@/lib/api";

const RELATIONSHIP_OPTIONS: Array<{ value: FamilyRelationshipType; label: string }> = [
  { value: "parent", label: "Parent of selected resident" },
  { value: "child", label: "Child of selected resident" },
  { value: "spouse", label: "Spouse of selected resident" },
  { value: "sibling", label: "Sibling of selected resident" },
  { value: "guardian", label: "Guardian of selected resident" },
  { value: "ward", label: "Ward of selected resident" },
];

function TreePerson({ node, emphasis = false }: { node: FamilyResidentNode; emphasis?: boolean }) {
  return <Link href={`/residents/${node.resident_id}`} className={`block min-w-44 rounded-xl border p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${emphasis ? "border-blue-500 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
    <UserRound className={`mx-auto h-6 w-6 ${emphasis ? "text-blue-100" : "text-blue-600"}`} />
    <p className="mt-2 text-sm font-semibold">{node.full_name}</p>
    <p className={`mt-1 text-xs ${emphasis ? "text-blue-100" : "text-slate-500"}`}>{node.age} years · {node.gender}</p>
  </Link>;
}

function TreeGroup({ title, nodes }: { title: string; nodes: FamilyResidentNode[] }) {
  if (!nodes.length) return null;
  return <div className="space-y-2"><p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p><div className="flex flex-wrap justify-center gap-3">{nodes.map((node) => <TreePerson key={`${title}-${node.resident_id}`} node={node} />)}</div></div>;
}

export function FamilyRelationshipPanel({ residentId, canManage }: { residentId: number; canManage: boolean }) {
  const [relationships, setRelationships] = useState<FamilyRelationshipRecord[]>([]);
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [residentSearch, setResidentSearch] = useState("");
  const [residentOptions, setResidentOptions] = useState<ResidentListItem[]>([]);
  const [targetResidentId, setTargetResidentId] = useState("");
  const [relationshipType, setRelationshipType] = useState<FamilyRelationshipType>("parent");
  const [notes, setNotes] = useState("");
  const [removeTarget, setRemoveTarget] = useState<FamilyRelationshipRecord | null>(null);

  const loadFamily = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [relationshipData, treeData] = await Promise.all([
        getFamilyRelationships(residentId), getFamilyTree(residentId),
      ]);
      setRelationships(relationshipData); setTree(treeData);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load family relationships."); }
    finally { setLoading(false); }
  }, [residentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFamily();
  }, [loadFamily]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await getResidentsPaginated({ page: 1, page_size: 30, search: residentSearch || undefined, is_active: true, ordering: "last_name" });
        if (!cancelled) setResidentOptions(response.results.filter((resident) => resident.id !== residentId));
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to search residents."); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [canManage, residentId, residentSearch]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetId = Number(targetResidentId);
    if (!targetId) { setError("Select a related resident."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      await createFamilyRelationship(residentId, { to_resident_id: targetId, relationship_type: relationshipType, notes });
      setTargetResidentId(""); setResidentSearch(""); setNotes(""); setSuccess("Reciprocal family relationship created.");
      await loadFamily();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create relationship."); }
    finally { setBusy(false); }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      await removeFamilyRelationship(residentId, removeTarget.id);
      setRemoveTarget(null); setSuccess("Both sides of the relationship were deactivated."); await loadFamily();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to remove relationship."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    {error ? <ErrorState message={error} /> : null}
    {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}

    <SectionCard title="Family tree" description="Relationships are reciprocal and link existing resident records only." actions={<StatusBadge label="Authorized access" tone="info" />}>
      {loading ? <LoadingState label="Loading family tree..." /> : tree ? <div className="overflow-x-auto rounded-xl bg-slate-50 p-5">
        <div className="mx-auto flex min-w-[720px] max-w-5xl flex-col items-center gap-5">
          <div className="grid w-full grid-cols-2 gap-6"><TreeGroup title="Parents" nodes={tree.parents} /><TreeGroup title="Guardians" nodes={tree.guardians} /></div>
          {(tree.parents.length || tree.guardians.length) ? <div className="h-7 w-px bg-slate-300" /> : null}
          <div className="flex w-full items-center justify-center gap-4">
            <TreeGroup title="Siblings" nodes={tree.siblings} />
            <div className="shrink-0"><p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-blue-700">Resident</p><TreePerson node={tree.resident} emphasis /></div>
            <TreeGroup title="Spouses" nodes={tree.spouses} />
          </div>
          {(tree.children.length || tree.wards.length) ? <div className="h-7 w-px bg-slate-300" /> : null}
          <div className="grid w-full grid-cols-2 gap-6"><TreeGroup title="Children" nodes={tree.children} /><TreeGroup title="Wards" nodes={tree.wards} /></div>
        </div>
      </div> : null}
    </SectionCard>

    <section className={`grid gap-4 ${canManage ? "xl:grid-cols-[1fr_1.2fr]" : ""}`}>
      {canManage ? <SectionCard title="Add relationship" description="Choose how this resident relates to the selected resident.">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block text-sm"><span className="mb-1 block font-medium">Search residents</span><SearchInput value={residentSearch} onChange={(event) => setResidentSearch(event.target.value)} placeholder="Search existing residents" /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Related resident</span><select required value={targetResidentId} onChange={(event) => setTargetResidentId(event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"><option value="">Select resident</option>{residentOptions.map((resident) => <option key={resident.id} value={resident.id}>{resident.full_name || `${resident.last_name}, ${resident.first_name}`}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Relationship</span><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as FamilyRelationshipType)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2">{RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Notes</span><textarea rows={2} maxLength={255} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" /></label>
          <PrimaryButton type="submit" disabled={busy} leftIcon={<Plus className="h-4 w-4" />}>{busy ? "Saving..." : "Add Reciprocal Relationship"}</PrimaryButton>
        </form>
      </SectionCard> : null}

      <SectionCard title="Active relationships" description={`${relationships.length} linked relationship${relationships.length === 1 ? "" : "s"}.`}>
        {relationships.length ? <div className="divide-y divide-slate-100">{relationships.map((relationship) => <article key={relationship.id} className="flex items-center justify-between gap-4 py-3"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/residents/${relationship.resident.id}`} className="font-semibold text-blue-700 hover:underline">{relationship.resident.full_name}</Link><StatusBadge label={relationship.relationship_display} tone="default" /></div><p className="mt-1 text-xs text-slate-500">{relationship.notes || `Recorded by ${relationship.created_by || "an authorized user"}`}</p></div>{canManage ? <SecondaryButton onClick={() => setRemoveTarget(relationship)} disabled={busy} leftIcon={<Trash2 className="h-4 w-4" />}>Remove</SecondaryButton> : null}</article>)}</div> : <div className="py-8 text-center"><GitBranch className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">No structured family relationships yet.</p></div>}
      </SectionCard>
    </section>

    <ConfirmationModal open={Boolean(removeTarget)} title="Remove family relationship" message={removeTarget ? `Remove the reciprocal relationship with ${removeTarget.resident.full_name}? Both sides will be deactivated, while history is retained.` : ""} onCancel={() => setRemoveTarget(null)} onConfirm={() => void confirmRemove()} confirming={busy} confirmLabel="Remove Relationship" />
  </div>;
}
