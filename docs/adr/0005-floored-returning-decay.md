# ADR-0005 — Floored returning decay: count outweighs age on the returning lens

Status: Accepted (2026-07-21). Revises the **returning lens only** of
[ADR-0004](0004-recency-weighted-reset-volume.md); the anon lens (formula, cuts,
and rationale) is unchanged and ADR-0004 still governs it.

## Context

ADR-0004 scored both lenses with the same per-reset weight,
`0.5 ^ (ageDays / HALF_LIFE_DAYS)`, decaying all the way to 0. That is right for
anon ("is this gym fresh *right now*?") but wrong for returning, where the
question is really a **count**: "how much is new to *me* since I came?"

A reset you haven't seen is new to you whether it landed yesterday or three weeks
ago — the wall is still up. But pure decay erases that count as the resets age:

> **The failure.** A gym you last visited ~8 weeks ago that has reset one sector a
> week since — six unseen resets, newest 14 days old — summed to
> `Σ 0.5^(age/10)` over 14/21/…/49 d ≈ **0.93 → SLIM**. Six sectors are new to
> you and the badge said "slim pickings". The owner flagged this directly.

We re-grilled the owner through concrete scenarios (two Q&A rounds, pinned as
tests). The decisions:

1. **Returning lens only.** Anon keeps decay-to-zero and its cuts — "fresh right
   now" genuinely should discount an old reset.
2. **Mild staleness pull.** Many unseen-but-old resets should read about **one
   tier below** the same count when fresh — age still modulates, it just no
   longer erases count.
3. **Keep the blend rule** from ADR-0004: one *fresh* reset still outranks two
   *month-old* ones (recency wins the ranking within a tier).
