"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SessionRoleBanner } from "@/components/session-role-banner";

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
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <SessionRoleBanner />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">QR Workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Scan Test</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Paste a QR code value or full scan URL to open resident quick view instantly.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={qrInput}
              onChange={(event) => setQrInput(event.target.value)}
              placeholder="Example: FAD7624D3E5D4E07 or http://127.0.0.1:8000/residents/scan/FAD7624D3E5D4E07/"
              className="rounded-md border px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Open Resident
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
