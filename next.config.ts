import type { NextConfig } from 'next';
import path from 'path';

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://va.vercel-scripts.com https://cdn.jsdelivr.net",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://data.brreg.no https://ws.geonorge.no https://api.open-meteo.com https://api.resend.com https://api.met.no https://generativelanguage.googleapis.com https://*.railway.app wss://*.railway.app",
  "img-src 'self' data: https: blob:",
  // SIKKERHETSFIKS (F-02): Google Fonts er fjernet fra layout.tsx, så CSP-en
  // trenger ikke lenger å tillate fonts.googleapis.com eller fonts.gstatic.com.
  // Det er også en innstramming: ingen tredjeparts font-CDN kan lastes.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' data: https: blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests"
].join('; ');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/openai/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, geolocation=*',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
