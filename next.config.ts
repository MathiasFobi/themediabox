import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Vercel static hosting
  output: "export",
  // Required for static export: disable image optimization
  images: {
    unoptimized: true,
  },
  // Trailing slashes are friendlier for static hosts
  trailingSlash: true,
};

export default nextConfig;
