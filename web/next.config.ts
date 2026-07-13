import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['madden-franchise'],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
