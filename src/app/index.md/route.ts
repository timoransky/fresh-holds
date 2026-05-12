import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { renderGymsMarkdown } from "@/lib/agentDigest";

export async function GET() {
  const gyms = await getActiveGymsWithSections();
  return new Response(renderGymsMarkdown(gyms), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
