/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: [
      "olivea-localhost",
      "localhost",
      "127.0.0.1",
    ],
  },
};

module.exports = nextConfig;
