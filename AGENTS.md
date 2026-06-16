<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Fresh Holds

A Next.js 16 (App Router) + Supabase app that helps Bratislava boulderers see which gym is freshest since their last visit. The home page fetches gyms/sections/resets in one query via `@supabase/ssr` and ranks them server-side. Tailwind v4 with Geist, light-only.

Tables (`cities`, `gyms`, `sections`, `resets`, `profiles`, `reset_submissions`) have RLS with public read on the gym data. Resets reach the DB three ways: the Supabase dashboard, the admin UI (`/admin`), or a signed-in user's "suggest a reset" submission once an admin approves it.

## Auth & roles

Supabase email-OTP auth (`src/lib/auth.ts`, `src/lib/actions/auth.ts`; OTP UI via `input-otp`). Auth is **optional** — the whole app works anonymously. Signing in only adds: cross-device visit sync (see below) and the ability to submit reset suggestions. Admin = `profiles.is_admin`; `requireAdmin()` guards the `/admin/(protected)` routes and admin server actions (`src/lib/actions/admin/`).

## Freshness model

"Fresh" means _new climbing since you last came_. Computed in `src/lib/freshness/` (entry: `gymFreshness` in `scoring.ts`):

> **`noveltyScore = turnover × recency`**, both in `0..1`.
>
> - `turnover = min(unseenResets / SATURATION_RESETS, 1)` — reset rows logged _after_ your last visit. Boulder counts never affect scoring (display-only).
> - `recency = 0.5 ^ (daysSinceNewestUnseenReset / RECENCY_HALF_LIFE_DAYS)` — one-week half-life.
> - **Anon users** are scored as if they last visited `ANON_VISIT_GAP_DAYS` (28) ago — the one branch that differs. Anon pages end up ordered by recency.

`bindTier` (`tier-binding.ts`) maps the score to fixed cuts: `HOT` ≥ 0.85, `FRESH` ≥ 0.70, `WORTH` ≥ 0.50, `SLIM` > 0, `STALE` = 0. **No reset data at all** → `hasResetData: false`, tier `UNKNOWN` (UI shows "no data yet"). Tier visuals/animation live in `src/lib/tier.ts`.

The formula, the six constants, and tuning guidance live in **[ADR-0003](docs/adr/0003-turnover-times-recency-scoring.md)** (supersedes ADR-0002). Don't touch `SATURATION_RESETS`, `RECENCY_HALF_LIFE_DAYS`, `ANON_VISIT_GAP_DAYS`, or the tier cuts without reading it. Pinned by `src/lib/freshness.test.ts`.

User-facing copy speaks two voices, chosen per gym by whether a visit is logged (`narrative.ts`): **returning** ("…since your visit") vs **anon** (describes the gym's activity, never "you"). The badge carries no count — just emoji + tier title.

The reset query window is `RESET_HISTORY_DAYS` (240) in `src/lib/db/gyms.ts`. Resets older than this are stripped server-side, so a gym with only ancient resets reads as "no data" in the UI even if rows exist.

## Visit log

`localStorage` (`freshholds:visits`) is the canonical client store, shape `Record<gymSlug, isoDate[]>` (old single-string entries auto-migrate on read). It's mirrored into the short-lived `fh-visits` cookie (latest date per gym) so the server can pre-rank on first paint without client hydration. Lives in `src/lib/visit-log/`; hook is `useVisitLog(authed)`, exposing full `history` (calendar) and derived `visits` (latest-per-gym, for scoring).

When signed in, the hook reconciles localStorage with the server `visits` table once per tab session (`reconcile.ts` — a pure union, unit-tested in `reconcile.test.ts`). Local stays canonical; network failures are non-blocking and retried on next mount.

## Caching & ranking

Per **[ADR-0001](docs/adr/0001-cache-architecture.md)**: `unstable_cache` (not `"use cache"`/`cacheComponents`), so dynamic cookie reads need no Suspense and the page lands fully ranked. `getActiveGymsWithSections` (`db/gyms.ts`) and `getRankedGyms(visitsCookieRaw, todayISO)` (`db/ranking.ts`) are both cached, tagged `["gyms"]`. Admin writes call `revalidateTag("gyms", "max")`. Cached payloads must be JSON-serializable (no `Set`/`Map`).

## Sort order

`rankGyms` returns `{ hero, heroHasData, runnersUp, noDataExtras }`. The hero is the top card (auto-expanded). Order:

1. **Gyms with reset data**, by `noveltyScore` descending. Tiebreak: most recent fresh reset date descending.
2. **Gyms with no reset data** at the bottom (we can't help the user pick).

Visit state does _not_ segregate the list — score blends visit gap and turnover, so a long-abandoned gym with fresh content can outrank a recently-visited busy gym. That's intended; don't reintroduce a visited-first split without a reason.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at timoransky/fresh-holds. Use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names used as-is (no custom mapping). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` live at the repo root. See `docs/agents/domain.md`.
