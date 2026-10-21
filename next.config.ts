import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Илова кардани конфиги холии turbopack барои бартараф кардани хатогӣ
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'hasi.tj' },
      { protocol: 'http', hostname: 'hasi.tj' },
      { protocol: 'https', hostname: '**.hasi.tj' },
      { protocol: 'http', hostname: '**.hasi.tj' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;