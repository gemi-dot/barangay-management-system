import Link from "next/link";

import { getResidents } from "@/lib/api";

function getResidentName(resident: {
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
}) {
  if (resident.full_name) {
    return resident.full_name;
  }

  return [resident.first_name, resident.middle_name, resident.last_name]
    .filter(Boolean)
    .join(" ");
}

function getResidentPurok(resident: { purok?: string; zone?: string }) {
  return resident.purok || resident.zone || "-";
}

export default async function ResidentsPage() {
  const residents = await getResidents();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Residents</h1>
          <p className="mt-1 text-gray-600">Barangay resident registry</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow">
          <div className="border-b px-5 py-4">
            <p className="font-medium text-gray-700">Total loaded: {residents.length}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Purok</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Precinct</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {residents.map((resident) => (
                  <tr key={resident.id} className="border-t hover:bg-gray-50">
                    <td className="p-0">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="block px-5 py-3 text-gray-900 hover:underline"
                      >
                        {getResidentName(resident)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="block px-5 py-3 text-gray-700"
                      >
                        {getResidentPurok(resident)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="block px-5 py-3 text-gray-700"
                      >
                        {resident.precinct_number || "-"}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/residents/${resident.id}`}
                        className="block px-5 py-3 text-gray-700"
                      >
                        {resident.is_active === false ? "Inactive" : "Active"}
                      </Link>
                    </td>
                  </tr>
                ))}

                {residents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                      No residents returned by the API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
