import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  experimental: {},
  serverExternalPackages: ['@modelcontextprotocol/sdk']
};

export default nextConfig;
