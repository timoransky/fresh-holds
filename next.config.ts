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
};

export default nextConfig;
