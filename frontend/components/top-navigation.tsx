"use client";

import Link from "next/link";
import { Bell, ChevronDown, Menu, LogOut, Settings, Search, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSessionAuth } from "@/components/session-context";

type TopNavigationProps = {
  onToggleMobileSidebar: () => void;
};

export function TopNavigation({
  onToggleMobileSidebar,
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 xl:gap-4">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-slate-200 bg-white text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-3 rounded-[1.25rem] px-2 py-1 transition hover:bg-slate-50">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-200 ring-1 ring-blue-500/10">
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

        <div className="flex min-w-0 flex-1 items-center gap-3 xl:gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search residents, requests, reports..."
              className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            className="relative hidden h-12 w-12 items-center justify-center rounded-[1.1rem] border border-slate-200 bg-white text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50 sm:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 rounded-full border-2 border-white bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
              3
            </span>
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br from-blue-600 to-sky-500 text-sm font-bold text-white shadow-md shadow-blue-200 ring-1 ring-blue-500/10">
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
              <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
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
                    className="flex items-center gap-3 rounded-[1.1rem] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
                    className="flex w-full items-center gap-3 rounded-[1.1rem] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
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
