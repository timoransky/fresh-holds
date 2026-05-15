import "server-only";
import { cookies } from "next/headers";
import type { Visits } from "@/hooks/useVisits";

// Tiny mirror of the latest-visit-per-gym map (Visits), kept alongside
// localStorage so the server can pre-rank the home page without waiting
// for client hydration. localStorage stays canonical; the cookie is
// derived state, refreshed on every visit change.
//
// Cookie name is intentionally short to keep header size down. Format
// is URL-encoded JSON of a Visits map (gym_slug → ISO date).
export const VISITS_COOKIE = "fh-visits";

export async function readVisitsCookie(): Promise<Visits> {
  try {
    const store = await cookies();
    const raw = store.get(VISITS_COOKIE)?.value;
    if (!raw) return {};
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
