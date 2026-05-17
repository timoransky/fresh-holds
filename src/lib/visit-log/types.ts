// The canonical types for the Visit log. Other Modules (freshness,
// ranking, server actions) import from this Module rather than from
// hooks/, so the dependency points lib → lib instead of lib → hooks.

// Full record per gym — every date the user logged. Used by the calendar
// UI and the "visits logged" / "gyms tried" counts.
export type VisitHistory = Record<string, string[]>;

// Latest visit per gym — the view freshness scoring needs. Derived from
// VisitHistory by reducing each gym's dates to the max. Mirrored to the
// fh-visits cookie so the server can pre-rank without waiting for client
// hydration.
export type Visits = Record<string, string>;

// Cookie name is intentionally short to keep header size down. Format is
// URL-encoded JSON of a Visits map.
export const VISITS_COOKIE = "fh-visits";
