import type { Visits } from "./types";

// Server-side counterpart to the client cookie writer. Decodes the
// URL-encoded JSON cookie value and validates the shape. Anything
// malformed degrades to an empty Visits map — the page still renders,
// just without personalization.
export function parseVisitsCookie(raw: string | undefined): Visits {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Visits = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof slug === "string" && slug && typeof value === "string" && value) {
        out[slug] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}
