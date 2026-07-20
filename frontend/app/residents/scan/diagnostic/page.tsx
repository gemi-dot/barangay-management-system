import Link from "next/link";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

type QrDiagnosticPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QrDiagnosticPage({ searchParams }: QrDiagnosticPageProps) {
  const params = await searchParams;
  const rawValue = params.raw;
  const codeValue = params.code;
  const reasonValue = params.reason;

  const raw = (Array.isArray(rawValue) ? rawValue[0] : rawValue) || "N/A";
  const code = (Array.isArray(codeValue) ? codeValue[0] : codeValue) || "N/A";
  const reason = ((Array.isArray(reasonValue) ? reasonValue[0] : reasonValue) || "not_found").toLowerCase();

  return (
    <ContentContainer>
      <PageHeader
        eyebrow="QR Workflow"
        title="QR Diagnostic"
        description={reason === "invalid" ? "The scanned value is not a valid Barangay ID QR format." : "No resident is registered for this scanned QR code."}
      />

      <SectionCard>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-zinc-500">Scanned Value</dt>
              <dd className="font-medium break-all">{raw}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Normalized Code</dt>
              <dd className="font-medium">{code}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/residents" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">
              Open Residents List
            </Link>
            <Link href="/residents/scan/test" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">
              Back to Scan Test
            </Link>
            <Link href="/residents" className="rounded border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-100">
              Search Resident by Name
            </Link>
          </div>
      </SectionCard>
    </ContentContainer>
  );
}
