# Fresh Holds — Domain glossary

Vocabulary the code and the UI should use consistently. Add terms here as they crystallize; don't pre-fill speculatively. Sharper definitions over time are expected.

## Core nouns

**Gym** — a bouldering gym in Bratislava. Rows in `gyms`. Active gyms (`is_active = true`) are the only ones surfaced. Has many **Sections** and an externally-facing `freshness_mode` of either `"sections"` or `"count"` that decides how its freshness is summarized.

**Section** — a labeled area of a Gym (a panel, wall, or zone). Rows in `sections`. Same word as **Sector** in user-facing strings — the UI displays "sector," the code says "section." Has many **Resets**, ordered by `display_order` for stable visual layout.

**Reset** — a logged event recording that new boulder problems were set on a Section on a given date. Rows in `resets`. Has `reset_on` (ISO date) and optional `boulders_reset` (count for "count"-mode gyms). Logged manually in the Supabase dashboard.

**Visit** — a user-recorded date the user climbed at a Gym. Stored in browser `localStorage` for anonymous users (`Record<gymSlug, isoDate[]>`) and on the server for signed-in users. The most recent visit per gym is what freshness compares against.

**Visit log** — the unified record of a user's Visits across the three places it has to exist: browser `localStorage` (canonical client store), the `fh-visits` cookie (latest-per-gym mirror so the server can pre-rank), and the server `visits` table (for cross-device sync of signed-in users). Owned by `src/lib/visit-log/`. One client hook (`useVisitLog(authed)`) for all consumers — when authed, it reconciles local with server once per tab session via a pure `reconcile(local, remote)` function. Server actions in `src/lib/actions/visits.ts` provide the RPC seam to the visits table.

## Derived concepts

**Freshness** — for a given Gym and a given user, the resets that happened _strictly after_ the user's last Visit. A Section is fresh iff it has any Reset later than the visit. A never-visited Gym treats every reset as fresh by definition.

**Novelty score** — `visitFactor × substance`. For a visited gym, `visitFactor` ramps `min(daysSinceVisit / 14, 2.5)`. For a never-visited gym there's no visit-gap signal, so `visitFactor` instead decays with the freshest reset's age — `max(0.5, 1.0 − 0.05 × daysSinceFreshReset)` — which is what orders the first-open page (gyms reset ~weekly, so the freshest reset is usually 0–7 days old). `substance` is sector coverage for multi-sector gyms, or a tiered function of boulder count / fresh-row count for single-sector gyms. Encodes "how much new climbing is waiting for me at this gym, and how starved am I for it." The home-page sort key. See [ADR-0002](docs/adr/0002-gym-scoring-model.md) for the full formula and constant rationale.

**Tier** — one of `hot` / `fresh` / `worth` / `slim` / `stale` / `unknown`, bound from the Novelty score (and a "just visited" floor). Each tier has user-facing copy ("sending hot", "looking fresh", "worth a climb", etc.), an emoji, and a CSS token set. The `fresh` (amber, "looking fresh") band sits between `hot` and `worth` and is the only above-`worth` tier reachable without a visit gap. UI never speaks raw scores — it speaks Tiers.

**ScoredGym** — a Gym paired with everything derived for it at a specific user-and-time: Novelty score, Tier, label counts, narrative string, badge string, sorted sections, flat reset list. The output of `scoreGym(gym, lastVisited)`. The deep Freshness module's currency — components consume `ScoredGym` fields rather than re-deriving.

**Now** — the moment freshness is computed relative to. Read implicitly via `Date.now()` inside the Freshness module's date helpers; not threaded through the API. Trade-off: a render that straddles midnight, or an SSR/client pair that disagrees on the clock, can produce slightly different `daysSince` for the same input. Acceptable for this app — see ADR / issue #35 for the rejected alternative of threading an explicit `now` param.

## Caching

**Gym cache** — `getActiveGymsWithSections` in `src/lib/db/gyms.ts` is wrapped in `unstable_cache` (not `"use cache"`), tagged `"gyms"`, revalidated daily. The Supabase query is the cache fill.

**Ranking cache** — `getRankedGyms(visitsCookieRaw, todayISO)` in `src/lib/db/ranking.ts` is wrapped in `unstable_cache` and tagged `"gyms"`. Both arguments are cache key participants: users with the same visits share an entry; the entry rotates daily so the time-decay term in the novelty score stays accurate. Empty cookie collapses to one shared entry across all anonymous-no-visit users.

**Invalidation** — Admin reset/approve actions call `revalidateTag("gyms", "max")` (the second arg is mandatory in Next.js 16; `"max"` = stale-while-revalidate). The single-arg form is deprecated. `updateTag` is unavailable to us because it's a cacheComponents-only API.

**Serialization** — Anything returned from a cached function must be JSON-serializable. `Set`, `Map`, class instances do not survive the round-trip (caught us with `freshSectionIds` — now `string[]`). Stick to primitives, arrays, and plain objects.

We deliberately chose `unstable_cache` over `"use cache"` + `cacheComponents`, accepting deprecation risk in exchange for not having to render the gym list through a Suspense boundary. See [ADR-0001](docs/adr/0001-cache-architecture.md) for the full rationale and revisit triggers.

## Home-page categories

`rankGyms(gyms, visits)` partitions Gyms into three categories the UI renders separately:

**Hero** — the top ScoredGym. The card that auto-expands. Picks the highest Novelty score with reset data; falls back to a no-data Gym only if no Gym has reset data at all.

**Runners-up** — every other Gym with reset data, sorted by Novelty score (tiebreak: most recent fresh reset date descending).

**No-data extras** — Gyms with no resets in the cutoff window. Rendered at the bottom under "no reset data yet" — we can't help the user pick between them.
