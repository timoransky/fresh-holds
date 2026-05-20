import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Reset-suggestion photos travel through the action (see
      // src/lib/actions/submissions.ts). Vercel hobby caps function bodies
      // at ~4.5 MB, so the photo itself is capped at 4 MB and this leaves
      // headroom for the rest of the multipart payload.
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        // Never let the browser's HTTP cache hold onto the service worker —
        // we want SW updates to roll out as soon as a user reloads.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
