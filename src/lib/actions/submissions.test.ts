import { beforeEach, describe, expect, it, vi } from "vitest";

// Guards the UX-layer pending-submission cap in suggestReset: a user with 5
// pending suggestions gets a friendly message and no insert is attempted (the
// RLS cap policy is still the backstop, but this is the nice error path).

const h = vi.hoisted(() => ({
  pending: 0,
  insertRows: [{ id: "sub-123" }] as { id: string }[],
  inserted: false,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const tx = {
  insert: () => ({
    values: () => ({
      returning: () => {
        h.inserted = true;
        return Promise.resolve(h.insertRows);
      },
    }),
  }),
};

vi.mock("@/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => Promise.resolve([{ pending: h.pending }]) }),
    }),
  },
  rlsDb: async (_claims: unknown, fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
}));

vi.mock("@/lib/auth", () => ({
  getAuthedUser: async () => ({
    user: { id: "u1", email: "u@example.com" },
    userId: "u1",
    claims: { sub: "u1", role: "authenticated" },
  }),
  getSupabase: async () => ({
    storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) },
  }),
}));

import { suggestReset } from "./submissions";

function form(entries: Array<[string, string]>): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

const validEntries: Array<[string, string]> = [
  ["section_id", "sec-1"],
  ["reset_on", "2026-05-01"],
];

beforeEach(() => {
  h.pending = 0;
  h.inserted = false;
});

describe("suggestReset pending cap", () => {
  it("blocks a 6th pending submission with a friendly message and no insert", async () => {
    h.pending = 5;
    const result = await suggestReset(null, form(validEntries));

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toMatch(/5 pending/);
    expect(h.inserted).toBe(false);
  });

  it("inserts when under the cap and returns the new submission id", async () => {
    h.pending = 4;
    const result = await suggestReset(null, form(validEntries));

    expect(result).toMatchObject({ success: true });
    expect(h.inserted).toBe(true);
    expect((result as { data: { submissionId: string } }).data.submissionId).toBe("sub-123");
  });
});
