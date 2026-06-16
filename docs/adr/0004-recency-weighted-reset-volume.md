# ADR-0004 — Recency-weighted reset volume: one score, two lenses

Status: Accepted (2026-06-16). Supersedes [ADR-0003](0003-turnover-times-recency-scoring.md).

## Context

ADR-0003 (`noveltyScore = turnover × recency`) was clean to state but failed the
two audiences it served, for opposite reasons:

- **Anon users saw a flat wall of one tier.** `turnover = min(unseen / 3, 1)`
  needs three unseen resets to max out, but gyms reset ~one sector per week, so a
  freshly-reset gym rarely had three resets inside the window and could never
  score high. First-time visitors — the people the anon page exists to wow — saw
  every gym in the same dull band until they started logging visits. ADR-0003
  even tried to fix this by dropping saturation to 3 and re-spacing the cuts; it
  helped but never produced real spread, because a single recent reset still
  topped out at `0.33 × recency`.
- **The returning model conflated two questions** into one multiplicative term:
  "how much is new since I came?" (a count) and "is it still fresh or already
  stripped?" (recency). Squashed together they were hard to reason about and to
  tune.

The data constraints are unchanged from ADR-0003: resets are **date-only**;
some gyms have **named sectors**, some have a **single catch-all section**, so we
**cannot tell whether a later reset invalidates an earlier one** — therefore a
reset row is a reset row, counted raw. Boulder counts are usually unknown and
must stay display-only.

We re-grilled the product owner through concrete scenarios (pinned as tests).
The decisions that fell out:

- **Count raw reset rows.** A sector-tracking gym that resets three walls one day
  counts three; a whole-gym gym counts one. Accepted asymmetry — a sector gym
  genuinely surfaces more granular freshness.
- **Recency can outweigh raw count.** A single fresh reset should outrank two
  month-old ones, because at ~one sector/week the old walls are probably already
  stripped.
- **Anon ranking weighs recent volume**, not just the single newest date: a
  six-reset week outranks a lone reset today.
- **Anon badges cool honestly** in a city-wide quiet spell; the "wow" comes from
  gyms sitting at different points in their weekly cycle, not from faking tiers.

## Decision

> **`noveltyScore = Σ over relevant resets of  0.5 ^ (ageDays / HALF_LIFE_DAYS)`**

```ts
// src/lib/freshness/scoring.ts
relevant resets =
  returning (a visit is logged): resets with reset_on AFTER your last visit
  anon (no visit logged):        resets within the last ANON_WINDOW_DAYS

// each reset contributes a recency-weighted unit of "new climbing":
//   today → 1.0, a half-life old → 0.5, older → fades toward 0
// the sum is UNBOUNDED (not 0..1) — never displayed, only mapped to a tier
```

The sum captures **both** asks in one term: more resets ⇒ bigger sum (volume),
older resets ⇒ smaller contribution (cooling). No separate decay factor, no
saturation cap.

### Two lenses

The same number answers two different questions, so it gets two different cut
sets (`src/lib/freshness/tier-binding.ts`, `bindTier(result, isAnon)`):

| Lens | Relevant resets | Question | Cuts (HOT / FRESH / WORTH) |
|------|-----------------|----------|-----------------------------|
| **Anon** | last `ANON_WINDOW_DAYS` | "Is this gym fresh *right now*?" | **2.2 / 1.4 / 0.7** |
| **Returning** | after your last visit | "Enough *new-to-me* to bother?" | **3.0 / 2.0 / 1.3** |

`SLIM` is any score `> 0`; `STALE` is exactly `0` (a gym with reset data but
nothing relevant); `UNKNOWN` is no reset data at all.

- **Anon cuts sit low** so gyms — caught at different points in their weekly
  cycle, with accumulated sums around 1.6–2.6 — land on *different* tiers. That
  spread is the first-open variance the anon page exists for. A gym reset today
  reads fresh immediately instead of waiting for three resets to pile up.
- **Returning cuts sit high** to encode the owner's rule: one unseen reset
  (weight ≤ 1.0) is `SLIM` ("not a special trip"); two recent unseen (~1.6)
  cross to `WORTH`; three-plus climb to `FRESH`/`HOT`. Zero unseen scores 0 →
  `STALE` ("you're caught up") with no special-case override.

### Mixed lenses in one list

The lens is chosen **per gym** from that gym's own visit date, so a single list
can mix lenses: a gym you climbed yesterday is scored on the returning lens
(only post-visit resets count, usually a small sum), while a gym you've never
logged is scored on the anon lens (its whole recent history counts). Ranking is
by **raw `noveltyScore` desc**, tiebreak `mostRecentFreshISO` desc. So a
never-visited gym tends to outrank a just-climbed one — intended: there is
genuinely more that's new *to you* at the gym you haven't seen. (This preserves
the documented behavior that a busy just-visited gym can rank below an
abandoned-but-fresh one.)

### Constants and why these numbers

