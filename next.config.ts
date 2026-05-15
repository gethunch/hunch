import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Shell + Codespaces serve the dev server through a preview hostname.
  // Next.js blocks cross-origin requests in dev unless explicitly allowed.
  allowedDevOrigins: [
    "*.cloudshell.dev",
    "*.app.github.dev",
  ],
};

export default nextConfig;
