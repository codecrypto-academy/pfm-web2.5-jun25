/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification to avoid potential issues
  swcMinify: false,
  // Ensure proper handling of external packages
  transpilePackages: ['ethers'],
  // Add webpack config for better compatibility
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Only ignore native modules in client-side builds
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'dockerode': 'dockerode',
        'ssh2': 'ssh2',
      };
    }
    
    // Add alias for besu-sdk to ensure it resolves correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      'besu-sdk': require.resolve('../besu-sdk/dist/index.js'),
    };
    
    // Ignore specific native modules
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
}

module.exports = nextConfig