import Link from "next/link";

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
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-zinc-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">QR Workflow</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">QR Diagnostic</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {reason === "invalid"
              ? "The scanned value is not a valid Barangay ID QR format."
              : "No resident is registered for this scanned QR code."}
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
            <Link href="/residents" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Open Residents List
            </Link>
            <Link href="/residents/scan/test" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Back to Scan Test
            </Link>
            <Link href="/residents" className="rounded border px-3 py-2 text-sm hover:bg-zinc-100">
              Search Resident by Name
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
