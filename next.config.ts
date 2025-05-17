import type { NextConfig } from 'next';

const nextConfig = {
  webpack: (config: any) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};
export default nextConfig;

module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://146.190.186.116:8000/api/:path*', // Proxy to HTTP API
      },
    ];
  },
};
