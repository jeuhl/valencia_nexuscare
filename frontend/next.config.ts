import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' *; connect-src 'self' *; style-src 'self' 'unsafe-inline' *;",
          },
        ],
      },
    ];
  },
  turbopack: {
    // Acknowledge custom config for Next.js 16
  },
};

export default nextConfig;
