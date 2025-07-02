/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['besu-network-manager'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle Docker socket access on server side
      config.externals.push({
        'dockerode': 'commonjs dockerode'
      });
    }
    return config;
  },
  env: {
    DOCKER_SOCKET_PATH: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
  }
};

module.exports = nextConfig;
