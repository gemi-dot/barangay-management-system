import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getResidentDetail } from "@/lib/api";
import { ResidentProfileTabs } from "./ResidentProfileTabs";

type ResidentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResidentDetailPage({ params }: ResidentDetailPageProps) {
  const { id } = await params;
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
      <PageHeader
        eyebrow="Resident Detail"
        title={resident.identity.full_name}
        description={`ID #${resident.identity.id}`}
        meta={<StatusBadge label={resident.system.is_active ? "Active" : "Inactive"} tone={resident.system.is_active ? "success" : "warning"} />}
        actions={<Link href="/residents" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-50">Back to residents list</Link>}
      />

      <ResidentProfileTabs resident={resident} />
    </ContentContainer>
  );
}
