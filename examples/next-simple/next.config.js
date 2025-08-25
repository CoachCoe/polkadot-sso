/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@polkadot-auth/core', '@polkadot-auth/next'],
};

module.exports = nextConfig;
