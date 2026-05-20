# ADR-0002 — Visit-gap-dominant gym scoring model

Status: Accepted (2026-05-20)

## Context

The home page ranks gyms by a numeric `noveltyScore` and labels each card with a `Tier` (HOT / WORTH / SLIM / STALE / UNKNOWN). The score answers: _of the gyms I could go to right now, which is freshest for me?_

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
  daysSinceVisit === null ? 1.0                          // never visited = neutral
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
  WORTH ≥ 0.5
  SLIM  > 0
  STALE = 0 or daysSinceVisit ≤ JUST_VISITED_DAYS
```

### Constants and why these numbers

| Constant | Value | Rationale |
|---|---|---|
| `VISIT_RAMP_DAYS` | 14 | Bratislava users typically climb 1×/week. 14 days = 2 missed cycles ⇒ full weight. |
| `MAX_VISIT_FACTOR` | 2.5 | Caps at ~35 days so a long-abandoned gym doesn't drown out everything else forever. |
| `NEVER_VISITED_FACTOR` | 1.0 | Deliberate departure from the old "never-visited = max novelty" principle (see below). |
| `JUST_VISITED_DAYS` | 2 | Unchanged from old model. If you climbed within 2 days, even fresh resets feel unread. |
| `HOT_SCORE` | 1.8 | Requires substantial visit gap (≥ 14d) **and** non-trivial substance (≥ 0.65). |
| `WORTH_SCORE` | 0.5 | Requires either ~1-week gap with decent substance, or shorter gap with high substance. |
| Multi-sector substance floor (0.6) / slope (0.4) | — | Compresses the range so coverage modulates rather than dominates the score. Tuned so 1/8 ≠ 8/8 but neither extreme breaks ranking. |
| Single-sector boulder tiers (5 / 10 / 20) | — | Honest steps for typical gym communication. Counted resets at this scale roughly map to "small / decent / big drop." |
| Single-sector row tiers (1 / 2 / 3+) | — | Uncounted rows ≈ reset events for single-sector gyms (they log one row per weekly drop). |

### Reset-recency is deliberately not in `substance`

`substance` does not look at how long ago each reset happened — only at coverage / counts. A 1/8 reset done today and a 1/8 reset done 4 weeks ago produce the same substance, as long as both are after the user's last visit. Recency only enters through `visitFactor` (the user's gap, not the reset's age).

This is deliberate: the product question is _"is this gym fresh for me?"_, not _"did the gym recently have activity?"_ A reset from three weeks ago is just as novel to me if I haven't been there in two months.

### Departure from "never-visited = maximally novel"

The old model and the old `CONTEXT.md` treated never-visited as the maximum-novelty case. The new model treats never-visited as **neutral** (`visitFactor = 1.0`) — same weight as a 14-day gap.

Rationale: under the new model, max novelty comes from a long _explicit_ visit gap. We have no evidence about a never-visited gym — the user might have actively decided not to go there. Treating "unknown" as "maximally desirable" overstates our information. A first-time user with no visits at all sees mostly WORTH/SLIM until they log a visit; that's honest about what we know, and the tiers re-balance immediately once visits accumulate.

This is the most opinionated single choice in the new model and the most likely revisit candidate (see below).

## Consequences

**What we gain**

- **HOT actually means HOT.** Requires both a substantial visit gap _and_ non-trivial substance. With four gyms in normal weekly rotation, typically 0–1 are HOT at a time.
- **Visit gap drives ranking past 7 days.** Gyms the user has been avoiding bubble up over weeks; the cap at 35d prevents one abandoned gym from dominating forever.
- **Single-sector and multi-sector gyms are scored on signals appropriate to their communication pattern.** Spot's "35 new boulders" and Block Dock's "3 of 8 sectors" each contribute via the metric that gym actually publishes.

**What we accept**

- **A lot more magic numbers.** The old model had ~3 constants; the new model has ~12. Tuning any one in isolation is unsafe — they were chosen together against one user's real visit history (see "Validation" below).
- **No measurement infrastructure.** We do not currently log tier distribution, hero stability over time, or how often the recommended gym matches user behavior. Tuning will be by-feel until that exists.
- **Single-user calibration.** The model was tuned against one Bratislava user's actual visit log. Generalization to other users / cadences / cities is plausible but unvalidated.
- **First-time-user UX is worse than under the old model.** With no visits logged, the home page no longer shows everything as HOT. The product framing ("rotate based on your history") degrades gracefully to "looks unfinished" for unauthenticated visitors who haven't tapped "log my visit" yet.
- **The single substance ladder for single-sector gyms is non-smooth.** A boulder count of 19 vs 20 produces a 12% substance jump (0.85 → 0.95). Tier flips are possible across small data changes. Acceptable for v1; replace with a smooth curve if it ever causes user-visible weirdness.

**Behavioral examples (validation)**

Tested against one user's actual visit history on 2026-05-20:

| Gym | Visit gap | Substance basis | Score | Tier |
|---|---|---|---|---|
| Rača | 39d (capped at 2.5) | 3/8 sectors fresh → 0.75 | 1.88 | **HOT** |
| Spot | 24d → 1.71 | 35 counted boulders → 0.95 | 1.63 | WORTH |
| Petržalka | 12d → 0.86 | 2/8 sectors fresh → 0.70 | 0.60 | WORTH |
| Vertigo | 3d → 0.21 | 1/2 sectors fresh → 0.80 | 0.17 | SLIM |

Pinned by the "weekly rotation" test in `src/lib/freshness.test.ts`.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `gymFreshness`, `computeVisitFactor`, `computeSubstance`. All constants live here.
- `src/lib/freshness/tier-binding.ts` — `bindTier`. The STALE override (≤ 2 days) lives here, separate from the score formula.
- `src/lib/freshness/index.ts` — `scoreGym` + `rankGyms`. Sort key is `noveltyScore` desc; tiebreak is `mostRecentFreshISO` desc (unchanged).
- `src/lib/freshness.test.ts` — property-ish tests per gym shape + a "weekly rotation" snapshot test pinning the validation scenario above.

## Revisit when

- **You have multi-user data.** Constants tuned for one weekly-rotator will feel wrong for 2×/week climbers and 1×/month climbers. At that point: log tier distributions in production, and consider deriving `VISIT_RAMP_DAYS` from each user's own median inter-visit gap.
- **You add a new city.** Different climbing cultures have different reset cadences; revalidate the 14-day ramp.
- **The "never visited = 1.0" choice starts feeling wrong.** Easy lever: set `NEVER_VISITED_FACTOR` to `MAX_VISIT_FACTOR` (2.5) to restore the old "maximally novel" principle. If first-time-user UX feedback consistently complains the page feels flat, do this.
- **A gym adopts a different `freshness_mode`.** If you add gyms that mix boulder-count and sector-coverage modes per reset, the substance branching gets more complex; consider unifying around a single normalized signal.
- **The HOT tier becomes either always-empty or always-full.** Re-tune `HOT_SCORE` or the substance ceilings; don't re-tune the visit ramp first (it's the most principled part of the model).
- **You build measurement.** Once you can see tier distribution and recommendation-acceptance over time, replace the snapshot test with a properties test suite and tune constants against real data instead of intuition.
