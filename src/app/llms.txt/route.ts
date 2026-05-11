export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const body = [
    "# Fresh Holds",
    "",
    "> Fresh Holds tracks which Bratislava bouldering gyms have been freshly reset, helping climbers pick where to go next based on what's new since their last visit.",
    "",
    "Resets are logged manually by the maintainer. Per-user visit history is stored in the browser only and is not exposed via this endpoint.",
    "",
    "## Data",
    "",
    `- [Recent resets across all gyms](${origin}/index.md): markdown summary of every active Bratislava bouldering gym with its recent resets, sorted newest-reset first.`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
