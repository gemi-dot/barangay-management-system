"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSessionAuth } from "@/components/session-context";
import { cn } from "@/lib/cn";
import type { OfficeRole } from "@/lib/design-tokens";
import { NAVIGATION_ITEMS } from "@/lib/navigation";

type SidebarProps = {
  onNavigate?: () => void;
};

function toOfficeRoles(session: ReturnType<typeof useSessionAuth>["session"]): OfficeRole[] {
  if (!session?.is_authenticated) {
    return [];
  }

  const roles = new Set<OfficeRole>();

  if (Array.isArray(session.office_roles)) {
    for (const role of session.office_roles) {
      if (role === "Secretary" || role === "BHW" || role === "Captain") {
        roles.add(role);
      }
    }
  }

  if (session.is_superuser) {
    roles.add("Superuser");
  }

  return [...roles];
}

function hasAccess(requiredRoles: OfficeRole[] | undefined, userRoles: OfficeRole[]) {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.some((role) => userRoles.includes(role));
}

function isActive(pathname: string, matchPaths: string[]) {
  return matchPaths.some((path) => {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { session } = useSessionAuth();
  const userRoles = toOfficeRoles(session);

  return (
    <aside className="h-full w-[var(--sidebar-width)] border-r border-[var(--color-border)] bg-[var(--color-nav-bg)] text-[var(--color-nav-text)]">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-100/70">Barangay IMS</p>
          <h2 className="text-lg font-bold text-white">Navigation</h2>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAVIGATION_ITEMS.filter((item) => hasAccess(item.roles, userRoles)).map((item) => {
            const active = isActive(pathname, item.matchPaths);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-[var(--color-nav-bg)]"
                    : "text-[var(--color-nav-text)] hover:bg-[var(--color-nav-bg-soft)]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
