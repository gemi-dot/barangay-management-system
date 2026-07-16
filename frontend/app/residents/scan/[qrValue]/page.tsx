"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm">
        Resolving QR code and loading resident profile...
      </div>
    </main>
  );
}
