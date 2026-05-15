import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Shell serves the dev server through a multi-level subdomain
  // (e.g. <port>-cs-<id>-default.cs-<region>-<x>.cloudshell.dev).
  // Next's `*.cloudshell.dev` glob only matches one subdomain level,
  // so we list the exact host for this Cloud Shell session.
  // Update this if the Cloud Shell session ID changes.
  allowedDevOrigins: [
    "3000-cs-625140717943-default.cs-asia-southeast1-bool.cloudshell.dev",
  ],
};

export default nextConfig;
