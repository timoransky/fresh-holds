# ADR-0006 — Confidence rides on the submission; the admin is the filter

Status: Accepted (2026-09-03). Supersedes the "skip when unsure" rule stated in
`docs/instagram-stories-pilot.md` and `scripts/instagram-stories/routine-prompt.md`.

## Context

The Instagram-stories pilot has an agent read each gym's stories and file
`reset_submissions` rows (pending) for anything that announces a reset. Until
now, confidence was a **filter that never left the pipeline**, applied twice:

- the routine prompt said "extract a structured record only when you're
  reasonably sure" and "if confidence is low … skip and say so";
- `submit-resets.mjs` dropped any record below `--min-confidence` (default 0.6).

So a borderline read died in the agent's head and the admin never learned it
existed. On 2026-09-02 that cost a real reset: Spot reposted a clip captioned
*"6 nových žolíkov v Spote"* (6 new "joker" problems). The agent's own reasoning
was that it read as a rotating-wildcard feature rather than a clear reset
announcement, and was a reposted customer clip rather than the gym's own notice
— so it filed nothing. Six new problems went unrecorded.

**The asymmetry the old design got backwards:** stories vanish in ~24h and the
job cannot backfill, so a false negative is *permanent*. A false positive sits
in a queue an admin already visits and costs one click to reject. Gating on the
agent's certainty optimised the cheap error at the expense of the expensive one.

That story was in fact blocked twice — the second gate being
`reset_submissions.section_id NOT NULL`. "6 new jokers in Spot" names no wall,
and Spot's sections are physical walls (Cave, Slab, Roof, …), so even a
confident read had nowhere to go.

## Decision

1. **Confidence is data on the row, not a gate.** `reset_submissions.confidence`
   is a `submission_confidence` enum (`low | medium | high`), null for human
   suggestions. The agent files every plausible read and stamps its certainty;
   `/admin` shows it as a badge next to the story photo.
2. **An enum, not a 0..1 score.** An LLM's "0.73" is false precision that
   invites a threshold to creep back in. Three buckets are what the model can
   actually judge consistently and what a reviewer can act on.
3. **The agent may only skip for structural reasons**, never for uncertainty:
   it can't tell which gym (a shared handle like `@blockdock` — the one mistake
   an admin *can't* fix on approval), there's no plausible date, or the story is
   plainly not about new boulders. "I'm unsure" now means `low`, not silence.
4. **A sector is optional.** `section_id` is nullable and a new NOT NULL
   `gym_id` carries the attribution (kept in sync by a BEFORE trigger that
   derives it from the section whenever one is given). When a submission has no
   sector, `/admin` requires the reviewer to pick one before approving, and the
   action verifies the chosen sector belongs to that gym. The human resolves the
   ambiguity — which is what the moderation queue is for.
5. **`--min-confidence` survives as an opt-in flag** for deliberate manual
   runs. It has no default, and the routine prompt tells the agent not to pass it.
6. **The pending cap goes 5 → 20.** Ungated filing means more rows per run, and
   the bot's insert loop aborts on the RLS rejection the cap produces.

## Consequences

- The queue gets noisier. That's the trade we chose: reviewing is cheap,
  re-scraping is impossible.
- Some `resets` rows will carry a sector the admin chose rather than one the gym
  announced. Sections don't affect `noveltyScore` (each reset contributes one
  recency-weighted unit regardless of sector — see ADR-0004/0005); they affect
  the `freshSections / totalSections` label only. A reviewer's best guess is a
  fair price for having the reset at all.
- Dedup now also counts `rejected` rows, so a date a human turned down isn't
  re-filed the next day.

## If the queue becomes unmanageable

In order of preference: hide `low` behind a toggle or a separate list in
`/admin`; tighten the *structural* skip rules; re-introduce a floor via
`--min-confidence`. Do **not** go back to making the agent silent about what it
saw — that's the failure this ADR exists to fix.
