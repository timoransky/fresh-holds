# ADR-0001: Reject threading an explicit `now` parameter through the Freshness module

Date: 2026-05-15
Status: Accepted

## Context

The Freshness module (`src/lib/freshness/`) reads "the current moment" implicitly via `Date.now()` inside helpers like `daysSince` (`src/lib/date.ts:21`) and `relativeDay` (`src/lib/date.ts:26`). This means `gymFreshness` / `scoreGym` / `rankGyms` look pure-by-signature but are not pure-by-behaviour — calling them at different wall-clock times can yield slightly different results for the same inputs.

A natural architectural suggestion is to thread an explicit `now: Date | number` parameter through the public API so the module becomes a pure function of its arguments. This would also make tests trivial (no `Date.now()` monkey-patching).

## Decision

Do not thread `now` through the Freshness API. Keep `Date.now()` reads inside `daysSince` / `relativeDay`, and document the trade-off in CONTEXT.md.

## Rationale

The data cadence is coarse:

- ≤1 reset logged per Gym per day (resets are logged manually in the Supabase dashboard, typically once per day per gym at most).
- ≤1 visit logged per user per day (users typically log one visit per climbing session).

The only observable artefact of the missing `now` parameter is a midnight-boundary off-by-one in `daysSince`, which affects:

1. The `visitFactor` in `noveltyScore` (`src/lib/freshness/scoring.ts:59`) — a single-day shift moves `daysSinceVisit / WEEKLY_VISIT_DAYS` by 1/7, well below the score gaps that determine ordering at this cadence.
2. The `relativeDay` narrative string in `GymCard` — "1 day ago" vs "today" briefly at midnight.

Both are invisible in practice given the cadence. Adding a `now` param costs:

- An extra argument on every public function in the Freshness module.
- Threading the value through call sites (page, hook, server actions, route handlers).
- Tests now have a new axis (vary `now`) that has no real-world significance.

The cost is paid on every call; the benefit accrues to a class of bugs that the data cadence makes effectively unreachable. Net: not worth it.

## Consequences

- `daysSince` and `relativeDay` continue to call `Date.now()` directly.
- SSR/client renders that straddle midnight can theoretically disagree on `daysSince` by 1. Acceptable.
- Test fixtures for the Freshness module continue to either mock `Date.now()` globally (when the cadence concern is being tested) or accept the live clock (when it isn't).

## Revisit triggers

Reopen this decision if any of these become true:

- Resets are logged sub-daily (e.g. an automated feed appears).
- Visits are tracked at hour-level granularity (e.g. timestamped sessions).
- A test failure is traced to clock drift, not a logic bug.

## See also

- `CONTEXT.md` — "Now" definition records the trade-off in the domain glossary.
- Issue #35 — previous discussion of `now`-threading (rejected for the same reason).
