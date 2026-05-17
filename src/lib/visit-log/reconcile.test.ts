import { describe, expect, it } from "vitest";
import { reconcile } from "./reconcile";

describe("reconcile", () => {
  it("returns nulls when local and remote are already equal", () => {
    const r = reconcile({ a: ["2026-05-01"] }, { a: ["2026-05-01"] });
    expect(r.applyLocal).toBeNull();
    expect(r.push).toBeNull();
  });

  it("returns nulls when both are empty", () => {
    const r = reconcile({}, {});
    expect(r.applyLocal).toBeNull();
    expect(r.push).toBeNull();
  });

  it("pushes local rows the server doesn't have", () => {
    const r = reconcile({ a: ["2026-05-01"] }, {});
    expect(r.applyLocal).toBeNull();
    expect(r.push).toEqual({ a: ["2026-05-01"] });
  });

  it("applies remote rows local doesn't have", () => {
    const r = reconcile({}, { a: ["2026-05-01"] });
    expect(r.applyLocal).toEqual({ a: ["2026-05-01"] });
    expect(r.push).toBeNull();
  });

  it("unions disjoint dates within a single gym, applies+pushes", () => {
    const r = reconcile({ a: ["2026-05-01"] }, { a: ["2026-05-03"] });
    expect(r.applyLocal).toEqual({ a: ["2026-05-01", "2026-05-03"] });
    expect(r.push).toEqual({ a: ["2026-05-01", "2026-05-03"] });
  });

  it("unions across different gyms", () => {
    const r = reconcile({ a: ["2026-05-01"] }, { b: ["2026-05-02"] });
    expect(r.applyLocal).toEqual({ a: ["2026-05-01"], b: ["2026-05-02"] });
    expect(r.push).toEqual({ a: ["2026-05-01"], b: ["2026-05-02"] });
  });

  it("dedupes overlapping dates", () => {
    const r = reconcile(
      { a: ["2026-05-01", "2026-05-02"] },
      { a: ["2026-05-02", "2026-05-03"] },
    );
    expect(r.applyLocal).toEqual({ a: ["2026-05-01", "2026-05-02", "2026-05-03"] });
    expect(r.push).toEqual({ a: ["2026-05-01", "2026-05-02", "2026-05-03"] });
  });

  it("sorts dates ascending in the union", () => {
    const r = reconcile({ a: ["2026-05-03"] }, { a: ["2026-05-01"] });
    expect(r.applyLocal).toEqual({ a: ["2026-05-01", "2026-05-03"] });
  });

  it("when local already covers remote, applyLocal is null but push fires (server is missing rows)", () => {
    const r = reconcile({ a: ["2026-05-01", "2026-05-02"] }, { a: ["2026-05-01"] });
    expect(r.applyLocal).toBeNull();
    expect(r.push).toEqual({ a: ["2026-05-01", "2026-05-02"] });
  });

  it("when remote already covers local, applyLocal fires but push is null (local is missing rows)", () => {
    const r = reconcile({ a: ["2026-05-01"] }, { a: ["2026-05-01", "2026-05-02"] });
    expect(r.applyLocal).toEqual({ a: ["2026-05-01", "2026-05-02"] });
    expect(r.push).toBeNull();
  });
});
