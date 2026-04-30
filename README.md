# Fresh Holds

A bouldering gym freshness tracker for Bratislava. See which gym has the most newly-reset sections since your last visit.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, and Supabase. Visits are stored in `localStorage` only — no accounts, no admin UI.

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
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable (anon-equivalent) key. Reads are protected by RLS public-read policies set up by the migration.

## Supabase setup

1. Open your Supabase project → **SQL Editor**.
2. Run [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) to create the schema and enable public-read RLS.
3. Run [`supabase/seed.sql`](supabase/seed.sql) to insert Bratislava + four gyms + sections + one reset per section.

To log a new reset later, insert a row directly in the `resets` table:

```sql
insert into resets (section_id, reset_on, notes)
values ((select id from sections where name = 'Cave' and gym_id = (select id from gyms where slug = 'spot')),
        current_date,
        null);
```

## Run it

```bash
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel, **Add New Project** → import the repo.
3. Add the two env vars under **Project Settings → Environment Variables** for **Production**, **Preview**, and **Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. The homepage re-fetches Supabase on every request (`force-dynamic`), so freshness reflects the latest reset rows immediately.

## Project layout

```
src/
  app/
    layout.tsx     — root layout, Geist font, light-only
    page.tsx       — homepage (server component, fetches gyms)
    globals.css
  components/
    GymList.tsx    — client; sorts + renders cards, owns modal state
    GymCard.tsx    — client; one gym row with section bars
    GymDetail.tsx  — client; modal on desktop, drawer on mobile
  hooks/
    useVisits.ts   — localStorage-backed visit tracking
  lib/
    db/gyms.ts     — single Supabase query for active gyms + sections + recent resets
    freshness.ts   — pure helpers: gymFreshness, mostRecentReset, daysSince, relativeDay
    types.ts
  utils/
    supabase/server.ts      — server-side @supabase/ssr client (cookie-aware)
    supabase/client.ts      — browser client (unused for now; ready for future client reads)
    supabase/middleware.ts  — middleware helper (wire up in proxy.ts when auth lands)
supabase/
  migrations/0001_initial.sql
  seed.sql
```
