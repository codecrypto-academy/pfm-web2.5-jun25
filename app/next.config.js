/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add the besu lib as an external module
    config.resolve.alias["besu-lib"] = path.resolve(__dirname, "../lib/src/");
    config.resolve.alias["besu-network-lib"] = path.resolve(
      __dirname,
      "../lib/"
    );
    config.resolve.alias["besu-network-lib/dist/src/create-besu-networks"] =
      path.resolve(__dirname, "../lib/src/create-besu-networks.js");
    return config;
  },
};

module.exports = nextConfig;
