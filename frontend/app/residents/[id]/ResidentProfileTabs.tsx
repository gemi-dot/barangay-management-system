"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FileText, History, Home, QrCode, UserRound, Users } from "lucide-react";

import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ResidentDetailResponse } from "@/lib/api";
import { LocalDate } from "./LocalDate";
import { LocalDateTime } from "./LocalDateTime";

type TabId = "overview" | "household" | "family" | "documents" | "history" | "qr";

const TABS = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "household", label: "Household", icon: Home },
  { id: "family", label: "Family", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "history", label: "History", icon: History },
  { id: "qr", label: "QR Profile", icon: QrCode },
] as const;

function display(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function DetailList({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <dl className="space-y-3 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>)}</dl>;
}

function documentTone(status: string) {
  if (status === "released" || status === "ready_for_pickup") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "processing") return "info" as const;
  return "warning" as const;
}

export function ResidentProfileTabs({ resident }: { resident: ResidentDetailResponse }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const household = resident.household;

  return <>
    <nav className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-[var(--shadow-sm)]" aria-label="Resident profile sections">
      <div className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`} aria-current={active ? "page" : undefined}><Icon className="h-4 w-4" />{tab.label}</button>;
        })}
      </div>
    </nav>

    {activeTab === "overview" ? <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Identity"><DetailList rows={[
          ["Full name", resident.identity.full_name], ["Age", resident.identity.age], ["Gender", resident.identity.gender],
          ["Date of birth", <LocalDate key="birth" value={resident.identity.date_of_birth} />], ["Civil status", resident.identity.civil_status], ["Citizenship", resident.identity.citizenship],
        ]} /></SectionCard>
        <SectionCard title="Contact and voter"><DetailList rows={[
          ["Contact number", display(resident.contact.contact_number)], ["Email", display(resident.contact.email)],
          ["Precinct number", display(resident.voter.precinct_number)], ["Voter ID", display(resident.voter.voters_id)],
          ["Registered voter", resident.voter.voters_id ? "Yes" : "No"],
        ]} /></SectionCard>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Address"><DetailList rows={[
          ["House number", display(resident.address.house_number)], ["Street", display(resident.address.street)], ["Purok", display(resident.address.zone)],
          ["Barangay", display(resident.address.barangay)], ["City / Municipality", display(resident.address.city_municipality)], ["Province", display(resident.address.province)], ["ZIP code", display(resident.address.zip_code)],
        ]} /></SectionCard>
        <SectionCard title="Health and socioeconomic"><DetailList rows={[
          ["Employment", display(resident.socioeconomic.employment_status)], ["Occupation", display(resident.socioeconomic.occupation)], ["Education", display(resident.socioeconomic.educational_attainment)],
          ["PWD", resident.health.is_pwd ? `Yes${resident.health.pwd_type ? ` · ${resident.health.pwd_type}` : ""}` : "No"], ["Senior citizen", resident.health.is_senior_citizen ? "Yes" : "No"],
          ["Solo parent", resident.health.is_solo_parent ? "Yes" : "No"], ["4Ps beneficiary", resident.socioeconomic.is_4ps_beneficiary ? "Yes" : "No"],
        ]} /></SectionCard>
      </section>
    </div> : null}

    {activeTab === "household" ? household ? <div className="space-y-4">
      <SectionCard title={`Household ${household.household_number}`} actions={<Link href={`/households/${household.id}`} className="text-sm font-semibold text-blue-700 hover:underline">Open household workspace</Link>}>
        <div className="grid gap-5 md:grid-cols-2"><DetailList rows={[["Household head", household.head_full_name], ["Resident relationship", household.relationship_to_head.replaceAll("_", " ")], ["Purok", display(household.purok)], ["Status", <StatusBadge key="hh-status" label={household.status} tone={household.status === "active" ? "success" : "warning"} />]]} /><DetailList rows={[["Complete address", display(household.complete_address)], ["Active members", household.members.length]]} /></div>
      </SectionCard>
      <SectionCard title="Household members"><div className="divide-y divide-slate-100">{household.members.map((member) => <div key={member.resident_id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium text-slate-900">{member.full_name}</p><p className="text-sm capitalize text-slate-500">{member.relationship_to_head.replaceAll("_", " ")}</p></div><StatusBadge label={member.resident_status} tone={member.resident_status === "active" ? "success" : "warning"} /></div>)}</div></SectionCard>
    </div> : <SectionCard title="No active household" description="This resident does not currently have an active household membership." /> : null}

    {activeTab === "family" ? <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Legacy family information" description="Existing text fields retained for reference; these are not linked records."><DetailList rows={[["Father", display(resident.family.father_name)], ["Mother", display(resident.family.mother_name)], ["Spouse", display(resident.family.spouse_name)]]} /></SectionCard>
        <SectionCard title="Emergency contact"><DetailList rows={[["Name", display(resident.family.emergency_contact_name)], ["Contact number", display(resident.family.emergency_contact_number)], ["Relationship", display(resident.family.emergency_contact_relationship)]]} /></SectionCard>
      </section>
    </div> : null}

    {activeTab === "documents" ? <SectionCard title="Document requests" description="Requests explicitly submitted by or matching this resident record.">
      {resident.documents.length ? <div className="divide-y divide-slate-100">{resident.documents.map((document) => <article key={document.id} className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{document.document_type_display}</h3><StatusBadge label={document.status_display} tone={documentTone(document.status)} /></div><p className="mt-1 text-sm text-slate-600">{document.purpose}</p><p className="mt-1 text-xs text-slate-500">Tracking: {document.tracking_number}</p></div><LocalDateTime value={document.created_at} /></article>)}</div> : <p className="text-sm text-slate-500">No matching document requests were found.</p>}
    </SectionCard> : null}

    {activeTab === "history" ? <div className="space-y-4">
      <SectionCard title="Record timeline"><div className="space-y-4 border-l-2 border-slate-200 pl-5"><div><p className="font-semibold text-slate-900">Resident registered</p><LocalDateTime value={resident.system.date_registered} /></div><div><p className="font-semibold text-slate-900">Record last updated</p><LocalDateTime value={resident.system.updated_at} /></div></div></SectionCard>
      <SectionCard title="Service history">{resident.history.length ? <div className="divide-y divide-slate-100">{resident.history.map((item) => <article key={item.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.action_display}</h3><LocalDateTime value={item.created_at} /></div><p className="mt-1 text-sm text-slate-600">{display(item.notes)}</p><p className="mt-1 text-xs text-slate-500">Logged by: {item.logged_by || "System"}</p></article>)}</div> : <p className="text-sm text-slate-500">No service activity has been recorded.</p>}</SectionCard>
    </div> : null}

    {activeTab === "qr" ? <section className="grid gap-4 md:grid-cols-[320px_1fr]">
      <SectionCard title="Resident QR code"><div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">{resident.qr_profile.image_url ? <Image src={resident.qr_profile.image_url} alt={`QR code for ${resident.identity.full_name}`} width={240} height={240} className="h-60 w-60 object-contain" unoptimized /> : <p className="text-sm text-slate-500">QR image unavailable</p>}</div></SectionCard>
      <SectionCard title="QR profile" description="Use this code with the existing staff QR workflow."><DetailList rows={[["Resident", resident.identity.full_name], ["Resident ID", resident.identity.id], ["QR code", resident.qr_profile.code], ["Record status", resident.system.is_active ? "Active" : "Inactive"]]} /><div className="mt-5"><Link href={`/residents/scan/${encodeURIComponent(resident.qr_profile.code)}`} className="inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Open QR workflow</Link></div></SectionCard>
    </section> : null}
  </>;
}
