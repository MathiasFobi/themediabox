import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic hosting (Vercel): required for API routes
  // (/api/stripe/webhook, /api/orders/*). The storefront is no longer a
  // static export — deploy as a standard Next.js app.
  images: {
    unoptimized: true,
  },
  // Trailing slashes are friendlier for static hosts
  trailingSlash: true,
};

export default nextConfig;
