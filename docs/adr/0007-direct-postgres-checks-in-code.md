# ADR-0007 — The app talks to Postgres directly; access checks live in server code

Status: Accepted (2026-10-24). First step of the Supabase → Neon move (phase A,
"Neon prep").

## Context

Until now every query went through the Supabase data API (PostgREST) as either
the anon key or the signed-in user's JWT. The database's RLS policies were the
authorization layer: public read on gym data, `auth.uid() = user_id` on visits,
the admin `exists(... is_admin)` checks, the pending-submission cap, the storage
folder rules. The app code mostly trusted that a query which "worked" was
allowed.

Neon has no PostgREST, no `auth.uid()`, and no Supabase Storage. To move, the
app has to speak plain Postgres over a connection string — which Supabase also
exposes, so the switch can ship (and be verified) while we're still on
Supabase.

A plain connection string connects as the **table owner**. Owners bypass RLS
(no `force row level security` anywhere), so the moment a query runs through
`DATABASE_URL`, its RLS policy no longer guards it.

## Decision

1. **App queries go through Drizzle on `DATABASE_URL`** (`src/db/client.ts`,
   postgres.js driver). The Supabase client is kept for **auth only** —
   session, OTP, sign-out — once the porting is done.
2. **Every access check lives in server code.** Each query that used to rely on
   a policy carries the check explicitly: the user id always comes from the
   verified Supabase session (`getAuthedClient()`), never from input; admin
   paths go through `requireAdmin()`; caps and ownership rules are checked
   (in a transaction where they race) before writing.
3. **RLS stays on.** The publishable key still reaches PostgREST, so the
   policies remain as defense against direct API access. They are no longer the
   source of truth for what the app allows, and a policy change no longer
   changes app behavior.
4. **Ported one path at a time.** Each Neon-prep issue moves a set of queries
   and translates the policies they relied on into code in the same PR.

## Consequences

**What we gain**

- One portable data layer: the Neon cutover becomes a `DATABASE_URL` change.
- Authorization is readable next to the query it guards, testable with plain
  unit tests, and produces real error messages instead of an opaque `42501`.

**What we accept**

- A missing check is now a data leak, not a no-op. Reviews of server actions
  and `src/lib/db/` must look for the user/admin filter on every query.
- RLS and the code can drift. When they disagree, the code wins; the policies
  only matter for direct PostgREST access, which goes away with Supabase.
- Schema changes still ship as SQL in `supabase/migrations/`; `src/db/schema.ts`
  is a query-side mirror re-pulled with `drizzle-kit pull` (not a migration
  source).

## Implementation pointers

- `src/db/client.ts` — the shared Drizzle client (owner connection).
- `src/db/schema.ts`, `src/db/relations.ts` — pulled schema for all `public`
  tables, column names kept snake_case so query results match `src/lib/types.ts`.
- `drizzle.config.ts` — `drizzle-kit pull` against `DATABASE_URL`.
- `src/lib/db/gyms.ts` — the home page read, first query ported. Public data,
  so no check needed.

## Revisit when

- The Neon cutover lands: drop the RLS-as-defense rationale and the Supabase
  policies with it.
- We ever need per-user data access from a context that isn't server code.
