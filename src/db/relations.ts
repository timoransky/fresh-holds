import { relations } from "drizzle-orm";
import { cities, gyms, profiles, reset_submissions, resets, sections } from "./schema";

export const citiesRelations = relations(cities, ({ many }) => ({
  gyms: many(gyms),
}));

export const gymsRelations = relations(gyms, ({ one, many }) => ({
  city: one(cities, { fields: [gyms.city_id], references: [cities.id] }),
  sections: many(sections),
  submissions: many(reset_submissions),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  gym: one(gyms, { fields: [sections.gym_id], references: [gyms.id] }),
  resets: many(resets),
  submissions: many(reset_submissions),
}));

export const resetsRelations = relations(resets, ({ one }) => ({
  section: one(sections, { fields: [resets.section_id], references: [sections.id] }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  submissions: many(reset_submissions, { relationName: "submitter" }),
}));

export const resetSubmissionsRelations = relations(reset_submissions, ({ one }) => ({
  gym: one(gyms, { fields: [reset_submissions.gym_id], references: [gyms.id] }),
  section: one(sections, { fields: [reset_submissions.section_id], references: [sections.id] }),
  submitter: one(profiles, {
    fields: [reset_submissions.submitted_by],
    references: [profiles.id],
    relationName: "submitter",
  }),
}));
