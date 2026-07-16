import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
