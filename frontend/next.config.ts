import type { NextConfig } from "next";

// In Docker, docker-compose explicitly injects INTERNAL_BACKEND_URL=http://backend:8000.
// On the host machine (npm run dev outside Docker), fallback to http://127.0.0.1:8000.
const rawBackendUrl =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

const backendUrl = rawBackendUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: `${backendUrl}/api/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/media/:path*/',
        destination: `${backendUrl}/media/:path*/`,
      },
      {
        source: '/media/:path*',
        destination: `${backendUrl}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
