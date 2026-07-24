import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

// One pooled node-postgres connection, reused across the module. node-postgres
// speaks plain Postgres, so this works identically against Supabase's direct/
// session endpoint now and Neon's pooled endpoint later — the cutover is just
// DATABASE_URL. See ADR-0006.
//
// `db` connects as the database owner (the connection-string role), which
// BYPASSes RLS. Public cached reads and already-authorized server code use it
// directly; anything acting on behalf of a specific end user must go through
// `rlsDb` so the auth.uid() policies enforce (the DB-level backstop behind the
// app's own authz checks).
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Minimal set of JWT claims the RLS policies read. `sub` feeds auth.uid();
// `role` becomes the transaction-local Postgres role.
export type Claims = { sub: string; role: "authenticated" | "anon" };

// Run `fn` inside a transaction that impersonates an end user, so the existing
// auth.uid() RLS policies apply to everything inside — the Supabase-documented
// createDrizzle pattern, but with parameterized set_config() instead of JSON
// string interpolation. SET LOCAL role/claims are transaction-scoped, so they
// reset automatically when the transaction ends. `role` is only ever set by
// our own code (never user input), so interpolating it as an identifier is
// safe; the claim values are parameterized.
export async function rlsDb<T>(claims: Claims, fn: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`);
    await tx.execute(sql`select set_config('request.jwt.claim.sub', ${claims.sub}, true)`);
    await tx.execute(sql.raw(`set local role ${claims.role}`));
    return fn(tx);
  });
}
