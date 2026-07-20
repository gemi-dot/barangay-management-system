import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getResidentDetail } from "@/lib/api";
import { LocalDate } from "./LocalDate";
import { LocalDateTime } from "./LocalDateTime";

type ResidentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export default async function ResidentDetailPage({ params }: ResidentDetailPageProps) {
  const { id } = await params;
  const resident = await getResidentDetail(id);

  if (!resident) {
    notFound();
  }

  return (
    <ContentContainer>
      <PageHeader
        eyebrow="Resident Detail"
        title={resident.identity.full_name}
        description={`ID #${resident.identity.id}`}
        meta={<StatusBadge label={resident.system.is_active ? "Active" : "Inactive"} tone={resident.system.is_active ? "success" : "warning"} />}
        actions={<Link href="/residents" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-50">Back to residents list</Link>}
      />

      <section className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Identity">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Full name</dt>
                <dd className="text-right text-gray-900">{displayText(resident.identity.full_name)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Age</dt>
                <dd className="text-right text-gray-900">{displayText(resident.identity.age)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Gender</dt>
                <dd className="text-right text-gray-900">{displayText(resident.identity.gender)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Date of birth</dt>
                <dd className="text-right text-gray-900">
                  <LocalDate value={resident.identity.date_of_birth} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Civil status</dt>
                <dd className="text-right text-gray-900">{displayText(resident.identity.civil_status)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Citizenship</dt>
                <dd className="text-right text-gray-900">{displayText(resident.identity.citizenship)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Contact and Voter">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Contact number</dt>
                <dd className="text-right text-gray-900">{displayText(resident.contact.contact_number)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-right text-gray-900">{displayText(resident.contact.email)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Precinct number</dt>
                <dd className="text-right text-gray-900">{displayText(resident.voter.precinct_number)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Voter ID</dt>
                <dd className="text-right text-gray-900">{displayText(resident.voter.voters_id)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">QR code</dt>
                <dd className="text-right text-gray-900">{displayText(resident.system.qr_code)}</dd>
              </div>
            </dl>
          </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Address">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">House number</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.house_number)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Street</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.street)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Purok</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.zone)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Barangay</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.barangay)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">City / Municipality</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.city_municipality)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Province</dt>
                <dd className="text-right text-gray-900">{displayText(resident.address.province)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Flags and Timestamps">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">4Ps beneficiary</dt>
                <dd className="text-right text-gray-900">
                  {resident.socioeconomic.is_4ps_beneficiary ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">PWD</dt>
                <dd className="text-right text-gray-900">{resident.health.is_pwd ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Senior citizen</dt>
                <dd className="text-right text-gray-900">
                  {resident.health.is_senior_citizen ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Solo parent</dt>
                <dd className="text-right text-gray-900">
                  {resident.health.is_solo_parent ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Date registered</dt>
                <dd className="text-right text-gray-900">
                  <LocalDateTime value={resident.system.date_registered} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Created at</dt>
                <dd className="text-right text-gray-900">
                  <LocalDateTime value={resident.system.created_at} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Last updated</dt>
                <dd className="text-right text-gray-900">
                  <LocalDateTime value={resident.system.updated_at} />
                </dd>
              </div>
            </dl>
          </SectionCard>
      </section>
    </ContentContainer>
  );
}
