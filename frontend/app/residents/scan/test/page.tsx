"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";

export default function ScanTestPage() {
  const router = useRouter();
  const [qrInput, setQrInput] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = qrInput.trim();
    if (!value) return;
    router.push(`/residents/scan/${encodeURIComponent(value)}`);
  }

  return (
    <ContentContainer>
      <SessionRoleBanner />
      <PageHeader
        eyebrow="QR Workflow"
        title="Scan Test"
        description="Paste a QR code value or full scan URL to open resident quick view instantly."
      />

      <SectionCard>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={qrInput}
            onChange={(event) => setQrInput(event.target.value)}
            placeholder="Example: FAD7624D3E5D4E07 or http://127.0.0.1:8000/residents/scan/FAD7624D3E5D4E07/"
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            required
          />
          <PrimaryButton type="submit">Open Resident</PrimaryButton>
        </form>
      </SectionCard>
    </ContentContainer>
  );
}
