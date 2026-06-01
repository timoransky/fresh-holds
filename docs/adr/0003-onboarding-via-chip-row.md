# ADR-0003 — First-run onboarding as a card state, not a flow

Status: Accepted (2026-06-01)

## Context

[ADR-0002](0002-gym-scoring-model.md) calls out that first-time-user UX is the model's weakest spot: with no visits logged, `visitFactor` defaults to `NEVER_VISITED_FACTOR = 1.0`, and the `HOT` tier requires `noveltyScore ≥ 1.8`. Substance maxes around 1.0 for multi-sector gyms (~0.95 for single-sector), so `HOT` is mathematically unreachable for a never-visited user — the headline tier is invisible until they log a visit with a gap of ≥ 25 days. New users see a home page of `WORTH` / `SLIM` / `—` and have no obvious next step.

The product question is _"can a first-time user see the personalized recommendation the app is built around, without making them sign in, type, or remember exact dates?"_

Constraints we want to preserve:

- **No auth requirement.** The localStorage-canonical visit log already makes the app fully functional for anon users; onboarding must not break that.
- **No throwaway code.** A one-time onboarding screen adds surface area that decays the moment first-run is done. Whatever we build should keep paying rent.
- **No new modal/route.** Cached home page is the value prop; we don't want to gate it behind a wizard the user has to dismiss before they see anything.

Independent of onboarding, the existing calendar-based visit log is heavier than necessary for casual logging — "I climbed at Spot this week" is a more common mental model than "I climbed at Spot on May 24". Bucket-based quick actions ("today / this week / this month / longer / never") are likely to become the primary logging UX (calendar stays as the precise/edit fallback).

These two needs converge: the same chip row that bootstraps a new user's history *is* the future quick-action UX.

## Decision

Introduce a new card state, `NEEDS_INPUT`, that surfaces a chip row of bucketed visit options whenever the app does not know the user's visit gap for a gym with reset data. The chip row is **not** a first-run flow. It is a persistent affordance that appears on any gym card lacking visit data, including for new gyms added later, and for users who clear their storage.

### State matrix

| Has reset data? | Visit logged? | Card state | Chip row? |
|---|---|---|---|
| ✅ | ✅ | Normal tier (HOT / WORTH / SLIM / STALE) | no |
| ✅ | ❌ (and not dismissed) | **NEEDS_INPUT** — desaturated tier + chips | **yes** |
| ❌ | ✅ | UNKNOWN — em-dash, "no reset data" | no |
| ❌ | ❌ | UNKNOWN — em-dash, "no reset data" | no |

`NEEDS_INPUT` is visually distinct from `UNKNOWN`. `UNKNOWN` is terminal ("we don't know what's at this gym"). `NEEDS_INPUT` is actionable ("we don't know when *you* last climbed here"). Conflating them with the same `❓` treatment would lie about which case the user is in.

When a user has answered "Never been" for a gym, the card leaves `NEEDS_INPUT` and ranks normally (`visitFactor = 1.0`), with a small "Never been • undo" affordance in place of the chip row so the dismissal stays reversible without a journey through the visit dialog.

### Buckets

Five chips, with fixed offsets mapped to representative ISO dates:

| Chip | Offset | `visitFactor` (curve from ADR-0002) | Storage |
|---|---|---|---|
| Today | 0d | 0 (STALE override) | plain string |
| This week | -3d | 0.21 | `{ date, estimated: true }` |
| This month | -14d | 1.0 | `{ date, estimated: true }` |
| Longer | -45d | 2.5 (capped) | `{ date, estimated: true }` |
| Never | — | — (no visit written) | added to `visits-dismissed` |

Five fits one row at 390px viewport. Every chip lands in a *distinct* tier so each tap visibly moves the ranking. "Longer" is the only path to surfacing `HOT` from onboarding — the entire point — so it is non-negotiable. "Today" writes a plain string because the user is being precise; only the rougher buckets carry the `estimated` tag.

### Storage shape

`VisitHistory` widens to carry per-entry metadata:

```ts
// src/lib/visit-log/types.ts
export type VisitEntry = string | { date: string; estimated: true };
export type VisitHistory = Record<string, VisitEntry[]>;
```

A separate localStorage key tracks "I've never been" dismissals:

```ts
// localStorage key: freshholds:visits-dismissed
// shape: string[]  (gym slugs)
```

Estimated tags are **local-only** by design. The `fh-visits` cookie (which mirrors latest-date-per-gym for server-side pre-rank) keeps its existing `Record<slug, string>` shape; estimation is a UX hint, not a fact about the visit worth syncing. Cross-device, estimates appear as plain visits — no badge, but ranking remains correct.

### Lifecycle

- **No expiration of estimates.** A 6-month-old "This week" estimate still ranks (capped factor 2.5, almost certainly HOT). Real-visit logging is the cure; the estimated tag in `VisitHistoryDialog` is the manual refinement path. Proactive "is this still accurate?" pulses are friction for what's usually a correct answer.
- **No completion tracker.** There is no "the user has finished onboarding" flag anywhere. `NEEDS_INPUT` is just whatever cards happen to have no visit + no dismiss; it self-resolves through normal use.
- **A real visit overrides dismiss.** `setVisits(slug, dates)` with a non-empty `dates` argument clears the slug from `visits-dismissed`. Prevents the nonsense state "I've never been here, also I just climbed here".

