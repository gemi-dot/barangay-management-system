"use client";

import { useState } from "react";

import { SessionProvider } from "@/components/session-context";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { TopNavigation } from "@/components/top-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  return (
    <SessionProvider>
      <TopNavigation
        onToggleMobileSidebar={() => setMobileSidebarOpen((value) => !value)}
        onToggleDesktopSidebar={() => setDesktopSidebarCollapsed((value) => !value)}
        desktopCollapsed={desktopSidebarCollapsed}
      />

      <SidebarNavigation
        desktopCollapsed={desktopSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleDesktopCollapse={() => setDesktopSidebarCollapsed((value) => !value)}
      />

      <div
        className={`min-h-[calc(100vh-5rem)] bg-slate-100 transition-[padding] duration-300 ${
          desktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <div className="min-h-[calc(100vh-5rem)]">{children}</div>
      </div>
    </SessionProvider>
  );
}
