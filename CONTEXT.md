# Fresh Holds — Domain glossary

Vocabulary the code and the UI should use consistently. Add terms here as they crystallize; don't pre-fill speculatively. Sharper definitions over time are expected.

## Core nouns

**Gym** — a bouldering gym in Bratislava. Rows in `gyms`. Active gyms (`is_active = true`) are the only ones surfaced. Has many **Sections** and an externally-facing `freshness_mode` of either `"sections"` or `"count"` that decides how its freshness is summarized.

**Section** — a labeled area of a Gym (a panel, wall, or zone). Rows in `sections`. Same word as **Sector** in user-facing strings — the UI displays "sector," the code says "section." Has many **Resets**, ordered by `display_order` for stable visual layout.

**Reset** — a logged event recording that new boulder problems were set on a Section on a given date. Rows in `resets`. Has `reset_on` (ISO date) and optional `boulders_reset` (count for "count"-mode gyms). Logged manually in the Supabase dashboard.

**Visit** — a user-recorded date the user climbed at a Gym. Stored in browser `localStorage` for anonymous users (`Record<gymSlug, isoDate[]>`) and on the server for signed-in users. The most recent visit per gym is what freshness compares against.

## Derived concepts

**Freshness** — for a given Gym and a given user, the resets that happened _strictly after_ the user's last Visit. A Section is fresh iff it has any Reset later than the visit. A never-visited Gym treats every reset as fresh by definition.

**Novelty score** — `freshResetCount * min(daysSinceVisit / WEEKLY_VISIT_DAYS, 1)`. Encodes "how new is this gym to this user, _right now_." Decays for users who visited recently; saturates after a week. The home-page sort key.

**Tier** — one of `hot` / `worth` / `slim` / `stale` / `unknown`, bound from the Novelty score (and a "just visited" floor). Each tier has user-facing copy ("sending hot", "worth a climb", etc.), an emoji, and a CSS token set. UI never speaks raw scores — it speaks Tiers.

**ScoredGym** — a Gym paired with everything derived for it at a specific user-and-time: Novelty score, Tier, label counts, narrative string, badge string, sorted sections, flat reset list. The output of `scoreGym(gym, lastVisited)`. The deep Freshness module's currency — components consume `ScoredGym` fields rather than re-deriving.

**Now** — the moment freshness is computed relative to. Read implicitly via `Date.now()` inside the Freshness module's date helpers; not threaded through the API. Trade-off: a render that straddles midnight, or an SSR/client pair that disagrees on the clock, can produce slightly different `daysSince` for the same input. Acceptable for this app because the data cadence is coarse — typically ≤1 reset logged per day per Gym and ≤1 visit logged per day per user — so a midnight-boundary off-by-one is invisible in practice. See ADR / issue #35 for the rejected alternative of threading an explicit `now` param.

## Home-page categories

`rankGyms(gyms, visits)` partitions Gyms into three categories the UI renders separately:

**Hero** — the top ScoredGym. The card that auto-expands. Picks the highest Novelty score with reset data; falls back to a no-data Gym only if no Gym has reset data at all.

**Runners-up** — every other Gym with reset data, sorted by Novelty score (tiebreak: most recent fresh reset date descending).

**No-data extras** — Gyms with no resets in the cutoff window. Rendered at the bottom under "no reset data yet" — we can't help the user pick between them.
