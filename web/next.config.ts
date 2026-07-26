import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['madden-franchise'],
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Dynasty uploads can be large; raise limits for hosted extract flows.
    serverActions: {
      bodySizeLimit: '256mb',
    },
    middlewareClientMaxBodySize: '256mb',
  },
};

export default nextConfig;
