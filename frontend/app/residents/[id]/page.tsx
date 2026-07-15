import Link from "next/link";
import { notFound } from "next/navigation";

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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Resident Detail</p>
          <h1 className="text-3xl font-bold text-gray-900">{resident.identity.full_name}</h1>
          <p className="mt-1 text-gray-600">
            ID #{resident.identity.id} • {resident.system.is_active ? "Active" : "Inactive"}
          </p>
          <div className="mt-4">
            <Link href="/residents" className="text-sm font-medium text-blue-700 hover:underline">
              Back to residents list
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Identity</h2>
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
          </article>

          <article className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Contact and Voter</h2>
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
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Address</h2>
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
          </article>

          <article className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Flags and Timestamps</h2>
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
          </article>
        </section>
      </div>
    </main>
  );
}
