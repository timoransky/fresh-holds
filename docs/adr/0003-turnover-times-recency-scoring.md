# ADR-0003 — Turnover × recency: a two-factor gym scoring model

Status: Accepted (2026-06-12) · Amended (2026-06-12). Supersedes [ADR-0002](0002-gym-scoring-model.md).

> **Amendments (2026-06-12).** The model was tuned twice after the original cut, in place
> below; the full reasoning trail is in "How the model was arrived at".
>
> 1. **Returning-user rebalance.** The hard turnover cap (3 unseen = max) plus one shared
>    7-day half-life made reset _recency_ outweigh reset _count_ for returning users (4 and
>    3 unseen with the same newest date tied exactly; 3-resets-3-days-ago beat
>    5-resets-4-days-ago). Turnover became a capless soft curve and returning users got a
>    gentler 14-day half-life — for them the pile of unseen climbing is the point.
> 2. **Anon turnover flattened to 1.0.** The soft count-based turnover then leaked into
>    anon tiers: a weekly gym flapped between HOT and FRESH depending on whether the month
>    window clipped it to 3 or 4 rows (a day-old reset showed 👀 instead of 🔥). Anon score
>    is now pure recency — reset age alone sets the anon tier.

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

turnover = anon      → 1.0 (flat — anon tiers depend on reset age only)
           returning → unseenResets / (unseenResets + 0.5)
                       // 1→0.67, 2→0.80, 3→0.86, 4→0.89, 5→0.91…
recency  = 0.5 ^ (daysSinceNewestUnseenReset / halfLife)
           halfLife = 7 days (anon) / 14 days (returning)

