"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Settings, type LucideIcon } from "lucide-react";

import { useSessionAuth } from "@/components/session-context";
import { SIDEBAR_GROUPS, type SidebarLink } from "@/components/sidebar-navigation-data";

type SidebarNavigationProps = {
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktopCollapse: () => void;
};

function isLinkActive(pathname: string, link: SidebarLink) {
  return link.matchPaths.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

function SidebarLinkRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      } ${collapsed ? "justify-center lg:justify-start" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
      <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
    </Link>
  );
}

export function SidebarNavigation({
  desktopCollapsed,
  mobileOpen,
  onCloseMobile,
  onToggleDesktopCollapse,
}: SidebarNavigationProps) {
  const pathname = usePathname();
  const { logout, session, canWrite } = useSessionAuth();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-20 z-50 h-[calc(100vh-5rem)] border-r border-slate-200 bg-white shadow-2xl shadow-slate-300/30 transition-all duration-300 ${
          desktopCollapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div className={`flex items-center gap-3 ${desktopCollapsed ? "lg:justify-center" : ""}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div className={desktopCollapsed ? "lg:hidden" : ""}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Barangay IMS
                </p>
                <h2 className="text-lg font-bold text-slate-900">BIMS</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              className="hidden rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 lg:inline-flex"
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.title}>
                <div className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${desktopCollapsed ? "lg:hidden" : ""}`}>
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((link) => {
                    const active = isLinkActive(pathname, link);
                    const Icon: LucideIcon = link.icon;

                    return (
                      <SidebarLinkRow
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        icon={Icon}
                        active={active}
                        collapsed={desktopCollapsed}
                        onClick={mobileOpen ? onCloseMobile : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className={`rounded-2xl bg-slate-50 p-3 ${desktopCollapsed ? "lg:hidden" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Active Session
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {session?.full_name || session?.username || "Guest"}
              </p>
              <p className="text-xs text-slate-500">
                {canWrite ? "Staff access enabled" : "Read-only access"}
              </p>
            </div>

            <div className="mt-3 space-y-1">
              <Link
                href="/settings"
                onClick={mobileOpen ? onCloseMobile : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${
                  desktopCollapsed ? "justify-center lg:justify-start" : ""
                }`}
                title={desktopCollapsed ? "Settings" : undefined}
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span className={desktopCollapsed ? "lg:hidden" : ""}>Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${
                  desktopCollapsed ? "justify-center lg:justify-start" : ""
                }`}
                title={desktopCollapsed ? "Logout" : undefined}
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span className={desktopCollapsed ? "lg:hidden" : ""}>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
