<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Fresh Holds

A Next.js 16 (App Router) + Supabase app that helps Bratislava boulderers see which gym is freshest since their last visit. Server components fetch gyms/sections/resets in one query via `@supabase/ssr`; visit history lives in `localStorage` only — no auth, no admin UI. RLS policies allow public read on all four tables (`cities`, `gyms`, `sections`, `resets`); resets are logged manually in the Supabase dashboard. Tailwind v4 with Geist, light-only.

## Freshness model

"Fresh" means _new climbing for this user_ — i.e. sections that were reset after they last visited. Computed in `src/lib/freshness/` (entry: `gymFreshness` in `scoring.ts`):

- **No reset data at all** (no resets in the cutoff window) → `hasResetData: false`, tier `UNKNOWN`. UI shows `—` / "no reset data". We genuinely don't know the state.
- **Has reset data** → compute `noveltyScore = visitFactor × substance`, then bind to a tier (`HOT` / `WORTH` / `SLIM` / `STALE`). Never-visited is treated as a **neutral** visit gap (`visitFactor = 1.0`), not max — see ADR-0002 for the rationale.

The full formula, constants, and tuning guidance live in [ADR-0002](docs/adr/0002-gym-scoring-model.md). Don't change `HOT_SCORE`, `VISIT_RAMP_DAYS`, or the substance tiers without reading it.

Visit history is stored in `localStorage` as `Record<gymSlug, isoDate[]>`. `useVisits` exposes both the full `history` (for the calendar multi-select) and a derived `visits` map (latest date per gym) for the freshness/sorting logic. Old single-string entries from earlier versions auto-migrate to `[date]` on read.

The reset query window lives in `src/lib/db/gyms.ts` as `cutoffISO`. Resets older than this are stripped server-side, which means a gym with only ancient resets will appear as "no reset data" in the UI even if rows exist in the DB.

## Sort order

`rankGyms` sorts the home page so the most useful card is at the top, and the top card auto-expands. Order:

1. **Gyms with reset data**, by `noveltyScore` descending. Tiebreak: most recent fresh reset date descending.
2. **Gyms with no reset data** at the bottom (we can't help the user pick).

Visit state does _not_ segregate the list. The score blends visit gap and substance multiplicatively, so a long-abandoned gym with modest fresh content can outrank a recently-visited gym with lots of fresh content — that's the intended behavior. Don't reintroduce a visited-first split without a reason.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at timoransky/fresh-holds. Use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names used as-is (no custom mapping). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at the repo root (created lazily by `/grill-with-docs`). See `docs/agents/domain.md`.