// src/lib/freshness/tier-binding.ts — fixed cuts of the 0..1 score
HOT   ≥ 0.85
FRESH ≥ 0.70   // "looking fresh"
WORTH ≥ 0.50
SLIM  > 0
STALE = 0
UNKNOWN = no reset data at all
```

- **Anon score = pure recency.** A visitor with no history has one honest signal: how
  recently each gym dropped. Letting the logged-row count modulate anon turnover made a
  weekly gym flap between HOT and FRESH depending on where the month window clipped its
  rows (3 vs 4 rows), so anon turnover is flat 1.0 and the tier tracks reset age alone:
  reset **0–1 days → HOT**, **2–3 → FRESH**, **4–7 → WORTH**, **8+ → SLIM**. Same-day ties
  are broken by drops-this-month in the sort.
- **Returning turnover** carries the visit-gap factor for free: each reset row is one chunk
  of climbing that's new to you, and the longer you stay away, the more chunks accumulate.
  A named-sector drop and a "part of the gym" drop each count as one row. Boulder counts
  are ignored. The curve never caps — every extra unseen reset adds score (with diminishing
  returns), so a gym with more piled-up resets always outranks one with fewer when their
  newest drops are equally old.
- **recency** decays the _newest unseen reset's_ age. For anon users it halves weekly
  (matching the reset cadence). For returning users it halves **fortnightly**: everything
  after your visit is new to you regardless of its age, so the unseen count should dominate
  — one extra unseen reset (e.g. 3→4: +3.7%) roughly matches a day of reset age (−4.8%) at
  the top of the curve and dominates lower down — while a gym that stopped resetting still
  sinks.
- **Anon = "visited 28 days ago"** for selecting which resets count as unseen (the badge,
  narrative, and table all describe that month window).

### Constants and why these numbers

| Constant | Value | Rationale |
|---|---|---|
| `ANON_VISIT_GAP_DAYS` | 28 | Anon baseline = "once-a-month climber." Bounds which resets the anon view counts and describes, and a gym which stopped resetting falls out of it and reads as stale. |
| Anon turnover | 1.0 flat | Anon tiers must depend on reset age only — see the flapping bug above. |
| Returning turnover `n/(n+0.5)` | — | Soft, capless: each extra unseen reset always adds. Starts high (1 → 0.67: even a single fresh unseen drop is worth a climb) and reaches HOT range (with a day-old drop) at ~5 unseen. Replaced the hard `min(n/3, 1)` cap, which erased real differences (4 unseen tied with 3). |
| `RECENCY_HALF_LIFE_ANON_DAYS` | 7 | Freshness halves each week, matching the reset cadence. Slices the anon week into the tier bands. |
| `RECENCY_HALF_LIFE_RETURNING_DAYS` | 14 | Half-speed decay so the unseen count outweighs day-level recency for returning users, while months-stale piles still sink. |
| `HOT_SCORE` | 0.85 | Anon: reset within ~1 day. Returning: ~5+ unseen resets with a day-old drop ("practically a new gym"). |
| `FRESH_SCORE` | 0.70 | Anon: reset 2–3 days ago. Returning: ~2–4 unseen with a recent drop. |
| `WORTH_SCORE` | 0.50 | Anon: reset within the week. Returning: a single fresh unseen drop, or a small aging pile. |

### What this removes (vs ADR-0002)

- The multi-sector coverage formula and both single-sector ladders (boulder 5/10/20, row 1/2/3+).
- Boulder counts in scoring (now display-only).
- The visit-gap ramp, the 2.5 cap, and the never-visited recency decay.
- The "just visited ≤ 2 days → STALE" override — unnecessary: a visit with nothing new since
  leaves zero unseen resets, which scores 0 → STALE on its own. And if a reset _did_ land
  after your visit, that's honestly a little fresh.

~12 constants → **6** (three model — the anon window and two half-lives — plus three tier cuts).

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
- **Turnover has diminishing returns.** Avoiding a gym for 8 weeks vs 3 weeks still scores
  higher, but only slightly (0.94 vs 0.86) — past a month away the page mostly tells you
  "it's all new", not "how much more new". Acceptable: once nearly everything is unseen,
  precision stops mattering.
- **Anon volume is tier-invisible.** A gym that logged one reset (yesterday) and one that
  logged five (newest yesterday) are both HOT for anon users; volume only breaks the
  same-day sort tie. Deliberate: reset age is the only anon signal that doesn't punish
  sparse logging, and with the ~weekly cadence assumption real gyms rarely differ much.
- **Two recency half-lives and two turnover shapes.** The anon/returning split now covers
  the half-life and the turnover, not just the substituted visit date. Clearly motivated
  (recency IS the anon signal; count IS the returning signal) but it's three forks on one
  axis — if a third audience ever appears, restructure instead of forking again.
- **Hard 28-day edge for anon.** A gym last reset 27 vs 29 days ago flips from a tiny score
  to STALE. Harmless: both sit at the bottom of the ranking.
- **Single-user / single-city calibration**, same caveat as ADR-0002.

### How the model was arrived at (three iterations)

**Iteration 1 → 2 (anon flatness).** The first cut used `min(n/4, 1)` turnover and cuts
`0.85 / 0.55 / 0.25`. On the real anon page every gym came out 👀 _looking fresh_: reset
count fought recency (a gym reset _yesterday_ with 3 rows scored below one reset 4 days ago
with 4 rows), and the FRESH band swallowed the whole week of recency. Fixed by saturating
at 3 and re-spacing the cuts so reset age mapped onto the tier ladder.

**Iteration 2 → 3 (returning count-blindness).** The hard cap then erased real differences
for returning users: 4 unseen and 3 unseen resets with the same newest date tied _exactly_
(arbitrary order on the page), and 3-resets-3-days-ago outranked 5-resets-4-days-ago — a
single day of reset age beat two extra resets' worth of new climbing. For a returning user
the pile of unseen climbing is the point. Fixed by removing the cap and halving the
returning recency decay (14-day half-life).

**Iteration 3 → 4 (anon count leakage — the same bug as iteration 1, smaller).** With a
count-based soft turnover applied to anon too, whether an anon gym could reach HOT depended
on its logged-row count: a weekly gym clips to 3 or 4 rows in the month window, so a
day-old reset flapped between 🔥 (4 rows) and 👀 (3 rows). Recency is the anon signal —
count has no business gating anon tiers. Fixed by flattening anon turnover to 1.0 (anon
score = pure recency), restoring cuts to `0.85 / 0.70 / 0.50` (which then map reset age
directly), and softening the returning curve to `n/(n+0.5)` so returning scores span the
same cut ladder.

**Behavioral examples (validation)**

Anon (no visits) — score = recency alone, 7-day half-life:

| Newest reset | Score | Tier |
|---|---|---|
| today / 1 day | 1.00 / 0.91 | 🔥 hot |
| 2–3 days | 0.82 / 0.74 | 👀 fresh |
| 4–7 days | 0.67 → 0.50 | 💪 worth |
| 8–28 days | < 0.50 | 🥱 slim |
| > 28 days | 0 | 💤 stale |

Returning visitor, weekly gym that dropped yesterday (recency ≈ 0.95 at 14-day half-life):

| You visited | Unseen | turnover | Score | Tier |
|---|---|---|---|---|
| 1 week ago | 1 | 0.67 | 0.63 | 💪 worth |
| 2 weeks ago | 2 | 0.80 | 0.76 | 👀 fresh |
| 3–4 weeks ago | 3–4 | 0.86–0.89 | 0.82–0.85 | 👀 fresh |
| 5+ weeks ago | 5+ | 0.91+ | 0.87+ | 🔥 hot |

The cases that drove the amendments still hold: 4 unseen newest 4d (0.73) outranks 3 unseen
newest 4d (0.70), 5 unseen newest 4d (0.75) outranks 3 unseen newest 3d (0.74), and a
3-row anon gym reset yesterday is 🔥 regardless of its row count.

Pinned by the "weekly rotation", tiebreaker, and per-path tests in
`src/lib/freshness.test.ts`.

### Display language: two voices

The scoring change has a display consequence: for anon users, "fresh" / "new" / "never
visited" copy is dishonest — "fresh" relative to what? The internal 28-day window is
invisible, and "never visited" is presumptuous (visits live in localStorage; the user may
climb there weekly and just never logged it). So everything user-facing speaks one of two
voices, chosen per gym by whether a visit is logged:

- **Returning voice** — anchored to _your visit_: "3 resets piled up since your visit, the
  latest yesterday - practically a new gym." The sector table keeps its
  fresh-since-your-visit dots.
- **Anon voice** — describes the gym's _activity_, never "you": "Last reset yesterday -
  get on it before the chalk builds up." The sector table shows recently-reset sectors
  plainly (no dots — they'd mark the invisible window) and folds quiet ones into
  "+ N more sectors with older sets".

The **badge carries no count** — just the tier emoji and title (e.g. "🔥 sending hot"). A
count there was the source of three separate confusions: boulder volume (irrelevant), "N
fresh sectors" (undercounts a single sector reset repeatedly), and sectors-vs-resets
framing. The exact "how much / how recent" already lives in the narrative line directly
below, so the badge stays a clean tier indicator (`src/components/FreshnessBadge.tsx`).

Each narrative line uses a fixed "Last reset {when}" lead-in plus the tier's punchline
(`src/lib/freshness/narrative.ts`). The compact per-reset list shows only rows after the
user's cutoff (visit date or the same 28-day anon window the scorer uses), which also makes
the per-row fresh flag redundant — removed.

## Implementation pointers

- `src/lib/freshness/scoring.ts` — `gymFreshness`, `computeRecency`. All constants live here.
  The anon visit-date substitution is the single `lastVisitedISO === null` branch.
- `src/lib/freshness/tier-binding.ts` — `bindTier`, the five fixed score cuts.
- `src/lib/freshness/index.ts` — `scoreGym` + `rankGyms`. Sort key `noveltyScore` desc;
  tiebreak `mostRecentFreshISO` desc (unchanged).
- The `FreshLabel` (sector/boulder counts) and `narrative`/`badge` strings are unchanged —
  they're display concerns and still surface boulder counts where known.

## Revisit when

- **You have multi-user data.** Derive `ANON_VISIT_GAP_DAYS` and the turnover curve from real
  inter-visit gaps and per-gym reset cadence instead of the weekly-rotator assumption.
- **A gym's cadence isn't weekly.** Both recency half-lives and the anon window assume it;
  revalidate per city.
- **HOT becomes always-empty or always-full** on the anon page — re-tune `HOT_SCORE` or the
  half-life before touching the window.
- **Boulder volume turns out to matter** to users (e.g. most gyms start reporting counts) —
  reconsider letting it nudge `turnover`.
