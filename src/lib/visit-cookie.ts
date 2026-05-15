import type { Visits } from "@/hooks/useVisits";

// Tiny mirror of the latest-visit-per-gym map (Visits), kept alongside
// localStorage so the server can pre-rank the home page without waiting
// for client hydration. localStorage stays canonical; the cookie is
// derived state, refreshed on every visit change.
//
// Cookie name is intentionally short to keep header size down. Format
// is URL-encoded JSON of a Visits map (gym_slug → ISO date).
//
// This module is environment-neutral — no "server-only" guard, no
// next/headers import — so the constant can be shared with the
// client-side cookie writer in useVisits. The server reads happen
// inline in src/app/page.tsx via the cookies() API.
export const VISITS_COOKIE = "fh-visits";

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
