import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['dockerode']  // ← Cambio aquí
};

export default nextConfig;