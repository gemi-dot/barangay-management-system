"use client";

import { useState } from "react";

import { SessionProvider } from "@/components/session-context";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { TopNavigation } from "@/components/top-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <TopNavigation
        onToggleMobileSidebar={() => setMobileSidebarOpen((value) => !value)}
      />

      <SidebarNavigation
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="min-h-[calc(100vh-5rem)] bg-slate-100 lg:pl-72">
        <div className="min-h-[calc(100vh-5rem)]">{children}</div>
      </div>
    </SessionProvider>
  );
}
