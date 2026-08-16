"use server";

import { and, eq } from "drizzle-orm";
import { rlsDb } from "@/db/client";
import { visits } from "@/db/schema";
import { getAuthedUser } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";
import type { VisitHistory } from "@/lib/visit-log";

export async function pullMyVisits(): Promise<VisitHistory> {
  const authed = await getAuthedUser();
  if (!authed) return {};

  const rows = await rlsDb(authed.claims, (tx) =>
    tx
      .select({ gym_slug: visits.gym_slug, visited_on: visits.visited_on })
      .from(visits)
      .where(eq(visits.user_id, authed.userId)),
  );

  const history: VisitHistory = {};
  for (const row of rows) {
    (history[row.gym_slug] ??= []).push(row.visited_on);
  }
  for (const slug of Object.keys(history)) {
    history[slug] = [...new Set(history[slug])].sort();
  }
  return history;
}

// Additive upsert. Never deletes — safe to call with the client's union of
// (local ∪ remote) on first authed mount. No return value; callers already
// have the data they wrote.
export async function pushMyVisits(history: VisitHistory): Promise<void> {
  const authed = await getAuthedUser();
  if (!authed) return;

  const rows: { user_id: string; gym_slug: string; visited_on: string }[] = [];
  for (const [slug, dates] of Object.entries(history)) {
    if (typeof slug !== "string" || !slug) continue;
    for (const date of dates) {
      if (typeof date !== "string" || !ISO_DATE_RE.test(date)) continue;
      rows.push({ user_id: authed.userId, gym_slug: slug, visited_on: date });
    }
  }

  if (rows.length === 0) return;

  await rlsDb(authed.claims, (tx) => tx.insert(visits).values(rows).onConflictDoNothing());
}

export async function setVisitsForGym(gymSlug: string, dates: string[]): Promise<void> {
  const authed = await getAuthedUser();
  if (!authed) return;
  if (!gymSlug) return;

  const clean = [...new Set(dates.filter((d) => ISO_DATE_RE.test(d)))];

  await rlsDb(authed.claims, async (tx) => {
    await tx
      .delete(visits)
      .where(and(eq(visits.user_id, authed.userId), eq(visits.gym_slug, gymSlug)));

    if (clean.length === 0) return;

    await tx.insert(visits).values(
      clean.map((date) => ({
        user_id: authed.userId,
        gym_slug: gymSlug,
        visited_on: date,
      })),
    );
  });
}
