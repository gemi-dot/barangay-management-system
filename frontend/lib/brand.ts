export const BRAND = {
  company: "SoftWorks Community Solutions",
  product: "Barangay Integrated Management System",
  shortName: "BIMS",
  tagline: "Code That Cares. Technology That Serves Communities.",
  version: "Enterprise Edition v2.0",
  releaseLabel: "Version 2.0 Enterprise",
  build: "2026.07",
  copyright: "Copyright © 2026 SoftWorks Community Solutions. All Rights Reserved.",
  website: "https://softworks.ph",
  supportEmail: "support@softworks.ph",
  mission: "Empowering Local Governments through secure, modern, and practical digital solutions.",
  stack: {
    frontend: "Next.js",
    backend: "Django REST Framework",
    databaseDevelopment: "SQLite (Development)",
  },
  deploymentReady: ["Render", "Vercel"],
} as const;

export function getEnvironmentLabel() {
  return process.env.NODE_ENV === "production" ? "Production" : "Development";
}
