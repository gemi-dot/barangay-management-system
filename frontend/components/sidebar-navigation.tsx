"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Settings, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { useSessionAuth } from "@/components/session-context";
import { SIDEBAR_GROUPS, type SidebarLink } from "@/components/sidebar-navigation-data";

type SidebarNavigationProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
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
      className={`group flex items-center gap-3 rounded-[1.1rem] px-3 py-3 text-sm font-medium transition duration-200 ${
        active
          ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-lg shadow-blue-200 ring-1 ring-blue-500/10"
          : "text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950"
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
      <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
    </Link>
  );
}

export function SidebarNavigation({
  mobileOpen,
  onCloseMobile,
}: SidebarNavigationProps) {
  const pathname = usePathname();
  const { logout, session, canWrite } = useSessionAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Main: true,
    People: true,
    Services: true,
    Operations: true,
    Health: true,
    Reports: true,
    AI: true,
    System: true,
  });

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
        className={`fixed left-0 top-20 z-50 h-[calc(100vh-5rem)] w-[18rem] border-r border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-200 ring-1 ring-blue-500/10">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Barangay IMS
                </p>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">BIMS</h2>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
            {SIDEBAR_GROUPS.map((group) => {
              const isOpen = openSections[group.title] !== false;
              const sectionClassName = isOpen
                ? "border-slate-200/80 bg-white shadow-sm"
                : "border-slate-100 bg-slate-50/70";

              return (
                <div
                  key={group.title}
                  className={`rounded-[1.35rem] border p-2 transition-all duration-200 ${sectionClassName}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((current) => ({
                        ...current,
                        [group.title]: !isOpen,
                      }))
                    }
                    className={`flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left transition-all duration-200 ${
                      isOpen ? "bg-slate-50/80 hover:bg-slate-100" : "bg-transparent hover:bg-slate-100/80"
                    }`}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                        {group.title}
                      </span>
                      <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {group.items.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-slate-600" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-2 space-y-1.5 px-1 pb-1">
                      {group.items.map((link) => {
                        const active = link.label === "Logout" ? false : isLinkActive(pathname, link);
                        const Icon: LucideIcon = link.icon;

                        if (link.label === "Logout") {
                          return (
                            <button
                              key={link.label}
                              type="button"
                              onClick={() => {
                                void logout();
                                if (mobileOpen) {
                                  onCloseMobile();
                                }
                              }}
                              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                              <span>{link.label}</span>
                            </button>
                          );
                        }

                        return (
                          <SidebarLinkRow
                            key={link.href}
                            href={link.href}
                            label={link.label}
                            icon={Icon}
                            active={active}
                            collapsed={false}
                            onClick={mobileOpen ? onCloseMobile : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-sm">
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
                className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  onCloseMobile();
                }}
                className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
