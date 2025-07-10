const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@lib'] = path.resolve(__dirname, './libsrc');
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['dockerode', 'fs-extra']
  },
  serverRuntimeConfig: {
    // Permitir acceso al sistema de archivos
    projectRoot: __dirname,
  },
};

module.exports = nextConfig; 