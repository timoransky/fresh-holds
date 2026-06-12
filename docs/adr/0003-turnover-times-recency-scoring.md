# ADR-0003 — Turnover × recency: a two-factor gym scoring model

Status: Accepted (2026-06-12). Supersedes [ADR-0002](0002-gym-scoring-model.md).

## Context

ADR-0002 answered the right question but grew hard to reason about: a visit-gap ramp
(`min(days/14, 2.5)`), a separate never-visited recency decay (`0.05/day`, floored), a
multi-sector coverage formula, a single-sector boulder-count ladder (5/10/20), a
single-sector row-count ladder (1/2/3+), a "just visited ≤ 2 days" STALE override, and
five tier cuts — roughly a dozen constants, none safe to tune in isolation.

Stepping back, the product question is simple and the owner named two deciding factors:

- **How long ago was the gym reset?**
- **How long ago did you visit?**

Plus three constraints from how the data actually looks:

- Resets are **~weekly per gym**.
- Some gyms have **named sectors (6–8)**; some have **no named sectors** — those are modeled
  as one section, and one reset means "part of the gym was reset." Either way, **a reset row
  is a reset row.**
- **Boulder counts are usually unknown.** When present they're useful _information for the
  user_, but they must not drive the ranking — most gyms don't report them, so scoring on
  them would rank on data-availability rather than freshness.
- It must work the same for **anonymous** and **returning** visitors.

## Decision

> **`noveltyScore = turnover × recency`**, both in `0..1`.

```ts
// src/lib/freshness/scoring.ts
unseenResets = resets with reset_on AFTER your last visit
             (anon users: as if they last visited ANON_VISIT_GAP_DAYS ago)

turnover = min(unseenResets / SATURATION_RESETS, 1)
recency  = 0.5 ^ (daysSinceNewestUnseenReset / RECENCY_HALF_LIFE_DAYS)

// src/lib/freshness/tier-binding.ts — fixed cuts of the 0..1 score
HOT   ≥ 0.85
FRESH ≥ 0.55   // "looking fresh"
WORTH ≥ 0.25
SLIM  > 0
STALE = 0
UNKNOWN = no reset data at all
```

- **turnover** carries the visit-gap factor for free: each reset row is one chunk of
  climbing that's new to you, and the longer you stay away, the more chunks accumulate. A
  named-sector drop and a "part of the gym" drop each count as one row. Boulder counts are
  ignored.
- **recency** is a one-week half-life decay on the _newest unseen reset_, matching the
  weekly cadence: reset today = 1.0, a week old = 0.5, two weeks = 0.25.
- **Anon = "visited 28 days ago."** The only difference between the anon and returning paths
  is the substituted visit date. A once-a-month baseline means weekly gyms saturate turnover
  for anon users, so the anon page is effectively ordered by recency — exactly "which gym
  dropped most recently."

### Constants and why these numbers

