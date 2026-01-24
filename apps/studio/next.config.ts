import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://olivea-localhost:3001",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://192.168.1.79:3001",
  ],

  transpilePackages: ["@roseiies/supabase", "@roseiies/core"],

  turbopack: {},
};

export default nextConfig;
