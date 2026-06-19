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
  async rewrites() {
    return {
      // beforeFiles so the Accept check wins before `/` resolves to the HTML
      // page. Agents sending `Accept: text/markdown` transparently get the
      // Markdown twin from the same URL (the route handler sets `Vary: Accept`);
      // browsers send `text/html` and fall through to the page. One rule per
      // content route — only `/` serves content today, so it gets `/md`; any
      // future content route would map to its own parallel `/md/...` handler.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
          destination: "/md",
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
