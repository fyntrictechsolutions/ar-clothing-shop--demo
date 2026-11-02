import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH when hosting under a sub-path (e.g. GitHub Pages: /repo-name).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes a plain HTML/JS site to out/ that any host can serve.
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
