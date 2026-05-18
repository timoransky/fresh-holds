import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rankGyms, scoreGym } from "@/lib/freshness";
import type { GymWithResets, Reset } from "@/lib/types";

// All scenarios pin "now" to this date. Dates in the fixtures are relative to it
// (e.g. "today minus 3 days" = 2026-05-08).
const NOW = new Date("2026-05-11T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

let resetCounter = 0;

type ResetSpec = {
  daysAgo: number;
  section?: string;
  boulders?: number;
};

function makeReset(spec: ResetSpec): Reset {
  return {
    id: `r${++resetCounter}`,
    reset_on: daysAgo(spec.daysAgo),
    notes: null,
    boulders_reset: spec.boulders ?? null,
    section_id: spec.section ? `s-${spec.section}` : null,
    section_name: spec.section ?? null,
  };
}

function makeGym(slug: string, resets: ResetSpec[] = []): GymWithResets {
  // The server query returns resets newest-first.
  const sorted = [...resets].sort((a, b) => a.daysAgo - b.daysAgo).map(makeReset);
  return {
    id: `g-${slug}`,
    slug,
    name: slug,
    neighborhood: null,
    website_url: null,
    instagram_handle: null,
    city_id: null,
    resets: sorted,
  };
}

// ---------- ranking ----------

describe("rankGyms — no visits", () => {
  it("ranks gyms by fresh reset count (no visit ⇒ everything fresh)", () => {
    const a = makeGym("a", [{ daysAgo: 1 }, { daysAgo: 3 }, { daysAgo: 5 }]);
    const b = makeGym("b", [{ daysAgo: 2 }]);
    const c = makeGym("c", [{ daysAgo: 4 }, { daysAgo: 6 }]);

    const r = rankGyms([b, a, c], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.heroHasData).toBe(true);
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["c", "b"]);
    expect(r.noDataExtras).toEqual([]);
  });

  it("a never-visited gym treats every reset as fresh", () => {
    const a = makeGym("a", [
      { daysAgo: 1, section: "Slab" },
      { daysAgo: 2, section: "Overhang" },
    ]);

    const r = rankGyms([a], {});

    expect(r.hero?.freshResetCount).toBe(2);
    expect(r.hero?.lastVisited).toBeNull();
  });
});

describe("rankGyms — with a recent visit", () => {
  it("a gym you visited AFTER its last reset drops below an unvisited gym", () => {
    const a = makeGym("a", [{ daysAgo: 3 }, { daysAgo: 4 }, { daysAgo: 5 }]);
    const b = makeGym("b", [{ daysAgo: 3 }]);

    const r = rankGyms([a, b], { a: daysAgo(1) });

    expect(r.hero?.gym.slug).toBe("b");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["a"]);
  });

  it("a visit just before a fresh reset doesn't suppress that reset", () => {
    const a = makeGym("a", [{ daysAgo: 2 }, { daysAgo: 5 }]);
    const r = rankGyms([a], { a: daysAgo(4) });
    expect(r.hero?.freshResetCount).toBe(1);
  });

  it("visit within JUST_VISITED_DAYS (≤2) forces tier STALE even with fresh resets", () => {
    const a = makeGym("a", [{ daysAgo: 0 }]);
    const r = rankGyms([a], { a: daysAgo(1) });
    expect(r.hero?.tier.key).toBe("stale");
  });

  it("visit older than a week gives full novelty weight", () => {
    const a = makeGym("a", [{ daysAgo: 2 }, { daysAgo: 3 }]);
    const b = makeGym("b", [{ daysAgo: 1 }]);

    const r = rankGyms([a, b], { a: daysAgo(8), b: daysAgo(8) });

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });
});

describe("rankGyms — tiebreakers", () => {
  it("equal novelty scores: most recent reset date wins", () => {
    const a = makeGym("a", [{ daysAgo: 5 }]);
    const b = makeGym("b", [{ daysAgo: 1 }]);
    const r = rankGyms([a, b], {});
    expect(r.hero?.gym.slug).toBe("b");
  });
});

describe("rankGyms — mixed reset data", () => {
  it("gyms with no resets go to noDataExtras, never runnersUp", () => {
    const a = makeGym("a", [{ daysAgo: 1 }]);
    const empty = makeGym("empty");

    const r = rankGyms([empty, a], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp).toEqual([]);
    expect(r.noDataExtras.map((g) => g.gym.slug)).toEqual(["empty"]);
  });

  it("when EVERY gym has no data, the first becomes hero with heroHasData=false", () => {
    const r = rankGyms([makeGym("a"), makeGym("b")], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.heroHasData).toBe(false);
    expect(r.hero?.tier.key).toBe("unknown");
  });
});

