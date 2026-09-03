import { beforeEach, describe, expect, it, vi } from "vitest";

// A scraped submission can arrive with no sector — the story said "6 new
// boulders" and named no wall (ADR-0006). `resets.section_id` is NOT NULL, so
// the admin picks the sector at approval time and THIS is where that choice is
// checked. The gym check is the part that matters: the section id comes from a
// form, so a client could name a sector belonging to a different gym and file a
// reset against the wrong one.

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

type Submission = {
  id: string;
  section_id: string | null;
  gym_id: string;
  reset_on: string;
  notes: string | null;
  boulders_reset: number | null;
  status: string;
};

const state = {
  submission: null as Submission | null,
  // Sections keyed by `${id}:${gym_id}` — a lookup only resolves when both the
  // id and the gym match, mirroring the `.eq("id").eq("gym_id")` filter.
  sections: new Set<string>(),
  resetInserts: [] as Record<string, unknown>[],
  submissionUpdates: [] as Record<string, unknown>[],
};

// Chainable query-builder stub: filters are recorded, terminals resolve from
// `state`. Awaiting the builder (the bare `.update().eq()` terminal) succeeds.
function builder(table: string) {
  const filters: Record<string, unknown> = {};
  const self: Record<string, unknown> = {
    select: () => self,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return self;
    },
    insert: (payload: Record<string, unknown>) => {
      if (table === "resets") state.resetInserts.push(payload);
      return self;
    },
    update: (payload: Record<string, unknown>) => {
      if (table === "reset_submissions") state.submissionUpdates.push(payload);
      return self;
    },
    single: () => {
      if (table === "reset_submissions") {
        return Promise.resolve(
          state.submission
            ? { data: state.submission, error: null }
            : { data: null, error: { message: "not found" } },
        );
      }
      return Promise.resolve({ data: { id: "reset-1" }, error: null });
    },
    maybeSingle: () => {
      const key = `${filters.id}:${filters.gym_id}`;
      return Promise.resolve({
        data: state.sections.has(key) ? { id: filters.id } : null,
        error: null,
      });
    },
    then: (onFulfilled: (v: { error: null }) => unknown) => onFulfilled({ error: null }),
  };
  return self;
}

vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({
    user: { id: "admin-1", email: "admin@example.com" },
    supabase: { from: (table: string) => builder(table) },
  }),
}));

import { approveSubmission } from "./submissions";

function form(entries: Array<[string, string]>): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

const sectionless: Submission = {
  id: "sub-1",
  section_id: null,
  gym_id: "gym-spot",
  reset_on: "2026-09-02",
  notes: "6 new joker problems",
  boulders_reset: 6,
  status: "pending",
};

beforeEach(() => {
  state.submission = { ...sectionless };
  state.sections = new Set(["sec-cave:gym-spot"]);
  state.resetInserts = [];
  state.submissionUpdates = [];
});

describe("approveSubmission — sectionless submissions", () => {
  it("refuses to approve without a sector", async () => {
    const result = await approveSubmission(null, form([["submission_id", "sub-1"]]));

    expect(result).toMatchObject({ error: "Pick a sector to approve this suggestion." });
    expect(state.resetInserts).toEqual([]);
  });

  it("refuses a sector that belongs to another gym", async () => {
    const result = await approveSubmission(
      null,
      form([
        ["submission_id", "sub-1"],
        ["section_id", "sec-someone-elses"],
      ]),
    );

    expect(result).toMatchObject({ error: "That sector doesn't belong to this gym." });
    expect(state.resetInserts).toEqual([]);
  });

  it("logs the reset on the sector the admin picked, and records it on the submission", async () => {
    const result = await approveSubmission(
      null,
      form([
        ["submission_id", "sub-1"],
        ["section_id", "sec-cave"],
      ]),
    );

    expect(result).toMatchObject({ success: true });
    expect(state.resetInserts).toEqual([
      {
        section_id: "sec-cave",
        reset_on: "2026-09-02",
        notes: "6 new joker problems",
        boulders_reset: 6,
        logged_by: "admin@example.com",
      },
    ]);
    expect(state.submissionUpdates[0]).toMatchObject({
      status: "approved",
      section_id: "sec-cave",
      reset_id: "reset-1",
    });
  });

  it("ignores a form-supplied sector when the submission already has one", async () => {
    state.submission = { ...sectionless, section_id: "sec-slab" };

    const result = await approveSubmission(
      null,
      form([
        ["submission_id", "sub-1"],
        ["section_id", "sec-cave"],
      ]),
    );

    expect(result).toMatchObject({ success: true });
    expect(state.resetInserts[0]).toMatchObject({ section_id: "sec-slab" });
  });
});
