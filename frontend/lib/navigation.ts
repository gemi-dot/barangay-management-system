import {
  Bot,
  Boxes,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  ShieldAlert,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { OfficeRole } from "@/lib/design-tokens";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPaths: string[];
  roles?: OfficeRole[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, matchPaths: ["/"] },
  { label: "Residents", href: "/residents", icon: Users, matchPaths: ["/residents"] },
  { label: "Households", href: "/households", icon: Home, matchPaths: ["/households"], roles: ["Secretary", "Captain", "Superuser"] },
  { label: "Document Requests", href: "/document-requests", icon: ClipboardList, matchPaths: ["/document-requests"], roles: ["Secretary", "BHW", "Captain", "Superuser"] },
  { label: "Inventory", href: "/inventory", icon: Boxes, matchPaths: ["/inventory"], roles: ["Secretary", "Captain", "Superuser"] },
  { label: "Blotter", href: "/blotter", icon: ShieldAlert, matchPaths: ["/blotter"], roles: ["Secretary", "Captain", "Superuser"] },
  { label: "BHW Reports", href: "/bhw-reports", icon: HeartPulse, matchPaths: ["/bhw-reports"], roles: ["BHW", "Secretary", "Captain", "Superuser"] },
  { label: "Reports", href: "/reports", icon: FileText, matchPaths: ["/reports"] },
  { label: "Assistant", href: "/assistant", icon: Bot, matchPaths: ["/assistant"] },
  { label: "Staff Administration", href: "/settings", icon: UserCog, matchPaths: ["/settings"], roles: ["Secretary", "Captain", "Superuser"] },
];