describe("attribution variants — all coexist on the same gym", () => {
  it("section-attributed reset with a count", () => {
    const a = makeGym("a", [{ daysAgo: 1, section: "Slab", boulders: 6 }]);
    const r = scoreGym(a, null);
    expect(r.freshResetCount).toBe(1);
    expect(r.resets[0].section_name).toBe("Slab");
    expect(r.resets[0].boulders_reset).toBe(6);
  });

  it("section-attributed reset without a count", () => {
    const a = makeGym("a", [{ daysAgo: 1, section: "Slab" }]);
    const r = scoreGym(a, null);
    expect(r.freshResetCount).toBe(1);
    expect(r.resets[0].section_name).toBe("Slab");
    expect(r.resets[0].boulders_reset).toBeNull();
  });

  it("gym-wide reset with a count (Vertigo's '2+4+11+1' story)", () => {
    const a = makeGym("a", [{ daysAgo: 1, boulders: 18 }]);
    const r = scoreGym(a, null);
    expect(r.freshResetCount).toBe(1);
    expect(r.resets[0].section_name).toBeNull();
    expect(r.resets[0].boulders_reset).toBe(18);
  });

  it("gym-wide reset without a count (Spot's 'nové bouldre' story)", () => {
    const a = makeGym("a", [{ daysAgo: 1 }]);
    const r = scoreGym(a, null);
    expect(r.freshResetCount).toBe(1);
    expect(r.resets[0].section_name).toBeNull();
    expect(r.resets[0].boulders_reset).toBeNull();
  });

  it("multiple attribution styles on one gym add up to the same fresh count", () => {
    const a = makeGym("a", [
      { daysAgo: 1, section: "Slab", boulders: 6 },
      { daysAgo: 2, section: "Cave" },
      { daysAgo: 3, boulders: 12 },
      { daysAgo: 4 },
    ]);
    const r = scoreGym(a, null);
    expect(r.freshResetCount).toBe(4);
  });
});

describe("scoreGym — narrative", () => {
  it("no reset data → check-yourself line", () => {
    expect(scoreGym(makeGym("a"), null).narrative).toBe(
      "No reset data - you have to check for yourself.",
    );
  });

  it("never-visited + 1 reset → 'Never visited - 1 recent drop, latest …'", () => {
    const a = makeGym("a", [{ daysAgo: 2 }]);
    expect(scoreGym(a, null).narrative).toBe("Never visited - 1 recent drop, latest 2 days ago.");
  });

  it("never-visited + multiple resets → plural 'drops'", () => {
    const a = makeGym("a", [{ daysAgo: 2 }, { daysAgo: 3 }]);
    expect(scoreGym(a, null).narrative).toBe("Never visited - 2 recent drops, latest 2 days ago.");
  });

  it("visited today with no fresh resets → today copy", () => {
    const a = makeGym("a", [{ daysAgo: 2 }]);
    expect(scoreGym(a, daysAgo(0)).narrative).toBe("Nothing new since you visited today.");
  });

  it("visited days ago with no fresh resets → relative-day copy", () => {
    const a = makeGym("a", [{ daysAgo: 5 }]);
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "Nothing new since your last visit 3 days ago.",
    );
  });

  it("visited with fresh resets → 'N fresh drops since your last visit, latest …'", () => {
    const a = makeGym("a", [{ daysAgo: 1 }, { daysAgo: 2 }, { daysAgo: 8 }]);
    expect(scoreGym(a, daysAgo(5)).narrative).toBe(
      "2 fresh drops since your last visit, latest 1 day ago.",
    );
  });
});

describe("scoreGym — badge", () => {
  it("plural → 'fresh drops'", () => {
    const a = makeGym("a", [{ daysAgo: 1 }, { daysAgo: 2 }]);
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(2);
    expect(s.badgeText).toBe("fresh drops");
  });

  it("singular → 'fresh drop'", () => {
    const a = makeGym("a", [{ daysAgo: 1 }]);
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(1);
    expect(s.badgeText).toBe("fresh drop");
  });

  it("no reset data → null count + empty text (badge renders em-dash)", () => {
    const s = scoreGym(makeGym("a"), null);
    expect(s.hasResetData).toBe(false);
    expect(s.badgeCount).toBeNull();
    expect(s.badgeText).toBe("");
  });

  it("visited, nothing fresh → 0 count (tier becomes STALE)", () => {
    const a = makeGym("a", [{ daysAgo: 5 }]);
    const s = scoreGym(a, daysAgo(3));
    expect(s.badgeCount).toBe(0);
    expect(s.badgeText).toBe("fresh drops");
  });
});

describe("scoreGym — ordering", () => {
  it("resets are newest-first", () => {
    const a = makeGym("a", [{ daysAgo: 5 }, { daysAgo: 1 }, { daysAgo: 3 }]);
    const r = scoreGym(a, null);
    expect(r.resets.map((x) => x.reset_on)).toEqual([daysAgo(1), daysAgo(3), daysAgo(5)]);
  });

  it("mostRecentResetISO reflects the newest reset even when nothing's fresh", () => {
    const a = makeGym("a", [{ daysAgo: 3 }, { daysAgo: 1 }]);
    const s = scoreGym(a, daysAgo(0));
    expect(s.mostRecentFreshISO).toBeNull();
    expect(s.mostRecentResetISO).toBe(daysAgo(1));
  });
});

describe("rankGyms — edge cases", () => {
  it("empty gyms list returns hero=null", () => {
    const r = rankGyms([], {});
    expect(r.hero).toBeNull();
  });

  it("a single gym with data becomes hero with no runners-up", () => {
    const r = rankGyms([makeGym("a", [{ daysAgo: 2 }])], {});
    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp).toEqual([]);
  });
});
