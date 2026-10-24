// Drizzle view of the `public` schema, generated with `drizzle-kit pull` and
// trimmed to what queries need (columns, keys, references). The DDL itself is
// owned by `supabase/migrations/` — RLS policies, triggers, indexes and checks
// live there, not here. Re-pull after adding a migration.
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const submission_confidence = pgEnum("submission_confidence", ["low", "medium", "high"]);
export const submission_status = pgEnum("submission_status", ["pending", "approved", "rejected"]);

export const cities = pgTable("cities", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  country_code: text().default("SK").notNull(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const gyms = pgTable("gyms", {
  id: uuid().defaultRandom().primaryKey(),
  city_id: uuid().references(() => cities.id, { onDelete: "set null" }),
  name: text().notNull(),
  slug: text().notNull().unique(),
  neighborhood: text(),
  website_url: text(),
  instagram_handle: text(),
  iclub_slug: text(),
  is_active: boolean().default(true).notNull(),
  display_order: integer().default(0).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const sections = pgTable("sections", {
  id: uuid().defaultRandom().primaryKey(),
  gym_id: uuid()
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text().notNull(),
  display_order: integer().default(0).notNull(),
  is_active: boolean().default(true).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const resets = pgTable("resets", {
  id: uuid().defaultRandom().primaryKey(),
  section_id: uuid()
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  reset_on: date().notNull(),
  notes: text(),
  logged_by: text(),
  boulders_reset: integer(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// `id` references auth.users (Supabase Auth), which lives outside `public`.
export const profiles = pgTable("profiles", {
  id: uuid().primaryKey(),
  email: text().notNull(),
  is_admin: boolean().default(false).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// `user_id` references auth.users (Supabase Auth), which lives outside `public`.
export const visits = pgTable(
  "visits",
  {
    user_id: uuid().notNull(),
    gym_slug: text().notNull(),
    visited_on: date().notNull(),
    created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.gym_slug, table.visited_on] })],
);

export const reset_submissions = pgTable("reset_submissions", {
  id: uuid().defaultRandom().primaryKey(),
  gym_id: uuid()
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  section_id: uuid().references(() => sections.id, { onDelete: "cascade" }),
  reset_on: date().notNull(),
  notes: text(),
  boulders_reset: integer(),
  submitted_by: uuid()
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  status: submission_status().default("pending").notNull(),
  confidence: submission_confidence(),
  photo_path: text(),
  reviewed_by: uuid().references(() => profiles.id),
  reviewed_at: timestamp({ withTimezone: true, mode: "string" }),
  reset_id: uuid().references(() => resets.id, { onDelete: "set null" }),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
