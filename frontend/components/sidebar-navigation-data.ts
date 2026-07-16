import {
  Bot,
  Boxes,
  Cake,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  QrCode,
  SearchCheck,
  ShieldAlert,
  type LucideIcon,
  Users,
  Landmark,
  Settings,
} from "lucide-react";

export type SidebarLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPaths: string[];
};

export type SidebarGroup = {
  title: string;
  items: SidebarLink[];
};

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        matchPaths: ["/"],
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Residents",
        href: "/residents",
        icon: Users,
        matchPaths: ["/residents"],
      },
      {
        label: "Households",
        href: "/households",
        icon: Home,
        matchPaths: ["/households"],
      },
      {
        label: "QR Scan",
        href: "/residents/scan/input",
        icon: QrCode,
        matchPaths: ["/residents/scan"],
      },
      {
        label: "Quick Gender",
        href: "/residents/quick-gender-correction",
        icon: SearchCheck,
        matchPaths: ["/residents/quick-gender-correction"],
      },
      {
        label: "Quick Birthday",
        href: "/residents/quick-birthday-correction",
        icon: Cake,
        matchPaths: ["/residents/quick-birthday-correction"],
      },
    ],
  },
  {
    title: "Services",
    items: [
      {
        label: "Document Requests",
        href: "/document-requests",
        icon: ClipboardList,
        matchPaths: ["/document-requests"],
      },
      {
        label: "Track Request",
        href: "/track-request",
        icon: SearchCheck,
        matchPaths: ["/track-request"],
      },
      {
        label: "Resident Portal",
        href: "/resident-portal",
        icon: Landmark,
        matchPaths: ["/resident-portal"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: Boxes,
        matchPaths: ["/inventory"],
      },
      {
        label: "Blotter",
        href: "/blotter",
        icon: ShieldAlert,
        matchPaths: ["/blotter"],
      },
    ],
  },
  {
    title: "Health",
    items: [
      {
        label: "BHW Reports",
        href: "/bhw-reports",
        icon: HeartPulse,
        matchPaths: ["/bhw-reports"],
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: FileText,
        matchPaths: ["/reports"],
      },
    ],
  },
  {
    title: "AI Tools",
    items: [
      {
        label: "Assistant",
        href: "/assistant",
        icon: Bot,
        matchPaths: ["/assistant"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        matchPaths: ["/settings"],
      },
    ],
  },
];
