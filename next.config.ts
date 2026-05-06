import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  serverExternalPackages: ["@react-pdf/renderer", "xlsx", "adm-zip"],
};

export default nextConfig;
