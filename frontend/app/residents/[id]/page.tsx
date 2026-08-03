import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getResidentDetail } from "@/lib/api";
import { ResidentProfileTabs } from "./ResidentProfileTabs";

type ResidentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ResidentDetailPage({ params, searchParams }: ResidentDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const cookieHeader = (await cookies()).toString();
  const resident = await getResidentDetail(id, {
    apiBaseUrl: process.env.INTERNAL_API_BASE_URL || "",
    headers: { cookie: cookieHeader },
  });

  if (!resident) {
    notFound();
  }

  return (
    <ContentContainer>
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-2xl font-bold text-white" aria-label="Resident photo placeholder">
              {resident.identity.first_name.charAt(0)}{resident.identity.last_name.charAt(0)}
            </div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Official Resident Profile</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{resident.identity.full_name}</h1><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600"><span>Resident ID #{resident.identity.id}</span><span>•</span><span>{resident.summary.purok}</span><StatusBadge label={resident.system.is_active ? "Active" : "Inactive"} tone={resident.system.is_active ? "success" : "warning"} /></div></div>
          </div>
          <Link href="/residents" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-center text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-50">Back to residents list</Link>
        </div>
      </header>

      <ResidentProfileTabs resident={resident} requestedTab={tab} />
    </ContentContainer>
  );
}
