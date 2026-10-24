import { defineConfig } from "drizzle-kit";

// Query-side only: `pnpm exec drizzle-kit pull` refreshes the introspected
// schema from DATABASE_URL. DDL stays in supabase/migrations/ (ADR-0007), so
// never `generate`/`migrate` from here. Merge the pulled output into
// src/db/schema.ts by hand.
export default defineConfig({
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["public"],
  out: "./drizzle",
  introspect: { casing: "preserve" },
});