| Constant | Value | Rationale |
|---|---|---|
| `ANON_VISIT_GAP_DAYS` | 28 | Anon baseline = "once-a-month climber." Long enough that weekly gyms saturate turnover (so anon ranks on recency), short enough that a gym which stopped resetting falls out of the window and reads as stale. |
| `SATURATION_RESETS` | 4 | ~4 weekly chunks ≈ the gym is effectively all-new to you. This single number does the job the whole ADR-0002 substance system did. |
| `RECENCY_HALF_LIFE_DAYS` | 7 | Freshness halves each week, matching the reset cadence. |
| `HOT_SCORE` | 0.85 | Recent drop **and** near-saturated turnover (you've missed ~a month and one just landed). |
| `FRESH_SCORE` | 0.55 | Real accumulation + a recent drop. |
| `WORTH_SCORE` | 0.25 | Something new, but thin or aging. |

### What this removes (vs ADR-0002)

- The multi-sector coverage formula and both single-sector ladders (boulder 5/10/20, row 1/2/3+).
- Boulder counts in scoring (now display-only).
- The visit-gap ramp, the 2.5 cap, and the never-visited recency decay.
- The "just visited ≤ 2 days → STALE" override — unnecessary: a visit with nothing new since
  leaves zero unseen resets, which scores 0 → STALE on its own. And if a reset _did_ land
  after your visit, that's honestly a little fresh.

~12 constants → **6** (three model, three tier cuts).

## Consequences

**What we gain**

- One sentence explains the model. Each constant is independently meaningful and tunable.
- Anon and returning users share one code path.
- Reset recency and visit gap are both first-class and neither can dominate: a gym you've
  long avoided still sinks if it stopped resetting (recency → 0), and a gym that just reset
  still ranks low if you were there yesterday (turnover → 0).

**What we accept**

- **Anon users can now reach HOT** (a weekly gym that dropped within ~a day). This reverses
  ADR-0002's "never-visited can't be HOT" stance. We think it's honest — it's backed by a
  month of logged resets, not a fabricated visit gap.
- **Boulder volume is invisible to ranking.** A 35-boulder announcement scores like any
  single reset row. Per the constraint above; the count still shows on the card.
- **Turnover saturates.** Avoiding a gym for 4 weeks vs 8 weeks looks identical (both fully
  turned over); past saturation, recency breaks the tie. Acceptable — once it's all new to
  you, "how new" stops mattering.
- **Hard 28-day edge for anon.** A gym last reset 27 vs 29 days ago flips from a tiny score
  to STALE. Harmless: both sit at the bottom of the ranking.
- **Single-user / single-city calibration**, same caveat as ADR-0002.

**Behavioral examples (validation)**

Anon (no visits), weekly gyms saturate turnover → ordered by recency:

| Newest reset | turnover | recency | Score | Tier |
|---|---|---|---|---|
| today | 1.0 | 1.00 | 1.00 | 🔥 hot |
| 5 days | 1.0 | 0.61 | 0.61 | 👀 fresh |
| 10 days | 1.0 | 0.37 | 0.37 | 💪 worth |
| 20 days | 1.0 | 0.14 | 0.14 | 🥱 slim |
| > 28 days | 0 | — | 0 | 💤 stale |

Returning visitor, a weekly gym that dropped yesterday (recency ≈ 0.91):

| You visited | Unseen | turnover | Score | Tier |
|---|---|---|---|---|
| 1 week ago | 1 | 0.25 | 0.23 | 🥱 slim |
| 2 weeks ago | 2 | 0.50 | 0.45 | 💪 worth |
| 3 weeks ago | 3 | 0.75 | 0.68 | 👀 fresh |
| 4+ weeks ago | 4+ | 1.00 | 0.91 | 🔥 hot |

Pinned by the "weekly rotation" and per-path tests in `src/lib/freshness.test.ts`.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `gymFreshness`, `computeRecency`. All constants live here.
  The anon visit-date substitution is the single `lastVisitedISO === null` branch.
- `src/lib/freshness/tier-binding.ts` — `bindTier`, the five fixed score cuts.
- `src/lib/freshness/index.ts` — `scoreGym` + `rankGyms`. Sort key `noveltyScore` desc;
  tiebreak `mostRecentFreshISO` desc (unchanged).
- The `FreshLabel` (sector/boulder counts) and `narrative`/`badge` strings are unchanged —
  they're display concerns and still surface boulder counts where known.

## Revisit when

- **You have multi-user data.** Derive `ANON_VISIT_GAP_DAYS` / `SATURATION_RESETS` from real
  inter-visit gaps and per-gym reset cadence instead of the weekly-rotator assumption.
- **A gym's cadence isn't weekly.** `RECENCY_HALF_LIFE_DAYS` and the anon window assume it;
  revalidate per city.
- **HOT becomes always-empty or always-full** on the anon page — re-tune `HOT_SCORE` or the
  half-life before touching the window.
- **Boulder volume turns out to matter** to users (e.g. most gyms start reporting counts) —
  reconsider letting it nudge `turnover`.
