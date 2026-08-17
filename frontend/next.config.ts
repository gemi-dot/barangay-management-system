import type { NextConfig } from "next";

// Django backend address.
//
// Local Mac development:
//   http://127.0.0.1:8000
//
// Docker can override this with:
//   INTERNAL_DJANGO_URL=http://web:8000
const djangoBaseUrl =
  process.env.INTERNAL_DJANGO_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/inventory/summary",
        destination: `${djangoBaseUrl}/api/inventory/summary/`,
      },
      {
        source: "/api/inventory/assets",
        destination: `${djangoBaseUrl}/api/inventory/assets/`,
      },
      {
        source: "/api/reports/today-visitors",
        destination: `${djangoBaseUrl}/api/reports/today-visitors/`,
      },
      {
        source: "/api/bhw-reports/summary",
        destination: `${djangoBaseUrl}/api/bhw-reports/summary/`,
      },
      {
        source: "/inventory/items/add",
        destination: `${djangoBaseUrl}/inventory/items/add/`,
      },
      {
        source: "/api/:path*",
        destination: `${djangoBaseUrl}/api/:path*`,
      },
      {
        source: "/accounts/api/:path*",
        destination: `${djangoBaseUrl}/accounts/api/:path*`,
      },
      {
        source: "/assistant/api/:path*",
        destination: `${djangoBaseUrl}/assistant/api/:path*`,
      },
      {
        source: "/inventory/items/:path*",
        destination: `${djangoBaseUrl}/inventory/items/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${djangoBaseUrl}/static/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${djangoBaseUrl}/media/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/reports/households",
        destination: "/households",
        permanent: true,
      },
      {
        source: "/residents/reports",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/residents/dashboard/voters-by-precinct",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/residents/voters-report",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/residents/voters-by-precinct",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/residents/scan/input",
        destination: "/residents/scan/test",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
