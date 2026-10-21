import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Явно разрешаем hasi.tj и любые внешние источники.
    remotePatterns: [
      { protocol: 'https', hostname: 'hasi.tj' },
      { protocol: 'http', hostname: 'hasi.tj' },
      { protocol: 'https', hostname: '**.hasi.tj' },
      { protocol: 'http', hostname: '**.hasi.tj' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // Разрешаем SVG из внешних источников (логотипы, иконки).
    dangerouslyAllowSVG: true,
    // Отключаем строгую валидацию форматов — SVG и прочие проходят через unoptimized.
    unoptimized: false,
  },
  // Отключаем строгую проверку SVG-файлов в dev-режиме.
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;