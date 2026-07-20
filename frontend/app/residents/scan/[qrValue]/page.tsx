"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import { ContentContainer } from "@/components/layout/ContentContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { resolveResidentQr } from "@/lib/api";

export default function ScanResolvePage() {
  const params = useParams<{ qrValue: string }>();
  const router = useRouter();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function runResolve() {
      const rawInput = decodeURIComponent(params.qrValue || "");
      try {
        const result = await resolveResidentQr(rawInput);
        if (result.status === "ok" && result.resident_id) {
          router.replace(`/residents/quick-view/${result.resident_id}`);
          return;
        }

        const diagnosticParams = new URLSearchParams({
          raw: result.raw_value || rawInput,
          code: result.normalized_code || "",
          reason: result.reason || result.status,
        });
        router.replace(`/residents/scan/diagnostic?${diagnosticParams.toString()}`);
      } catch {
        const diagnosticParams = new URLSearchParams({
          raw: rawInput,
          code: "",
          reason: "not_found",
        });
        router.replace(`/residents/scan/diagnostic?${diagnosticParams.toString()}`);
      }
    }

    void runResolve();
  }, [params.qrValue, router]);

  return (
    <ContentContainer>
      <SectionCard description="Resolving QR code and loading resident profile..." />
    </ContentContainer>
  );
}
