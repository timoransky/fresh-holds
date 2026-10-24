import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as relations from "./relations";
import * as schema from "./schema";

// Plain Postgres over DATABASE_URL — Supabase's pooler today, Neon's pooled
// endpoint after the cutover; only the URL changes. postgres.js speaks TCP, so
// interactive transactions work (Neon's HTTP driver can't do those).
// `prepare: false` because transaction-mode poolers don't keep prepared
// statements across checkouts.
//
// This connects as the table owner, so RLS does NOT apply: every access check
// lives in server code. See ADR-0007.
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(postgres(url, { prepare: false }), { schema: { ...schema, ...relations } });
}

// Reuse one pool across dev hot reloads instead of leaking a new one per edit.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
