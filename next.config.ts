import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` does dynamic requires the bundler mishandles — keep it (and Drizzle)
  // as a runtime dependency on the server instead of bundling it.
  serverExternalPackages: ["pg", "drizzle-orm"],
  experimental: {
    serverActions: {
      // Reset-suggestion photos travel through the action (see
      // src/lib/actions/submissions.ts). Vercel hobby caps function bodies
      // at ~4.5 MB, so the photo itself is capped at 4 MB and this leaves
      // headroom for the rest of the multipart payload.
      bodySizeLimit: "5mb",
    },
  },
  // HTTP content negotiation: agents that send `Accept: text/markdown` get the
  // existing markdown digest (`/index.md`) from the same URL that serves HTML
  // to browsers. `beforeFiles` runs before the filesystem, so `/` is rewritten
  // before the page is matched. Add one rule per content route as the app grows.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
          destination: "/index.md",
        },
      ],
    };
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
