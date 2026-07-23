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

"Fresh" means _new climbing since you last came_. Computed in `src/lib/freshness/` (entry: `gymFreshness` in `scoring.ts`). One scoring primitive, read through two lenses:

> **`noveltyScore = Σ over relevant resets of weight(ageDays)`** — an _unbounded_ recency-weighted sum where each lens weights age differently: **anon** `weight = 0.5 ^ (ageDays / HALF_LIFE_DAYS)` (decays to 0 — "fresh right now"), **returning** `weight = RETURNING_WEIGHT_FLOOR + (1 − FLOOR) · 0.5 ^ (ageDays / HALF_LIFE_DAYS)` (floored at 0.25 so an unseen reset never counts for nothing — count outweighs age). Both hit 1.0 at age 0; boulder counts never affect scoring (display-only).
>
> - **Relevant resets** depend on the lens: **returning** (a visit logged) = resets _after_ your last visit; **anon** (no visit) = resets within the last `ANON_WINDOW_DAYS` (28).
> - `HALF_LIFE_DAYS` (10) is the one cooling knob — drives anon variance and the returning age modulation; `RETURNING_WEIGHT_FLOOR` (0.25) makes returning count-dominant.

`bindTier(result, isAnon)` (`tier-binding.ts`) reads the score through **two cut sets**, because anon and returning ask different questions (and weight age differently): anon `HOT/FRESH/WORTH` = `2.0/1.75/0.9` (spaced so a typical weekly gym maps onto reset recency — HOT ≈ reset today/yesterday, FRESH ≈ 2–3 days, WORTH ≈ 4–~11 days — giving the first-open "wow"); returning = `2.0/1.45/0.53` (count-driven: 1 fresh unseen reset = `WORTH`, 2 recent = `FRESH`, 3+ recent = `HOT`; a lone unseen reset cools `WORTH` → `SLIM` at ~2 weeks; many-but-old sits ~one tier below the same count fresh). `SLIM` > 0, `STALE` = 0 (reset data but nothing relevant), `UNKNOWN` = no reset data at all. Tier visuals/animation live in `src/lib/tier.ts`.

The formula, the constants, and tuning guidance live in **[ADR-0004](docs/adr/0004-recency-weighted-reset-volume.md)** (anon lens) and **[ADR-0005](docs/adr/0005-floored-returning-decay.md)** (returning lens — floored weight + shifted ladder, supersedes 0004's returning rules). Don't touch `HALF_LIFE_DAYS`, `ANON_WINDOW_DAYS`, `RETURNING_WEIGHT_FLOOR`, or either set of tier cuts without reading them. Pinned by `src/lib/freshness.test.ts`.

User-facing copy speaks two voices, chosen per gym by whether a visit is logged (`narrative.ts`): **returning** ("…since your visit") vs **anon** (describes the gym's activity, never "you"). The badge carries no count — just emoji + tier title.

The reset query window is `RESET_HISTORY_DAYS` (240) in `src/lib/db/gyms.ts`. Resets older than this are stripped server-side, so a gym with only ancient resets reads as "no data" in the UI even if rows exist.

## Visit log

`localStorage` (`freshholds:visits`) is the canonical client store, shape `Record<gymSlug, isoDate[]>` (old single-string entries auto-migrate on read). It's mirrored into the short-lived `fh-visits` cookie (latest date per gym) so the server can pre-rank on first paint without client hydration. Lives in `src/lib/visit-log/`; hook is `useVisitLog(authed)`, exposing full `history` (calendar) and derived `visits` (latest-per-gym, for scoring).

When signed in, the hook reconciles localStorage with the server `visits` table once per tab session (`reconcile.ts` — a pure union, unit-tested in `reconcile.test.ts`). Local stays canonical; network failures are non-blocking and retried on next mount.

## Caching & ranking

Per **[ADR-0001](docs/adr/0001-cache-architecture.md)**: `unstable_cache` (not `"use cache"`/`cacheComponents`), so dynamic cookie reads need no Suspense and the page lands fully ranked. Only `getActiveGymsWithSections` (`db/gyms.ts`) is cached — one entry, tagged `["gyms"]`. `getRankedGyms(visitsCookieRaw)` (`db/ranking.ts`) is an uncached function that reads that cache and runs `rankGyms` fresh per request (so scores track the current time). Admin writes call `revalidateTag("gyms", { expire: 0 })` — immediate expiration, so the next load blocks and recomputes fresh rather than serving stale (read-your-own-writes; `"max"`/stale-while-revalidate was the source of post-reset staleness). Cached payloads must be JSON-serializable (no `Set`/`Map`).

## Sort order

`rankGyms` returns `{ hero, heroHasData, runnersUp, noDataExtras }`. The hero is the top card (auto-expanded). Order:

1. **Gyms with reset data**, by `noveltyScore` descending. Tiebreak: most recent fresh reset date descending.
2. **Gyms with no reset data** at the bottom (we can't help the user pick).

Visit state does _not_ segregate the list — score is a recency-weighted sum of resets that are new _to you_ (post-visit, or within the anon window), so a long-abandoned gym with fresh content can outrank a recently-visited busy gym. Lenses mix freely in one list and are compared by raw score. That's intended; don't reintroduce a visited-first split without a reason.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at timoransky/fresh-holds. Use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names used as-is (no custom mapping). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` live at the repo root. See `docs/agents/domain.md`.