4. **Shift the ladder up one step** (this revises ADR-0004's pinned owner rule):
   1 fresh unseen = **WORTH**, 2 recent = **FRESH**, 3+ recent = **HOT**. Gyms
   reset ~once a week, so "weeks-of-turnover-away" ≈ tier.
5. A **lone** unseen reset should still cool WORTH → SLIM after **~2 weeks** (a
   single old reset isn't a special trip).

Data constraints are unchanged from ADR-0004: resets are date-only, sectors may
be named or catch-all, so a reset row is counted raw; boulder counts stay
display-only.

## Decision

Give the **returning** per-reset weight a floor, so an unseen reset never counts
for less than `RETURNING_WEIGHT_FLOOR` however old:

> **`returningWeight(age) = FLOOR + (1 − FLOOR) × 0.5 ^ (age / HALF_LIFE_DAYS)`**
> **`RETURNING_WEIGHT_FLOOR = 0.25`**

```ts
// src/lib/freshness/scoring.ts
weightFloor = lastVisitedISO === null ? 0 : RETURNING_WEIGHT_FLOOR;
recencyWeight(age, floor) = floor + (1 - floor) * 0.5 ^ (age / HALF_LIFE_DAYS);
```

Anon is the same formula with `floor = 0` — it reduces exactly to ADR-0004's
`0.5 ^ (age/10)`. Both formulas hit exactly 1.0 at age 0. The floor makes count
dominate: each unseen reset contributes at least 0.25, so many old-but-unseen
resets sum higher than a couple of recent ones.

New **returning cuts (`tier-binding.ts`): HOT 2.0 / FRESH 1.45 / WORTH 0.53**
(anon cuts 2.0/1.75/0.9 untouched). `SLIM` > 0, `STALE` = 0 (reset data but
nothing unseen), `UNKNOWN` = no reset data at all.

### Why these numbers (all verified numerically)

- **WORTH 0.53.** A lone unseen reset crosses at `fw(14) = 0.534`, so the
  "~2 weeks" cooling boundary (decision 5) lands at ~14.2 days. This is why
  `FLOOR = 0.25`, not 0.3: at 0.3 the two-ancient-resets asymptote (`2 × 0.3 =
  0.6`) could never cool below WORTH, breaking the blend.
- **FRESH 1.45.** Two recent unseen (~4 d each, ≈1.65; 2 d/4 d = 1.72) are FRESH;
  a single reset maxes at 1.0 so can never reach it; the many-but-old "dead gym"
  case lands here (the mild pull of decision 2).
- **HOT 2.0.** Three weekly unseen with the newest ≤ 2 d (2.05–2.25) are HOT,
  cooling to FRESH mid-cycle; two recent max out at 1.95 (0 d + 1 d) so a
  two-section burst can't fake HOT. `FLOOR = 0.2` was rejected: it dropped the
  owner's six-reset case to 1.946, colliding with the two-freshest-possible
  score.

### Calibration table (fw = 0.25 + 0.75·0.5^(age/10); cuts 2.0/1.45/0.53)

| Scenario | Ages (d) | Sum | Tier |
|---|---|---|---|
| 1 unseen today | 0 | 1.000 | WORTH (owner rule 4) |
| 1 unseen 2 weeks | 14 | 0.534 | WORTH→SLIM boundary (rule 5) |
| 1 unseen ancient | 90 | 0.252 | SLIM (never STALE while unseen) |
| 2 recent | 2, 4 | 1.721 | FRESH (rule 4) |
| 2 freshest possible | 0, 1 | 1.950 | FRESH, not HOT (count gate) |
| 2 month-old vs 1 fresh (2 d) | 25, 28 vs 2 | 0.740 < 0.903 | blend holds; both WORTH |
| 2 ancient | 90, 97 | ~0.502 | SLIM |
| 3 weekly, newest 2 d | 2/9/16 | 2.052 | HOT (rule 4) |
| **Owner's complaint: 6, newest 14 d** | 14/21/…/49 | **2.199** | **HOT** (was 0.93 SLIM) |
| **Dead gym: 6, newest 60 d** | 60/67/…/95 | **1.527** | **FRESH** — one tier below (rule 2) |
| Weekly rotation (raca): 5 unseen, newest 1 d | 1/8/15/22/29 | 2.909 | HOT (existing pin holds) |

### Mixed lenses in one list

Ranking is unchanged: raw `noveltyScore` desc, tiebreak `mostRecentFreshISO`
desc, lenses mixed freely (ADR-0004). The floor inflates returning scores
relative to anon — a stronger form of ADR-0004's accepted "more new-to-you ranks
higher". A never-visited gym is still scored anon (decay to 0), a visited one
returning (floored), and they compare by raw score.

## Consequences

**What we gain**

- The returning badge finally reflects "how much is new to me", not "how fresh is
  the single newest reset". The owner's six-reset case reads HOT.
- The mild staleness pull is expressible (one tier down for old-but-many) without
  a second decay term — it falls out of the floor plus the shifted cuts.
- The blend rule and the ~2-week lone-reset cooling both still hold.

**What we accept**

- **Count dominance is unbounded for ancient resets.** Six ancient unseen resets
  sum to ≈1.5 (FRESH) forever, and 8+ reach HOT, even if every wall is months
  old. Intended (an unseen wall is unseen), but listed as a revisit-when trigger.
- **A two-section burst on the same day = 2.0 → HOT** (0 d + 0 d). Rare, and a
  gym resetting two sectors today is genuinely hot; acceptable edge.
- **Cross-lens score inflation** (returning > anon for the same reset history) is
  now larger than under ADR-0004. Ordering by raw score is still the intended
  behavior; the numbers are never shown.
- **Single-user / single-city calibration**, same caveat as prior ADRs.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `RETURNING_WEIGHT_FLOOR`, `recencyWeight(iso,
  floor)`, and the `weightFloor` branch in `gymFreshness` (0 anon, floor
  returning). `HALF_LIFE_DAYS`, `ANON_WINDOW_DAYS` unchanged.
- `src/lib/freshness/tier-binding.ts` — `RETURNING_{HOT,FRESH,WORTH}_SCORE` =
  2.0/1.45/0.53. `bindTier` and the anon cuts untouched.
- `src/lib/freshness.test.ts` — the shifted ladder flips several ADR-0004 pins
  (that's the point); new pins live in the "returning lens: count outweighs age"
  block.

## Revisit when

- **Ancient-count dominance hurts** — a gym reads FRESH/HOT purely on a pile of
  months-old unseen resets and users feel misled. Reconsider a soft cap on the
  count, or a floor that decays over a long horizon.
- **You have multi-user data.** Derive `RETURNING_WEIGHT_FLOOR` (and the cuts)
  from real inter-visit gaps and per-gym cadence instead of the weekly-rotator
  assumption.
- **A gym's cadence isn't weekly.** The ladder (weeks-away ≈ tier) assumes it.
- **The two-sections-today = HOT edge** turns out to fire often — add a
  distinct-day or count gate to HOT.
