import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { renderGymsMarkdown } from "@/lib/agentDigest";

// The Markdown twin of the home page. Browsers reach the HTML at `/`; agents
// sending `Accept: text/markdown` are rewritten here by next.config.ts, and it
// doubles as the `<link rel="alternate" type="text/markdown">` discovery URL.
// Both views read the same cached gym data (getActiveGymsWithSections), so the
// Markdown can never drift from what the page renders.
export async function GET() {
  const gyms = await getActiveGymsWithSections();

  return new Response(renderGymsMarkdown(gyms), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      // `/` serves HTML or Markdown depending on Accept, so caches must key on
      // it — otherwise a browser could be served Markdown, or an agent HTML.
      vary: "Accept",
      // Keep the Markdown variant out of search indexes; `/` is the canonical,
      // indexable URL.
      "x-robots-tag": "noindex",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
