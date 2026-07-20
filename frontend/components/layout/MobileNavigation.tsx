"use client";

import { X } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";

type MobileNavigationProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close mobile navigation"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45"
      />
      <div className="relative h-full w-[var(--sidebar-width)] max-w-[88vw]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