## Consequences

**What we gain**

- **`HOT` becomes reachable for first-time users.** One tap of "Longer" on any gym with substance ≥ 0.72 → HOT. The headline tier is no longer locked behind a 25-day wait.
- **Onboarding code doesn't decay.** The chip row is the same component as the future post-onboarding quick-action UX. There is no "delete after launch" code.
- **New gyms get an obvious "tell us when you were here" affordance.** When a gym is added to the DB, existing users see it appear in `NEEDS_INPUT` automatically — no notification machinery needed.
- **Skip is the default.** Doing nothing dismisses onboarding. No dark-pattern X-button to design. No re-prompts.

**What we accept**

- **A third localStorage key.** `freshholds:visits` + `fh-synced-session` + new `freshholds:visits-dismissed`. If a fourth appears, refactor into a unified `freshholds:state` blob.
- **`VisitHistory` is no longer just `Record<slug, string[]>`.** Type widens to `(string | { date, estimated })[]`. Touches `parseHistory`, the `visits` reduce in `useVisitLog`, `setVisits` signature, `reconcile`, and the visit dialog. ~5 files. The existing `reconcile.test.ts` is the primary safety net.
- **Estimated tags don't survive a device hop.** On a second device or after server reconciliation, estimates look like plain visits. We trade the "edit me" affordance on cross-device for not touching the `visits` table schema. Defensible because the tag is a UX hint, not state.
- **Bucket→date mapping is hardcoded.** "This week" always means -3d; we don't randomize within the bucket. A user refreshing should not see their score drift for an estimate they didn't change. Estimates are intentionally deterministic-but-rough.
- **No measurement of whether onboarding works.** Same blind spot as ADR-0002. We will not know completion rate, tier-distribution shift, or whether users tap a chip then bounce — until measurement infrastructure exists. We accept shipping blind on this iteration because the value of unblocking `HOT` is obvious and the cost of getting it slightly wrong is low (chip taps are reversible).

## Implementation pointers

- `src/lib/visit-log/types.ts` — `VisitEntry`, widened `VisitHistory`.
- `src/lib/visit-log/buckets.ts` — `BUCKETS` constant + `applyBucket(slug, bucketId)` helper. Single source of truth for bucket→offset math.
- `src/lib/visit-log/hook.ts` — `parseHistory` accepts both string and rich entries; the `visits` reduce extracts date via helper; `setVisits` widens to `VisitEntry[]` and clears `visits-dismissed` when writing real visits; new `setDismissed` / `clearDismissed` helpers.
- `src/lib/visit-log/reconcile.ts` — preserves local rich entries when merging plain remote strings; strips metadata before pushing.
- `src/lib/actions/visits.ts` — server actions extract plain dates from rich entries before push.
- `src/components/VisitHistoryDialog.tsx` — renders "estimated" badge for rich entries; "Gyms you said you've never been to" section with per-row "I've been here" undo.
- `src/components/gym/ChipRow.tsx` — new. The five buckets as a row of chips.
- `src/components/GymCard.tsx` — renders `ChipRow` when `NEEDS_INPUT`; renders "Never been • undo" affordance when dismissed; topmost-card hint text "← when were you here last?".
- `DESIGN.md` — new `needs-input` palette token (slate-neutral, distinct from the four tier palettes), chip component spec, the state matrix table above.

The migration ships as two PRs:

- **PR1**: data layer — `VisitEntry`, `visits-dismissed` infrastructure, `reconcile` updates, dialog acknowledges both shapes. No home-page change. Reviewable as "visits can now carry metadata".
- **PR2**: onboarding UI — `buckets.ts`, `ChipRow`, `NEEDS_INPUT` card state, DESIGN.md update. Reviewable as "cards now show a chip row when we don't know your visit gap".

## Revisit when

- **You build measurement.** The "shipped blind" caveat above is the same one ADR-0002 has. Tier-distribution and chip-tap-rate logging would let us know whether the bucket offsets are right. If "Longer" turns out to be the only chip people tap, that's a signal the others are wrong.
- **The calendar is removed entirely.** If bucket chips become the *only* way to log visits (no precise mode), the `estimated` tag stops being meaningful — every visit is bucket-derived. At that point either drop the tag or invert its meaning (`exact: true` for the rare precise entries).
- **You introduce a new gym mid-season.** If users complain that a new gym's `NEEDS_INPUT` state is intrusive (they don't go there, didn't ask), consider a per-card "not interested" dismissal distinct from "never been".
- **A fourth localStorage key appears.** Refactor into a unified `freshholds:state` blob with a schema version.
- **First-time-user UX still feels flat.** The easier lever than re-tuning buckets is changing `NEVER_VISITED_FACTOR` from 1.0 to something larger — see ADR-0002's "Revisit when".
