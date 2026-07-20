"use client";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionRoleBanner } from "@/components/session-role-banner";
import { useSessionAuth } from "@/components/session-context";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function BlotterPage() {
  const { canWrite } = useSessionAuth();

  return (
    <ContentContainer>
      <SessionRoleBanner />

      <PageHeader
        eyebrow="Blotter"
        title="Incident Intake and Case Tracking"
        description="This module placeholder is now available in Next.js while full blotter forms and workflow are prepared."
        meta={canWrite ? <StatusBadge label="Staff access enabled" tone="success" /> : <StatusBadge label="Read-only access" tone="warning" />}
      />

      {!canWrite ? (
        <SectionCard
          title="Restricted module"
          description="Staff login is required to access blotter operations."
          className="border-amber-200 bg-amber-50"
        />
      ) : (
        <SectionCard description="Legacy parity achieved for the blotter placeholder page. Next migration step is implementing full incident records CRUD and timeline actions." />
      )}
    </ContentContainer>
  );
}
