/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification to avoid potential issues
  swcMinify: false,
  // Ensure proper handling of external packages
  transpilePackages: ['ethers'],
  // Add webpack config for better compatibility
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig