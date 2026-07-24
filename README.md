# Fresh Holds

> Where's the fresh climbing in Bratislava? Logs your visits and ranks the city's bouldering gyms by what's new since you were last there.

Live at **[freshholds.janci.dev](https://freshholds.janci.dev)**.

## What it does (user perspective)

Bratislava has a handful of bouldering gyms, and each one resets its boulder problems sector by sector on its own rhythm. If you climb at more than one, the useful question is rarely "which gym is closest" — it's **"which gym has the most new climbing for me right now?"**

Fresh Holds answers that:

- Log a visit with one tap whenever you climb. History lives in your browser — no signup required.
- The home page sorts gyms by a **novelty score** that blends *how much you've been climbing lately* with *how much new stuff has been set since you were last there*.
- Each gym card shows fresh sectors with a tier label (`sending hot` / `worth a climb` / `slim pickings` / `stale` / `no reset data`), so you don't read raw numbers — you read a recommendation.
- Optional sign-in syncs your visit log across devices (Supabase Auth).
- Installable as a PWA. Works on the bus on the way to the gym — the home page is cached and renders offline.

The full domain model and scoring formula are in [`CONTEXT.md`](CONTEXT.md) and [`docs/adr/0002-gym-scoring-model.md`](docs/adr/0002-gym-scoring-model.md).

## How it's built (developer perspective)

### Stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, Server Components, Server Actions, parallel routes for the detail modal) |
| UI | **React 19**, **Tailwind CSS v4**, **shadcn/ui** (Radix primitives), **Vaul** drawers, **Hugeicons** |
| Data | **Postgres + RLS** via **Drizzle ORM** (`drizzle-orm/node-postgres`); **Supabase Auth** via **`@supabase/ssr`**. Mid-migration to Neon — see [`docs/adr/0006`](docs/adr/0006-supabase-to-neon-migration.md) |
| Storage | **`localStorage`** as the canonical visit log for anonymous users; **cookie mirror** so the server can pre-rank; **`visits` table** for cross-device sync when signed in |
| Cache | Next.js **`unstable_cache`** with daily revalidation and tag-based invalidation |
| Offline | **Service worker** with stale-while-revalidate for the home page and static assets; **Web App Manifest** for installable PWA |
| Tooling | TypeScript, ESLint, **Vitest**, **oxfmt** |
| Hosting | Vercel (with `@vercel/analytics`) |

### Architecture notes

- **No auth required to use it.** The home page is rendered with a Supabase publishable key behind RLS public-read policies. Sign-in is purely opt-in (for visit sync).
- **Visit log lives in three places** (`src/lib/visit-log/`): browser `localStorage` (canonical), a `fh-visits` cookie (latest-per-gym mirror), and the server `visits` table for signed-in users. A pure `reconcile(local, remote)` function merges them on tab start.
- **Freshness is pure.** `src/lib/freshness/` takes gyms + last-visited dates and returns `ScoredGym` objects. Components consume the scored output — they never re-derive.
- **Two cache layers** (`src/lib/db/`): the raw Supabase query (`unstable_cache`, tagged `"gyms"`, daily) and the per-user ranking (`unstable_cache` keyed on visit cookie + day). Admin reset/approve actions call `revalidateTag("gyms", "max")` to flush both. See [`docs/adr/0001-cache-architecture.md`](docs/adr/0001-cache-architecture.md).
- **Service worker** (`public/sw.js`) caches the home navigation response and static assets with stale-while-revalidate. Admin, login, auth and API routes bypass the SW so auth state is never stale. The daily ranking-cache rotation makes a one-day stale offline view acceptable.
- **PWA**: manifest at `src/app/manifest.json`, icons under `public/`, installable with `display: standalone`.
- **Resets are logged manually** in the Supabase dashboard. There's an in-app "suggest a reset" flow for community submissions, gated by an admin approve action.

### Project layout

```
src/
  app/                  App Router pages, layouts, parallel @modal route
    @modal/             Intercepted gym detail modal
    admin/              Admin dashboard for approving reset suggestions
    login/, profile/    Auth pages
    manifest.json       PWA manifest
  components/           Client components (gym cards, drawers, forms, SW register)
  hooks/                React hooks
  db/
    schema.ts           Drizzle schema (7 tables + RLS policies)
    client.ts           Pooled node-postgres db + rlsDb() RLS wrapper
  lib/
    db/                 Drizzle queries (gyms, ranking, submissions, admin)
    freshness/          Pure scoring: scoring.ts, tier-binding.ts, sort.ts, narrative.ts
    visit-log/          localStorage + cookie + server reconciliation
    actions/            Server Actions (visits, submissions, auth, admin)
    tier.ts, date.ts, gymLinks.ts, ...
  utils/supabase/       SSR + browser + middleware Supabase clients
  proxy.ts              Next.js middleware
public/
  sw.js                 Service worker (offline cache)
  web-app-manifest-*.png
supabase/
  migrations/0001_initial.sql
  seed.sql
docs/
  adr/                  Architecture decision records
```

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env file and fill in values from your Supabase project (Settings → API):
   ```bash
   cp .env.local.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` — your project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable (anon-equivalent) key. Reads are protected by the RLS public-read policies set up by the migration.
   - `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — Postgres connection strings for Drizzle (Project Settings → Database → Connection string). The connecting role must be able to `SET ROLE authenticated` for `rlsDb` to enforce RLS. See [`docs/adr/0006`](docs/adr/0006-supabase-to-neon-migration.md).

## Supabase setup

1. Open your Supabase project → **SQL Editor**.
2. Run [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) to create the schema and enable public-read RLS.
3. Run [`supabase/seed.sql`](supabase/seed.sql) to insert Bratislava + the gyms + sections + one reset per section.

To log a new reset later, insert a row directly in the `resets` table:

```sql
insert into resets (section_id, reset_on, notes)
values ((select id from sections where name = 'Cave' and gym_id = (select id from gyms where slug = 'spot')),
        current_date,
        null);
```

## Run it

```bash
npm run dev       # dev server on http://localhost:3000
npm run build     # production build
npm run start     # serve the production build

npm run lint      # ESLint
npm run test      # Vitest (single run)
npm run test:watch
npm run fmt       # oxfmt
npm run fmt:check
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel, **Add New Project** → import the repo.
3. Add the two env vars under **Project Settings → Environment Variables** for **Production**, **Preview**, and **Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy.

## Further reading

- [`AGENTS.md`](AGENTS.md) — conventions and house rules for code-writing agents.
- [`CONTEXT.md`](CONTEXT.md) — domain glossary (Gym, Section, Reset, Visit, Novelty score, Tier, ...).
- [`docs/adr/0001-cache-architecture.md`](docs/adr/0001-cache-architecture.md) — why `unstable_cache` over `"use cache"`.
- [`docs/adr/0002-gym-scoring-model.md`](docs/adr/0002-gym-scoring-model.md) — the novelty-score formula, constants, and tuning guidance.
