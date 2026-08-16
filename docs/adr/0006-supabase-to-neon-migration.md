# ADR-0006 — Supabase → Neon migration (Drizzle first, phased cutover)

Status: Accepted (2026-07-24). Cumulative ADR, updated per phase.

## Context

The Supabase free-tier slot is needed for another project that requires
realtime, so Fresh Holds moves its database (and eventually auth) to Neon. The
key enabling insight: **Supabase Auth works without the data tables**, so we can
move queries off PostgREST onto a direct Postgres connection — and even flip the
database to Neon — while auth stays on Supabase. Imported user UUIDs already
match, so no remap is needed until the auth phase.

The migration ships as **four independently deployable, revertible phases**:

1. Introduce Drizzle against Supabase Postgres (this ADR's initial scope).
2. Storage via the S3-compatible endpoint (drop supabase-js for storage).
3. Flip the database to Neon (auth still Supabase).
4. Auth → Neon Auth (Stack Auth) + user remap.

## Decisions

### Driver: `drizzle-orm/node-postgres` with a `pg.Pool`

Plain Postgres protocol works identically against Supabase's session endpoint
now and Neon's pooled endpoint later, so the cutover is literally a
`DATABASE_URL` swap. No neon-http/websocket lock-in. `src/db/client.ts` owns the
single pooled `db`.

### Two-layer authz: app checks (UX) + RLS (DB backstop)

RLS stays live through **every** phase. RLS is inert until Postgres knows who is
asking — Supabase's PostgREST injected the user JWT per query; over a direct
connection we reproduce that with a **transaction wrapper** (`rlsDb`, the
Supabase-documented `createDrizzle` pattern):

```
select set_config('request.jwt.claims', $claims, true);
select set_config('request.jwt.claim.sub', $sub, true);
set local role authenticated;
```

so the existing `auth.uid()` policies keep enforcing unchanged. We use
**parameterized `set_config()`** (not the docs' JSON string interpolation);
`role` is only ever set by our own code, so it is interpolated as an identifier.
`SET LOCAL` is transaction-scoped, so role/claims reset automatically on commit.

- The **plain `db`** connects as the owner role, which BYPASSes RLS. Public
  cached reads (`getActiveGymsWithSections`) and already-authorized server code
  use it directly.
- **User-scoped and admin writes** go through `rlsDb(claims, fn)` so the DB
  enforces the policies as a backstop behind the app's own checks.
- App-layer checks are the **UX layer**: friendly errors (the pending-cap
  message, `requireAdmin()` on admin reads) instead of RLS's silent zero-rows /
  `42501`.

Why not JWT-based "Neon RLS"? It would lock us into a specific driver/session
scheme. Instead, `auth.uid()` is just
`nullif(current_setting('request.jwt.claim.sub', true), '')::uuid`; on Neon
(Phase 3) we recreate that one shim function plus the `authenticated`/`anon`
roles, and the **same policies and the same `rlsDb` wrapper work verbatim**.

### Policies live in the schema (`pgPolicy`)

`src/db/schema.ts` declares every table's RLS policy via `pgPolicy` +
`drizzle-orm/supabase` (`authenticatedRole`, `authUid`), so schema + policies
share one source of truth. **In Phase 1 these are declarations only** — the live
Supabase policies already match and no migration is generated (the DB already
exists). drizzle-kit starts managing them at Phase 3 (baseline generate against
the now-canonical schema). `drizzle.config.ts` uses
`entities.roles.provider: "supabase"` to ignore Supabase-managed roles until
then.

### `{ mode: "string" }` for all date/timestamp columns

Keeps the `unstable_cache` payload JSON-serializable (ADR-0001) and lets the
existing string-typed freshness code compile unchanged. Snake_case column names
are kept for the same reason (`GymWithSections` etc. untouched).

### `approveSubmission` as one CTE

Read pending → insert reset → stamp submission approved, atomically, in a single
statement (`RETURNING`; zero rows ⇒ "Already reviewed"). Runs inside `rlsDb`
under the admin's claims, so the admin RLS policies enforce.

### `ensureProfile` over the DB trigger

The Supabase `handle_new_user` trigger (SECURITY DEFINER) creates the profiles
row on signup today. `getAuthedUser()` now also calls `ensureProfile` (insert-
on-conflict-do-nothing) on every authed path — harmless alongside the trigger
now, and it takes over the trigger's job after Phase 3 (Neon has no such
trigger).

## Consequences / caveats

- RLS violations surface as errors/zero rows, not messages — the thin app checks
  are the UX layer.
- **To verify against the live DB** (no local `DATABASE_URL` at authoring time):
  1. the connecting role can `SET ROLE authenticated` (the wrapper relies on it);
  2. `updateResetDate` performs an UPDATE on `resets`, but migrations 0001–0010
     declare only admin **INSERT** and **DELETE** policies on `resets` (no
     UPDATE). Under `rlsDb` this faithfully reproduces today's behavior, but if
     no admin-UPDATE policy exists in the live DB, the edit silently affects zero
     rows. Confirm whether such a policy was added out-of-band (dashboard); if
     the intent is that admins can edit reset dates, add an `allow admin update`
     policy on `resets` to the schema before Phase 3 baselines it.
