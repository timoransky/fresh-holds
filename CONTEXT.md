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

**Novelty score** — `turnover × recency`, both in `0..1`. `turnover = min(unseenResets / 3, 1)` where an _unseen reset_ is any reset row logged after your last visit (anon users count as having last visited 28 days ago); each row — a named sector's drop, or "part of the gym" for unnamed gyms — is one chunk, and boulder counts are deliberately ignored. `recency = 0.5 ^ (daysSinceNewestUnseenReset / 7)` — a one-week half-life matching the reset cadence. Encodes the two deciding factors: how long ago the gym reset, and how long ago you visited. The home-page sort key. See [ADR-0003](docs/adr/0003-turnover-times-recency-scoring.md) for the full formula and constant rationale (supersedes ADR-0002).

**Tier** — one of `hot` / `fresh` / `worth` / `slim` / `stale` / `unknown`, bound from fixed cuts of the 0..1 Novelty score (`hot` ≥ 0.85, `fresh` ≥ 0.70, `worth` ≥ 0.50, `slim` > 0, `stale` = 0, `unknown` = no reset data). The cuts are spaced to a week of reset recency, so on a saturated (anon / long-gap) gym the tier tracks reset age: 0–1 days → `hot`, 2–3 → `fresh`, 4–7 → `worth`. Each tier has user-facing copy ("sending hot", "looking fresh", "worth a climb", etc.), an emoji, and a CSS token set. UI never speaks raw scores — it speaks Tiers.

**ScoredGym** — a Gym paired with everything derived for it at a specific user-and-time: Novelty score, Tier, label counts, narrative string, sorted sections, flat reset list. The output of `scoreGym(gym, lastVisited)`. The deep Freshness module's currency — components consume `ScoredGym` fields rather than re-deriving.

**Two voices** — all user-facing freshness copy (narrative, tables) is phrased per gym by whether a visit is logged. _Returning_ voice anchors to "since your visit" (counts are personal and exact, fresh dots allowed). _Anon_ voice describes the gym's activity — "Last reset {when} -" plus a tier punchline — and never says "fresh for you" or "never visited", because the 28-day scoring window is invisible and visit history is localStorage-only. The freshness badge itself carries no count — just emoji + tier title; the number lives in the narrative. See ADR-0003 "Display language".

**Now** — the moment freshness is computed relative to. Read implicitly via `Date.now()` inside the Freshness module's date helpers; not threaded through the API. Trade-off: a render that straddles midnight, or an SSR/client pair that disagrees on the clock, can produce slightly different `daysSince` for the same input. Acceptable for this app — see ADR / issue #35 for the rejected alternative of threading an explicit `now` param.

## Caching

**Gym cache** — `getActiveGymsWithSections` in `src/lib/db/gyms.ts` is wrapped in `unstable_cache` (not `"use cache"`), tagged `"gyms"`, revalidated daily. The Drizzle query (plain `db`, public read) is the cache fill.

**Ranking cache** — `getRankedGyms(visitsCookieRaw, todayISO)` in `src/lib/db/ranking.ts` is wrapped in `unstable_cache` and tagged `"gyms"`. Both arguments are cache key participants: users with the same visits share an entry; the entry rotates daily so the time-decay term in the novelty score stays accurate. Empty cookie collapses to one shared entry across all anonymous-no-visit users.

**Invalidation** — Admin reset/approve actions call `revalidateTag("gyms", "max")` (the second arg is mandatory in Next.js 16; `"max"` = stale-while-revalidate). The single-arg form is deprecated. `updateTag` is unavailable to us because it's a cacheComponents-only API.

**Serialization** — Anything returned from a cached function must be JSON-serializable. `Set`, `Map`, class instances do not survive the round-trip (caught us with `freshSectionIds` — now `string[]`). Stick to primitives, arrays, and plain objects.

We deliberately chose `unstable_cache` over `"use cache"` + `cacheComponents`, accepting deprecation risk in exchange for not having to render the gym list through a Suspense boundary. See [ADR-0001](docs/adr/0001-cache-architecture.md) for the full rationale and revisit triggers.

## Home-page categories

`rankGyms(gyms, visits)` partitions Gyms into three categories the UI renders separately:

**Hero** — the top ScoredGym. The card that auto-expands. Picks the highest Novelty score with reset data; falls back to a no-data Gym only if no Gym has reset data at all.

**Runners-up** — every other Gym with reset data, sorted by Novelty score (tiebreak: most recent fresh reset date descending).

**No-data extras** — Gyms with no resets in the cutoff window. Rendered at the bottom under "no reset data yet" — we can't help the user pick between them.
