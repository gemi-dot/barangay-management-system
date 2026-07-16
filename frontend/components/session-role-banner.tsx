"use client";

import { useSessionAuth } from "@/components/session-context";

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
        Signed in as staff ({session?.username}). Staff-only actions are enabled.
      </div>
    );
  }

  if (session?.is_authenticated) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
        Signed in as non-staff ({session.username}). Staff-only actions are disabled.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
      Not signed in. Use the top navigation to sign in for staff-only actions.
    </div>
  );
}