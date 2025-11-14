import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for Vercel deployment (full-stack)
  // Vercel handles both frontend and API routes automatically
  images: {
    unoptimized: true
  },
  // Remove static export config - we want server-side capabilities for API routes
};

export default nextConfig;
