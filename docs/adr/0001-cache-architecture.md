# ADR-0001 — Use `unstable_cache`, not `"use cache"` / `cacheComponents`

Status: Accepted (2026-05-17)

## Context

The home page renders gyms in a personalized order — freshest-for-this-user first. The freshness ranking depends on the user's visit history (stored in `localStorage`, mirrored into the `fh-visits` cookie so the server can read it) and on the set of recent resets (fetched from Supabase).

We want:

1. **Server-side ranking.** Visit history is in the cookie, so the server can compute the right order on first paint. No client-side re-sort flash.
2. **Caching keyed per visit pattern + per day.** Users with the same visits share a cache entry; the entry rotates daily so the visit-gap term in the novelty score (see [ADR-0002](0002-gym-scoring-model.md)) stays accurate.
3. **No skeleton flash.** The page should land with the ranked list visible — not as a Suspense fallback that swaps to content.

Next.js 16 ships two caching APIs:

- **`"use cache"` directive + `cacheComponents: true`** — the new, recommended API. Cache keys are derived automatically from serializable arguments. Pairs with the Cache Components rendering model: dynamic data (anything reading `cookies()` / `headers()`) **must** be inside a `<Suspense>` boundary so the static shell can prerender. The fallback is what users see during stream-in.
- **`unstable_cache(fn, keyParts, opts)`** — the older API, [officially marked deprecated](../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md) in favor of `"use cache"`. Same key derivation, same `tags`/`revalidate` mechanics, but does not require `cacheComponents`, so dynamic data does not need to be wrapped in Suspense.

We initially shipped the `"use cache"` version. It built and the route showed as `◐ Partial Prerender`, but the gym list still rendered through a Suspense boundary, so the skeleton flashed on every load. That flash is structural under `cacheComponents`, not a tuning problem — removing the `<Suspense>` causes a build error ("Uncached data was accessed outside of `<Suspense>`").

## Decision

Disable `cacheComponents` (remove from `next.config.ts`). Use `unstable_cache` for both `getActiveGymsWithSections` and `getRankedGyms`. Drop the `<Suspense>` boundary around the gym list. Use `revalidateTag("gyms", "max")` (not `updateTag`) for admin invalidation.

## Consequences

**What we gain**

- The home page renders end-to-end in one shot. On a cache hit, no fallback ever shows.
- Mental model is simple: read cookies + getCurrentUser at the top of the page, pass the cookie value into the cached function, render the result. No Suspense gymnastics.
- `unstable_cache` is battle-tested on Vercel; fewer surprises in production.

**What we accept**

- **Deprecation risk.** `unstable_cache` will be removed at some future Next.js major. Likely v17 at the earliest, given how long it's been the primary caching API. Revisit this ADR when the removal timeline is announced.
- **No PPR static shell anywhere in the app.** Every route is server-rendered on demand now. For Fresh Holds (one main route + tiny admin pages), this is fine — none of the routes had meaningful static content worth prerendering separately from the dynamic data.
- **Cached return values must be JSON-serializable.** `unstable_cache` round-trips through JSON (in production). `Set` / `Map` / class instances do not survive. This bit us once already: `ScoredGym.freshSectionIds` was `Set<string>`, came back as `{}`, and threw `a.freshSectionIds.has is not a function` in Vercel logs. Now `string[]`. Anything new in the cached payload must be a primitive, plain object, or array.
- **`revalidateTag` semantics changed in Next.js 16.** Single-arg form is deprecated; we pass `"max"` for stale-while-revalidate. `updateTag` is a cacheComponents-only API and is not available to us.

## Implementation pointers

- `src/lib/db/gyms.ts` — `getActiveGymsWithSections` wrapped in `unstable_cache`, tagged `["gyms"]`, `revalidate: 86400`.
- `src/lib/db/ranking.ts` — `getRankedGyms(visitsCookieRaw, todayISO)` wrapped similarly; arguments form the cache key.
- `src/lib/actions/admin/resets.ts`, `src/lib/actions/admin/submissions.ts` — call `revalidateTag("gyms", "max")` after writes.
- `src/app/page.tsx` — reads `cookies()` + `getCurrentUser()` directly, calls `getRankedGyms`, renders. No `<Suspense>` around the gym list. The auth header keeps its own Suspense for unrelated reasons (auth lookup can be slow; streaming it is still useful).

## Revisit when

- Next.js announces a removal date for `unstable_cache`.
- A new Next.js version makes Cache Components viable without forcing a Suspense fallback for dynamic content (e.g. cached dynamic components that render synchronously on cache hit).
- We add routes that would genuinely benefit from a prerendered static shell.
