# ADR-0002 — Visit-gap-dominant gym scoring model

Status: **Superseded by [ADR-0003](0003-turnover-times-recency-scoring.md) (2026-06-12).** Accepted (2026-05-20) · Amended (2026-06-11)

> This model (and its 2026-06-11 amendment) is kept for history. The live scoring model is
> ADR-0003 — `noveltyScore = turnover × recency`. The `looking fresh` / `FRESH` tier
> introduced in the amendment below survives; the scoring math described here does not.

> **Amendment (2026-06-11) — never-visited recency + the `looking fresh` tier.**
> The original model gave every never-visited gym a flat `visitFactor = 1.0`, so on the
> first-open page (no visits logged) every gym scored purely on `substance` (0.6–1.0) and
> all landed in the single `WORTH` band — visually flat. Two changes fix this without
> touching the visited-user model:
>
> 1. **A new tier, `looking fresh` (`FRESH`, amber).** Binds at `noveltyScore ≥ 0.85`,
>    sitting between `WORTH` (0.5) and `HOT` (1.8). It is the only above-`WORTH` tier
>    reachable without a visit gap, so a recent, substantial reset stands out on first open.
> 2. **Never-visited `visitFactor` is now recency-graded, not flat.** Because Bratislava
>    gyms reset ~weekly, the freshest reset is almost always 0–7 days old, so a flat factor
>    (or a multi-day plateau) leaves every gym tied. Instead it decays daily from the
>    `1.0` neutral anchor by `0.05/day` since the freshest reset, floored at `0.5`. This
>    is what orders the first-open page and lets a just-dropped big reset wear the amber
>    badge for a few days before settling to `WORTH`.
>
> The sections below are updated in place to reflect the amended model. The visited-user
> formula, constants (`VISIT_RAMP_DAYS`, `MAX_VISIT_FACTOR`, `HOT_SCORE`, the substance
> ladders), and the weekly-rotation validation are unchanged.

## Context

The home page ranks gyms by a numeric `noveltyScore` and labels each card with a `Tier` (HOT / FRESH / WORTH / SLIM / STALE / UNKNOWN). The score answers: _of the gyms I could go to right now, which is freshest for me?_

The previous model was:

```
noveltyScore = freshResetCount × min(daysSinceVisit / 7, 1)
Tiers:        HOT ≥ 2, WORTH ≥ 1, SLIM > 0, STALE = 0 / just-visited
```

This had two practical problems that surfaced once we had a full city's worth of resets logged:

1. **HOT was trivially easy to hit.** Any gym with 2 fresh reset rows since the user's last visit landed in HOT. With four gyms all logging weekly resets, three or four would simultaneously be HOT and the tier carried no signal.
2. **The visit factor capped at 1.0 after 7 days.** A user who hadn't visited a gym in 5 weeks was treated identically to one who visited 8 days ago. The app couldn't distinguish "this gym has been waiting for you for over a month" from "this gym is mildly overdue."

The product question is _"which gym should I climb at next, given how I rotate?"_ The old model couldn't answer that — it counted reset rows without weighting how starved the user was for each gym.

## Decision

`noveltyScore = visitFactor × substance`, where both factors are explicit, documented, and shaped to the product question.

```ts
// src/lib/freshness/scoring.ts
visitFactor =
  daysSinceVisit === null ? max(0.5, 1.0 - 0.05 × daysSinceFreshReset)  // never visited: recency-graded
  : daysSinceVisit <= 2   ? handled by STALE override
  :                         min(daysSinceVisit / 14, 2.5)

substance =
  no fresh resets                  → 0
  multi-sector (totalSections > 1) → 0.6 + 0.4 × (freshSections / totalSections)
  single-sector + countedBoulders ≥ 20 → 0.95
  single-sector + countedBoulders ≥ 10 → 0.85
  single-sector + countedBoulders ≥ 5  → 0.75
  single-sector + freshResetCount ≥ 3  → 0.90
  single-sector + freshResetCount ≥ 2  → 0.80
  single-sector, otherwise             → 0.70

Tiers (src/lib/freshness/tier-binding.ts):
  HOT   ≥ 1.8
  FRESH ≥ 0.85   // "looking fresh" — reachable without a visit gap
  WORTH ≥ 0.5
  SLIM  > 0
  STALE = 0 or daysSinceVisit ≤ JUST_VISITED_DAYS
```

### Constants and why these numbers

