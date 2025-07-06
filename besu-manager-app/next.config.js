const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Permitir resolución de módulos locales
    externalDir: true,
  },
  turbopack: {
    resolveAlias: {
    },
  },
};

module.exports = nextConfig;