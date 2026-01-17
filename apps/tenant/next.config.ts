import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Allows custom dev hostnames like olivea-localhost
   * without cross-origin warnings in dev.
   */
  allowedDevOrigins: ["olivea-localhost", "localhost", "192.168.1.79"],

  /**
   * Keep Turbopack enabled (no custom options yet)
   */
  turbopack: {}
};

export default nextConfig;