| Constant | Value | Rationale |
|---|---|---|
| `VISIT_RAMP_DAYS` | 14 | Bratislava users typically climb 1×/week. 14 days = 2 missed cycles ⇒ full weight. |
| `MAX_VISIT_FACTOR` | 2.5 | Caps at ~35 days so a long-abandoned gym doesn't drown out everything else forever. |
| `NEVER_VISITED_PEAK` | 1.0 | Neutral anchor for a gym reset today — same weight as a 14-day visit gap. Departs from the old "never-visited = max novelty" principle (see below). |
| `NEVER_VISITED_DECAY_PER_DAY` | 0.05 | Daily decay of the never-visited factor by reset age. Chosen against ~weekly cadence: a big drop (substance 0.95) holds the `FRESH` tier for ~2 days, then settles to `WORTH`; finer steepness was rejected as too punishing for a 5-day-old set (see "Decay steepness" below). |
| `NEVER_VISITED_FLOOR` | 0.5 | Floor reached at ~10 days. Keeps a stale never-visited gym from collapsing to `SLIM`/`STALE` purely on age while still sinking it below this-week's resets. |
| `JUST_VISITED_DAYS` | 2 | Unchanged from old model. If you climbed within 2 days, even fresh resets feel unread. |
| `HOT_SCORE` | 1.8 | Requires substantial visit gap (≥ 14d) **and** non-trivial substance (≥ 0.65). Unreachable without a visit gap (never-visited factor caps at 1.0). |
| `FRESH_SCORE` | 0.85 | "looking fresh." On first open this needs both a recent reset (factor near 1.0) **and** a substantial drop (substance ≥ ~0.85: 20+ boulders, 5-of-8 sectors, or 3+ rows). |
| `WORTH_SCORE` | 0.5 | Requires either ~1-week gap with decent substance, or shorter gap with high substance. |
| Multi-sector substance floor (0.6) / slope (0.4) | — | Compresses the range so coverage modulates rather than dominates the score. Tuned so 1/8 ≠ 8/8 but neither extreme breaks ranking. |
| Single-sector boulder tiers (5 / 10 / 20) | — | Honest steps for typical gym communication. Counted resets at this scale roughly map to "small / decent / big drop." |
| Single-sector row tiers (1 / 2 / 3+) | — | Uncounted rows ≈ reset events for single-sector gyms (they log one row per weekly drop). |

### Reset-recency is deliberately not in `substance`

`substance` does not look at how long ago each reset happened — only at coverage / counts. A 1/8 reset done today and a 1/8 reset done 4 weeks ago produce the same substance, as long as both are after the user's last visit. Recency only enters through `visitFactor` (the user's gap, not the reset's age).

This is deliberate: the product question is _"is this gym fresh for me?"_, not _"did the gym recently have activity?"_ A reset from three weeks ago is just as novel to me if I haven't been there in two months.

### Departure from "never-visited = maximally novel" (and the recency refinement)

The old model and the old `CONTEXT.md` treated never-visited as the maximum-novelty case. This model treats a never-visited gym reset _today_ as **neutral** (`visitFactor` peaks at `1.0`) — same weight as a 14-day gap — and then **decays that factor by the freshest reset's age**.

Rationale: max novelty comes from a long _explicit_ visit gap, and we have no such evidence for a never-visited gym — the user might have actively decided not to go there. Treating "unknown" as "maximally desirable" overstates our information, so never-visited stays capped at `1.0` (it can reach `FRESH` but never `HOT`).

But a flat `1.0` threw away the one signal we _do_ have for never-visited gyms: **how recently each was reset**. With every gym resetting ~weekly, the freshest reset is almost always 0–7 days old, so a flat factor — or the multi-day plateau we first considered — left every gym tied at `1.0 × substance` and the first-open page stayed flat. Grading the factor by reset age (`0.05/day`, floored at `0.5`) makes recency the differentiator: a gym reset yesterday outranks an equally-substantial gym reset last week, and a substantial just-dropped reset earns the amber `looking fresh` badge.

This keeps recency out of `substance` (per the section above — recency is irrelevant once we have a real visit gap), confining it to the one place it's the only signal available: the no-visit factor.

#### Decay steepness

`0.05/day` was chosen against the weekly cadence by walking the day-by-day behavior of two representative gyms (a 20+-boulder drop at substance 0.95, and a typical single uncounted weekly drop at 0.70):

| Reset age | factor | Big drop (0.95) → tier | Typical (0.70) → tier |
|---|---|---|---|
| today | 1.00 | 0.95 → **FRESH** | 0.70 → WORTH |
| 2 days | 0.90 | 0.86 → **FRESH** | 0.63 → WORTH |
| 3 days | 0.85 | 0.81 → WORTH | 0.60 → WORTH |
| 5 days | 0.75 | 0.71 → WORTH | 0.53 → WORTH |
| 7 days | 0.65 | 0.62 → WORTH | 0.46 → SLIM |
| ≥10 days | 0.50 (floor) | 0.48 → SLIM | 0.35 → SLIM |

A gentler `0.025/day` was rejected because a big drop would hold `FRESH` for ~4 days (so half the gyms could wear amber mid-week); a steeper `0.075/day` was rejected because a 4–5-day-old reset — still _this week's_ set — already read as nearly stale.

