"use client";

import Link from "next/link";
import { Bell, ChevronDown, Menu, LogOut, Settings, Search, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSessionAuth } from "@/components/session-context";

type TopNavigationProps = {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  desktopCollapsed: boolean;
};

export function TopNavigation({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  desktopCollapsed,
}: TopNavigationProps) {
  const { session, loading, error, canWrite, logout, clearError } = useSessionAuth();

  const [submitting, setSubmitting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function handleLogout() {
    clearError();
    setSubmitting(true);
    try {
      await logout();
      setProfileOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 lg:inline-flex"
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" />
            {desktopCollapsed ? "Expand" : "Collapse"}
          </button>

          <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-50">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Barangay IMS
              </p>
              <h1 className="text-lg font-bold text-slate-900">BIMS</h1>
            </div>
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search residents, requests, reports..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            className="relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                {session?.username
                  ? session.username
                      .slice(0, 2)
                      .toUpperCase()
                  : "B"}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {session?.full_name || session?.username || "Guest"}
                </p>
                <p className="text-xs text-slate-500">
                  {loading ? "Checking session..." : canWrite ? "Staff role" : "Read only"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
                <div className="border-b border-slate-200 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Logged-in Staff
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {session?.full_name || session?.username || "Guest"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {canWrite ? "Staff role enabled" : "Read-only access"}
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    disabled={submitting}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 text-slate-500" />
                    {submitting ? "Signing out..." : "Logout"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </header>
  );
}
