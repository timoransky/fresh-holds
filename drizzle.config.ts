import { defineConfig } from "drizzle-kit";

// No migrations are generated in Phase 1 — the Supabase DB already exists and
// the schema is hand-matched to it. drizzle-kit generate/push start at Phase 3
// (the Neon flip), where this config becomes the source of truth. Until then it
// only powers `drizzle-kit introspect`/`studio` if needed.
//
// `provider: "supabase"` tells drizzle-kit to ignore Supabase-managed roles
// (anon/authenticated/service_role/…); it's dropped in Phase 3 once we manage
// the roles ourselves on Neon.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