This recency model is the most opinionated part of the no-visit experience and the most likely revisit candidate (see below).

## Consequences

**What we gain**

- **HOT actually means HOT.** Requires both a substantial visit gap _and_ non-trivial substance. With four gyms in normal weekly rotation, typically 0–1 are HOT at a time.
- **Visit gap drives ranking past 7 days.** Gyms the user has been avoiding bubble up over weeks; the cap at 35d prevents one abandoned gym from dominating forever.
- **Single-sector and multi-sector gyms are scored on signals appropriate to their communication pattern.** Spot's "35 new boulders" and Block Dock's "3 of 8 sectors" each contribute via the metric that gym actually publishes.

**What we accept**

- **A lot more magic numbers.** The old model had ~3 constants; the new model has ~12. Tuning any one in isolation is unsafe — they were chosen together against one user's real visit history (see "Validation" below).
- **No measurement infrastructure.** We do not currently log tier distribution, hero stability over time, or how often the recommended gym matches user behavior. Tuning will be by-feel until that exists.
- **Single-user calibration.** The model was tuned against one Bratislava user's actual visit log. Generalization to other users / cadences / cities is plausible but unvalidated.
- **First-time-user UX** (as amended 2026-06-11). With no visits logged, the home page no longer shows everything as HOT (old model) nor everything as a single flat WORTH band (the 2026-05-20 model). Instead it differentiates by reset recency and substance: the freshest, most substantial drops wear the amber `looking fresh` badge, the rest are `worth a climb`, and weeks-old resets sink to `slim`. The product framing ("rotate based on your history") still sharpens once visits accumulate, but the cold-start page now ranks meaningfully on its own.
- **The single substance ladder for single-sector gyms is non-smooth.** A boulder count of 19 vs 20 produces a 12% substance jump (0.85 → 0.95). Tier flips are possible across small data changes. Acceptable for v1; replace with a smooth curve if it ever causes user-visible weirdness.

**Behavioral examples (validation)**

Tested against one user's actual visit history on 2026-05-20:

| Gym | Visit gap | Substance basis | Score | Tier |
|---|---|---|---|---|
| Rača | 39d (capped at 2.5) | 3/8 sectors fresh → 0.75 | 1.88 | **HOT** |
| Spot | 24d → 1.71 | 35 counted boulders → 0.95 | 1.63 | **FRESH** (was WORTH pre-amendment) |
| Petržalka | 12d → 0.86 | 2/8 sectors fresh → 0.70 | 0.60 | WORTH |
| Vertigo | 3d → 0.21 | 1/2 sectors fresh → 0.80 | 0.17 | SLIM |

Pinned by the "weekly rotation" test in `src/lib/freshness.test.ts`.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `gymFreshness`, `computeVisitFactor`, `computeNeverVisitedFactor` (the recency decay), `computeSubstance`. All constants live here.
- `src/lib/freshness/tier-binding.ts` — `bindTier`. The STALE override (≤ 2 days) lives here, separate from the score formula.
- `src/lib/freshness/index.ts` — `scoreGym` + `rankGyms`. Sort key is `noveltyScore` desc; tiebreak is `mostRecentFreshISO` desc (unchanged).
- `src/lib/freshness.test.ts` — property-ish tests per gym shape + a "weekly rotation" snapshot test pinning the validation scenario above.

## Revisit when

- **You have multi-user data.** Constants tuned for one weekly-rotator will feel wrong for 2×/week climbers and 1×/month climbers. At that point: log tier distributions in production, and consider deriving `VISIT_RAMP_DAYS` from each user's own median inter-visit gap.
- **You add a new city.** Different climbing cultures have different reset cadences; revalidate the 14-day ramp.
- **The never-visited recency model starts feeling wrong.** Levers, in order of bluntness: re-tune `NEVER_VISITED_DECAY_PER_DAY` / `NEVER_VISITED_FLOOR` (see the day-by-day table above); raise `NEVER_VISITED_PEAK` toward `MAX_VISIT_FACTOR` (2.5) to let never-visited gyms reach `HOT` again (restores the old "maximally novel" principle); or move `FRESH_SCORE` if the amber tier ends up always-empty or always-full on the first-open page.
- **A gym adopts a different `freshness_mode`.** If you add gyms that mix boulder-count and sector-coverage modes per reset, the substance branching gets more complex; consider unifying around a single normalized signal.
- **The HOT tier becomes either always-empty or always-full.** Re-tune `HOT_SCORE` or the substance ceilings; don't re-tune the visit ramp first (it's the most principled part of the model).
- **You build measurement.** Once you can see tier distribution and recommendation-acceptance over time, replace the snapshot test with a properties test suite and tune constants against real data instead of intuition.
