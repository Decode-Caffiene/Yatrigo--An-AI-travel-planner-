import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      {
        protocol: "https",
        hostname: "images.kiwi.com",
      },
    ],
  },
};

export default nextConfig;
