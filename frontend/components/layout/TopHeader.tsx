"use client";

import Link from "next/link";
import { Menu, LogOut } from "lucide-react";

import { useSessionAuth } from "@/components/session-context";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

type TopHeaderProps = {
  onMenuClick: () => void;
};

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { session, canWrite, logout } = useSessionAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[var(--layout-max-width)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] text-slate-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="text-lg font-bold text-[var(--color-text-primary)]">
            Barangay IMS
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 sm:inline-flex">
            {canWrite ? "Staff access" : "Read-only"}
          </span>
          <span className="hidden text-sm text-[var(--color-text-secondary)] md:inline">
            {session?.full_name || session?.username || "Guest"}
          </span>
          <SecondaryButton
            onClick={() => {
              void logout();
            }}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Logout
          </SecondaryButton>
        </div>
      </div>
    </header>
  );
}
