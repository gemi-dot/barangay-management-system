"use client";

import Link from "next/link";

type ResidentDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ResidentDetailError({
  error,
  reset,
}: ResidentDetailErrorProps) {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Unable to load resident details</h1>
        <p className="mt-2 text-gray-600">
          An error occurred while loading this resident record. Please try again.
        </p>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Retry
          </button>
          <Link
            href="/residents"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back to residents list
          </Link>
        </div>
      </div>
    </main>
  );
}
