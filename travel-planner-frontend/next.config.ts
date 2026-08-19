import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   allowedDevOrigins: [
    "ishan-awasthi-aspire-a315-510p.tail398f1b.ts.net",
      "children-atlantic-sleeve-touch.trycloudflare.com",
  ],
  // Proxy API calls through the Next server so remote devices (phones on the
  // tailnet) reach the backend without needing localhost:5000 themselves.
  rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
  images: {
    // Destination photos are immutable Wikimedia files, and the optimizer
    // fetches them server-side from a single IP — re-fetching on every
    // request gets us rate-limited (429), which shows users a placeholder.
    // Cache each optimized image for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "cf.bstatic.com",
      },
    ],
  },
};

export default nextConfig;