| Constant | Value | Rationale |
|---|---|---|
| `HALF_LIFE_DAYS` | 10 | Freshness halves every ~1.5 weeks. Between the owner's "1 to 2 week" instinct; the single knob driving both anon cooling and the returning staleness backstop. Tune by feel. |
| `ANON_WINDOW_DAYS` | 28 | Anon relevance window. Beyond ~28 days the half-life weight is already negligible (`0.5^2.8 ≈ 0.14`), so this mostly keeps the *display* fields honest — a sector last touched months ago shouldn't render as "fresh" — and preserves the invariant that `recentResets` shows exactly what the badge counts. |
| `ANON_HOT/FRESH/WORTH_SCORE` | 2.2 / 1.4 / 0.7 | Calibrated to the ~1.6–2.6 steady state of a weekly gym so the anon page spreads across tiers. **The lever for first-open variance** — tune these first if anon HOT goes always-empty or always-full. |
| `RETURNING_HOT/FRESH/WORTH_SCORE` | 3.0 / 2.0 / 1.3 | `WORTH` between one unseen reset (≤1.0) and two recent (~1.6) → the 1-vs-2 rule; `HOT` needs ~4 recent unseen resets ("practically a new gym"). |

### Worked examples (validation — pinned in `src/lib/freshness.test.ts`)

Single-reset contribution by age: today 1.00 · 3d 0.81 · 5d 0.71 · 7d 0.62 ·
10d 0.50 · 14d 0.38 · 21d 0.23 · 28d 0.14.

Anon — weekly gyms at different cycle phases spread across the ladder:

| Gym (resets) | Sum | Tier |
|---|---|---|
| 0/7/14/21 d | 2.23 | 🔥 hot |
| 5/12/19/26 d | 1.58 | 👀 fresh |
| 12/19/26 d | 0.87 | 💪 worth |
| single, 21 d | 0.23 | 🥱 slim |
| nothing < 28 d | 0 | 💤 stale |

Anon — recent volume beats a lone fresh reset: a 6-reset week (days 1–6, ≈4.74)
outranks one reset today (1.00).

Returning — the 1-vs-2 rule and the blend:

| You visited | Unseen resets | Sum | Tier |
|---|---|---|---|
| 2 d ago | 1 today | 1.00 | 🥱 slim |
| 7 d ago | 2 recent (2d, 4d) | 1.63 | 💪 worth |
| 35 d ago | 1 fresh (2d) | 0.87 | 🥱 slim — but beats… |
| 35 d ago | 2 old (25d, 28d) | 0.32 | 🥱 slim — …this |

## Consequences

**What we gain**

- One formula explains both audiences; the difference is two cut sets, not two
  algorithms. Volume and recency live in one term that's easy to reason about.
- The anon page finally has tier variance, driven by real reset history rather
  than a fabricated visit gap.
- The returning "1 vs 2 resets" intuition and the "old resets go stale" backstop
  are both expressible, and the blend (recency can beat raw count) falls out for
  free.

**What we accept**

- **The score is unbounded** (no longer 0..1). It's internal — only the tier is
  shown — but anything that assumed a 0..1 range would break. (No component reads
  it; verified by grep.)
- **Sector-tracking gyms score higher** than whole-gym gyms for the same real
  effort, because they log more rows. Deliberate (see "count raw rows").
- **Anon and returning scores aren't on the same absolute scale** (returning
  only counts post-visit resets), but mixed-list ordering by raw score is still
  the behavior we want — more new-to-you ranks higher.
- **Hard 28-day edge for anon**, as in ADR-0003: a gym last reset 27 vs 29 days
  ago flips from a tiny score to STALE. Harmless — both sit at the bottom.
- **Single-user / single-city calibration**, same caveat as prior ADRs.

### Display language: two voices (unchanged from ADR-0003)

The narrative still speaks two voices, chosen per gym by whether a visit is
logged — **returning** ("…since your visit", with exact counts/dates) vs **anon**
(describes the gym's activity, never "you"). The badge still carries no count,
just the tier emoji + title. The compact `recentResets` list still shows only
rows after the cutoff the scorer uses (your visit, or the anon window), so it
matches what the badge counts. See `src/lib/freshness/narrative.ts`.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `gymFreshness`, `recencyWeight`. Constants
  `HALF_LIFE_DAYS`, `ANON_WINDOW_DAYS` live here. The lens is the single
  `lastVisitedISO === null` branch picking the cutoff.
- `src/lib/freshness/tier-binding.ts` — `bindTier(result, isAnon)`, the two cut
  sets (all six exported).
- `src/lib/freshness/index.ts` — `scoreGym` passes `isAnon = lastVisited === null`;
  `rankGyms` sorts by `noveltyScore` desc, tiebreak `mostRecentFreshISO` desc.
- `FreshLabel`, `recentResets`, and the section orderings are display concerns,
  unchanged.

## Revisit when

- **You have multi-user data.** Derive `ANON_WINDOW_DAYS` and `HALF_LIFE_DAYS`
  from real inter-visit gaps and per-gym reset cadence instead of the
  weekly-rotator assumption.
- **A gym's cadence isn't weekly.** `HALF_LIFE_DAYS` and the anon cuts assume it;
  revalidate per city.
- **Anon HOT goes always-empty or always-full** — re-tune the anon cuts (or the
  half-life) before touching the window.
- **Sector-vs-whole-gym scoring asymmetry hurts** (a sector gym dominating purely
  by logging more rows) — reconsider collapsing same-day rows into one event.
- **Boulder volume turns out to matter** to users — reconsider letting it nudge
  the per-reset weight.
