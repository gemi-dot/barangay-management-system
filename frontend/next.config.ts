import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/inventory/summary",
        destination: "http://web:8000/api/inventory/summary/",
      },
      {
        source: "/api/inventory/assets",
        destination: "http://web:8000/api/inventory/assets/",
      },
      {
        source: "/inventory/items/add",
        destination: "http://web:8000/inventory/items/add/",
      },
      {
        source: "/api/:path*",
        destination: "http://web:8000/api/:path*",
      },
      {
        source: "/accounts/api/:path*",
        destination: "http://web:8000/accounts/api/:path*",
      },
      {
        source: "/assistant/api/:path*",
        destination: "http://web:8000/assistant/api/:path*",
      },
      {
        source: "/inventory/items/:path*",
        destination: "http://web:8000/inventory/items/:path*",
      },
      {
        source: "/static/:path*",
        destination: "http://web:8000/static/:path*",
      },
      {
        source: "/media/:path*",
        destination: "http://web:8000/media/:path*",
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
