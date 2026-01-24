import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "olivea-localhost",
    "localhost",
    "127.0.0.1",
    "192.168.1.79",
  ],

  transpilePackages: ["@roseiies/supabase", "@roseiies/core"],

  // ✅ enable compiler optimizations for React (matches apps/marketing)
  reactCompiler: true,

  turbopack: {},
};

export default nextConfig;
