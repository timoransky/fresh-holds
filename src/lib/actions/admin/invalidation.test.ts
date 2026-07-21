import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for the cache-stale-reset fix (ADR-0001, Update 2026-07-02).
//
// Admin writes that change publicly-visible gym/reset data MUST invalidate the
// "gyms" cache tag with `{ expire: 0 }` — immediate expiration, so the next
// request is a blocking cache miss that recomputes fresh (read-your-own-writes).
// The old `revalidateTag("gyms", "max")` was stale-while-revalidate: it served
// the OLD payload on reload, so a freshly logged reset didn't show up. Do not
// let anyone silently revert `{ expire: 0 }` back to `"max"` — that's the exact
// bug this branch fixed.

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

// A chainable, thenable Supabase query-builder stub. Every intermediate method
// (`insert`/`update`/`select`/`eq`) returns the builder, so any chain length
// works; awaiting the builder resolves `{ error: null }` (the direct-await
// terminals like `.insert(rows)` and `.update(...).eq(...)`); `.single()`
// resolves the configured `{ data }` (the `.select().single()` terminals).
function makeBuilder(single: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["insert", "update", "select", "eq"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(single));
  builder.then = (onFulfilled: (v: { error: null }) => unknown) => onFulfilled({ error: null });
  return builder;
}

// A pending submission for approveSubmission's initial read.
const pendingSubmission = {
  id: "sub-1",
  section_id: "sec-1",
  reset_on: "2026-05-01",
  notes: null,
  boulders_reset: null,
  status: "pending",
};

const submissionsBuilder = makeBuilder({ data: pendingSubmission, error: null });
const resetsBuilder = makeBuilder({ data: { id: "reset-1" }, error: null });

const supabase = {
  from: vi.fn((table: string) =>
    table === "reset_submissions" ? submissionsBuilder : resetsBuilder,
  ),
};

vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({
    user: { id: "admin-1", email: "admin@example.com" },
    supabase,
  }),
}));

import { submitReset, updateResetDate } from "./resets";
import { approveSubmission, rejectSubmission } from "./submissions";

const EXPECTED = ["gyms", { expire: 0 }] as const;

function form(entries: Array<[string, string]>): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

beforeEach(() => {
  revalidateTag.mockClear();
  revalidatePath.mockClear();
});

describe("admin write cache invalidation", () => {
  it("submitReset invalidates gyms with { expire: 0 } (blocking, not stale-while-revalidate)", async () => {
    const fd = form([
      ["section_ids", "sec-1"],
      ["reset_on", "2026-05-01"],
    ]);
    const result = await submitReset(null, fd);

    expect(result).toMatchObject({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith(...EXPECTED);
    expect(revalidateTag).not.toHaveBeenCalledWith("gyms", "max");
  });

  it("updateResetDate invalidates gyms with { expire: 0 }", async () => {
    const fd = form([
      ["reset_id", "reset-1"],
      ["reset_on", "2026-05-01"],
    ]);
    const result = await updateResetDate(null, fd);

    expect(result).toMatchObject({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith(...EXPECTED);
    expect(revalidateTag).not.toHaveBeenCalledWith("gyms", "max");
  });

  it("approveSubmission invalidates gyms with { expire: 0 }", async () => {
    const result = await approveSubmission(null, form([["submission_id", "sub-1"]]));

    expect(result).toMatchObject({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith(...EXPECTED);
    expect(revalidateTag).not.toHaveBeenCalledWith("gyms", "max");
  });

  it("rejectSubmission does not invalidate the public gyms cache (nothing public changed)", async () => {
    const result = await rejectSubmission(null, form([["submission_id", "sub-1"]]));

    expect(result).toMatchObject({ success: true });
    expect(revalidateTag).not.toHaveBeenCalledWith("gyms", expect.anything());
  });
});
