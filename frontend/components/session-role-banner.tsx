"use client";

import Link from "next/link";

import { useSessionAuth } from "@/components/session-context";
import { operationalIdentityLabel } from "@/lib/operational-access.mjs";

export function SessionRoleBanner() {
  const { session, loading, canWrite } = useSessionAuth();

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
        Checking session and role permissions...
      </div>
    );
  }

  if (canWrite) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
        Signed in as {operationalIdentityLabel(session)} ({session?.username}). Authorized actions are enabled.
      </div>
    );
  }

  if (session?.is_authenticated) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
        Signed in as {session.username}. This account has read-only access.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
      Not signed in.{" "}
      <Link href="/login" className="font-semibold underline">
        Sign in
      </Link>{" "}
      for authorized actions.
    </div>
  );
}
