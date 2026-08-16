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

// Fake transaction handed to the rlsDb wrapper. Every write terminal resolves;
// `execute` returns one row so approveSubmission's CTE reads as "one row
// approved" (non-empty ⇒ success). The SQL/column expressions passed in are
// real (built from the schema) but ignored here.
const tx = {
  insert: () => ({
    values: () => Promise.resolve(undefined),
  }),
  update: () => ({
    set: () => ({ where: () => Promise.resolve(undefined) }),
  }),
  execute: () => Promise.resolve({ rows: [{ id: "reset-1" }] }),
};

vi.mock("@/db/client", () => ({
  db: {},
  rlsDb: async (_claims: unknown, fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({
    user: { id: "admin-1", email: "admin@example.com" },
    userId: "admin-1",
    claims: { sub: "admin-1", role: "authenticated" },
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
