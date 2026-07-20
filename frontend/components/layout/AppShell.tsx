"use client";

import { useState } from "react";

import { SessionProvider } from "@/components/session-context";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SessionProvider>
      <TopHeader onMenuClick={() => setMobileOpen(true)} />
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-h-[calc(100vh-var(--header-height))] bg-[var(--color-background)] lg:pl-[var(--sidebar-width)]">
        <div className="fixed inset-y-[var(--header-height)] left-0 hidden lg:block">
          <Sidebar />
        </div>
        <main className="min-h-[calc(100vh-var(--header-height))]">{children}</main>
      </div>
    </SessionProvider>
  );
}
