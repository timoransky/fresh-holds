// Drizzle schema — hand-written to match the live Supabase Postgres exactly
// (see supabase/migrations/0001–0010). Snake_case column names are kept so
// GymWithSections and the freshness code stay untouched, and every date/
// timestamp column is `{ mode: "string" }` so the unstable_cache payload stays
// JSON-serializable (ADR-0001).
//
// RLS policies are declared here via pgPolicy so schema + policies share one
// source of truth. In Phase 1 they are DECLARATIONS ONLY — the live Supabase
// policies already match and no migration is generated (drizzle-kit starts
// managing them in Phase 3). auth.uid() is expressed through drizzle-orm/
// supabase's `authUid`, which is portable to the Neon shim in Phase 3.
//
// profiles.id / visits.user_id / reset_submissions.submitted_by|reviewed_by
// are modeled as plain uuid columns: the DB-level FKs to auth.users still exist
// on Supabase but are intentionally NOT declared here (they disappear at the
// auth cutover). Public-schema FKs are declared as normal.

import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const submissionStatus = pgEnum("submission_status", ["pending", "approved", "rejected"]);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    country_code: text("country_code").notNull().default("SK"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  () => [pgPolicy("allow public read", { for: "select", using: sql`true` })],
);

export const gyms = pgTable(
  "gyms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    city_id: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    neighborhood: text("neighborhood"),
    website_url: text("website_url"),
    instagram_handle: text("instagram_handle"),
    is_active: boolean("is_active").notNull().default(true),
    display_order: integer("display_order").notNull().default(0),
    iclub_slug: text("iclub_slug"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index("gyms_city_id_idx").on(t.city_id),
    pgPolicy("allow public read", { for: "select", using: sql`true` }),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gym_id: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    display_order: integer("display_order").notNull().default(0),
    is_active: boolean("is_active").notNull().default(true),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index("sections_gym_id_idx").on(t.gym_id),
    pgPolicy("allow public read", { for: "select", using: sql`true` }),
  ],
);

// profiles is a public mirror of auth.users (0002). id is a plain uuid here —
// the FK to auth.users lives only in the DB until the auth cutover.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    is_admin: boolean("is_admin").notNull().default(false),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  () => [
    pgPolicy("allow public read", { for: "select", using: sql`true` }),
    // 0010: a self-update may never flip is_admin (privilege-escalation guard).
    pgPolicy("allow own update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = id`,
      withCheck: sql`${authUid} = id and is_admin = false`,
    }),
  ],
);

export const resets = pgTable(
  "resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    section_id: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    reset_on: date("reset_on", { mode: "string" }).notNull(),
    notes: text("notes"),
    logged_by: text("logged_by"),
    boulders_reset: integer("boulders_reset"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    index("resets_section_id_idx").on(t.section_id),
    index("resets_reset_on_desc_idx").on(t.reset_on),
    check("resets_boulders_reset_positive", sql`boulders_reset is null or boulders_reset > 0`),
    pgPolicy("allow public read", { for: "select", using: sql`true` }),
    pgPolicy("allow admin insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from profiles where id = ${authUid} and is_admin = true)`,
    }),
    pgPolicy("allow admin delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from profiles where id = ${authUid} and is_admin = true)`,
    }),
  ],
);

export const visits = pgTable(
  "visits",
  {
    user_id: uuid("user_id").notNull(),
    gym_slug: text("gym_slug").notNull(),
    visited_on: date("visited_on", { mode: "string" }).notNull(),
    created_at: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.user_id, t.gym_slug, t.visited_on] }),
    index("visits_user_idx").on(t.user_id),
    pgPolicy("own visits read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = user_id`,
    }),
    pgPolicy("own visits insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = user_id`,
    }),
    pgPolicy("own visits delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = user_id`,
    }),
  ],
);

export const resetSubmissions = pgTable(
  "reset_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    section_id: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    reset_on: date("reset_on", { mode: "string" }).notNull(),
    notes: text("notes"),
    boulders_reset: integer("boulders_reset"),
    submitted_by: uuid("submitted_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: submissionStatus("status").notNull().default("pending"),
    reviewed_by: uuid("reviewed_by").references(() => profiles.id),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    reset_id: uuid("reset_id").references(() => resets.id, { onDelete: "set null" }),
    photo_path: text("photo_path"),
    created_at: createdAt(),
  },
  (t) => [
    index("reset_submissions_status_idx").on(t.status, t.created_at),
    index("reset_submissions_user_idx").on(t.submitted_by, t.created_at),
    check(
      "reset_submissions_boulders_reset_positive",
      sql`boulders_reset is null or boulders_reset > 0`,
    ),
    pgPolicy("own submissions read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = submitted_by`,
    }),
    // The pending cap is enforced by the SECURITY DEFINER helper
    // current_user_pending_submission_count() (0007) to avoid RLS recursion.
    pgPolicy("own submissions insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = submitted_by and status = 'pending' and current_user_pending_submission_count() < 5`,
    }),
    pgPolicy("admin submissions read", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from profiles where id = ${authUid} and is_admin = true)`,
    }),
    pgPolicy("admin submissions update", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from profiles where id = ${authUid} and is_admin = true)`,
    }),
  ],
);

// ── Relations (for the relational query builder) ───────────────────────────

export const citiesRelations = relations(cities, ({ many }) => ({
  gyms: many(gyms),
}));

export const gymsRelations = relations(gyms, ({ one, many }) => ({
  city: one(cities, { fields: [gyms.city_id], references: [cities.id] }),
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  gym: one(gyms, { fields: [sections.gym_id], references: [gyms.id] }),
  resets: many(resets),
  submissions: many(resetSubmissions),
}));

export const resetsRelations = relations(resets, ({ one }) => ({
  section: one(sections, { fields: [resets.section_id], references: [sections.id] }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  submissions: many(resetSubmissions),
}));

export const resetSubmissionsRelations = relations(resetSubmissions, ({ one }) => ({
  section: one(sections, { fields: [resetSubmissions.section_id], references: [sections.id] }),
  submitter: one(profiles, { fields: [resetSubmissions.submitted_by], references: [profiles.id] }),
}));
