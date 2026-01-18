import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "olivea-localhost",
    "localhost",
    "127.0.0.1",
    "192.168.1.79",
  ],

  turbopack: {},
};

export default nextConfig;