import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rankGyms, scoreGym } from "@/lib/freshness";
import type { FreshnessMode, GymWithSections, Reset, Section } from "@/lib/types";

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
let sectionCounter = 0;

function makeReset(reset_on: string, boulders_reset: number | null = null): Reset {
  return { id: `r${++resetCounter}`, reset_on, notes: null, boulders_reset };
}

function makeSection(name: string, resets: Reset[], display_order = 0): Section {
  // mostRecentReset reads resets[0] — the server query returns them ordered
  // newest-first, so the fixture mirrors that.
  const sorted = [...resets].sort((a, b) => b.reset_on.localeCompare(a.reset_on));
  return {
    id: `s${++sectionCounter}`,
    name,
    display_order,
    is_active: true,
    resets: sorted,
  };
}

type GymInput = {
  slug: string;
  mode?: FreshnessMode;
  // For "sections" mode: each entry is one section with its reset dates.
  // For "count" mode: a single section ("all") receives all resets as
  //   [date, boulderCount] tuples.
  sections?: Record<string, string[]>;
  countResets?: Array<[date: string, boulders: number]>;
};

function makeGym({ slug, mode = "sections", sections, countResets }: GymInput): GymWithSections {
  const sectionList: Section[] =
    mode === "count"
      ? [
          makeSection(
            "all",
            (countResets ?? []).map(([date, b]) => makeReset(date, b)),
          ),
        ]
      : Object.entries(sections ?? {}).map(([name, dates], i) =>
          makeSection(
            name,
            dates.map((d) => makeReset(d)),
            i,
          ),
        );

  return {
    id: `g-${slug}`,
    slug,
    name: slug,
    neighborhood: null,
    website_url: null,
    instagram_handle: null,
    city_id: null,
    freshness_mode: mode,
    sections: sectionList,
  };
}

// ---------- scenarios ----------

describe("rankGyms — no visits", () => {
  it("ranks gyms by total fresh reset count (no visit ⇒ everything is fresh)", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1), daysAgo(3), daysAgo(5)] } });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(2)] } });
    const c = makeGym({ slug: "c", sections: { Slab: [daysAgo(4), daysAgo(6)] } });

    const r = rankGyms([b, a, c], {});

    expect(r.hero?.gym.slug).toBe("a"); // 3 fresh resets
    expect(r.heroHasData).toBe(true);
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["c", "b"]); // 2, then 1
    expect(r.noDataExtras).toEqual([]);
  });

  it("a never-visited gym gets a 100%/all-sectors-fresh label", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });

    const r = rankGyms([a], {});

    expect(r.hero?.label).toEqual({ kind: "sections", count: 2, total: 2 });
    expect(r.hero?.lastVisited).toBeNull();
  });
});

describe("rankGyms — with a recent visit", () => {
  it("a gym you visited AFTER its last reset drops below an unvisited gym with fresh resets", () => {
    // gymA has 3 resets but user visited yesterday → no fresh resets remain
    // gymB has 1 reset 3 days ago, never visited → 1 fresh reset
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(3), daysAgo(4), daysAgo(5)] },
    });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(3)] } });

    const r = rankGyms([a, b], { a: daysAgo(1) });

    expect(r.hero?.gym.slug).toBe("b");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["a"]);
  });

  it("a visit just before a fresh reset doesn't suppress that reset", () => {
    // visited 4 days ago; one reset 2 days ago is fresh, another 5 days ago is stale
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2), daysAgo(5)] },
    });

    const r = rankGyms([a], { a: daysAgo(4) });

    expect(r.hero?.label).toEqual({ kind: "sections", count: 1, total: 1 });
  });

  it("visit within JUST_VISITED_DAYS (≤2) forces tier STALE even if there are fresh resets", () => {
    // visited yesterday, one fresh reset today
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(0)] } });

    const r = rankGyms([a], { a: daysAgo(1) });

    expect(r.hero?.tier.key).toBe("stale");
  });

  it("visit older than a week gives full novelty weight; ranking matches no-visit case", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2), daysAgo(3)] },
    });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(1)] } });

    const r = rankGyms([a, b], { a: daysAgo(8), b: daysAgo(8) });

    // a has 2 fresh, b has 1 → a first
    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });
});

describe("rankGyms — tiebreakers", () => {
  it("equal novelty scores: most recent fresh reset date wins", () => {
    // Both have 1 fresh reset; b's reset is more recent
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(1)] } });

    const r = rankGyms([a, b], {});

    expect(r.hero?.gym.slug).toBe("b");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["a"]);
  });
});

describe("rankGyms — mixed reset data", () => {
  it("gyms with no reset data go to noDataExtras, never to runnersUp", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1)] } });
    const empty = makeGym({ slug: "empty", sections: { Slab: [] } });

    const r = rankGyms([empty, a], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp).toEqual([]);
    expect(r.noDataExtras.map((g) => g.gym.slug)).toEqual(["empty"]);
  });

  it("when EVERY gym lacks reset data, the first becomes hero with heroHasData=false", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    const b = makeGym({ slug: "b", sections: { Slab: [] } });

    const r = rankGyms([a, b], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.heroHasData).toBe(false);
    expect(r.hero?.label).toBeNull();
    expect(r.hero?.tier.key).toBe("unknown");
  });
});

describe("rankGyms — count mode", () => {
  it("count-mode gyms are ranked by the same novelty score as sections-mode gyms", () => {
    // count-mode gym with 3 resets, sections-mode with 2 resets
    const count = makeGym({
      slug: "count",
      mode: "count",
      countResets: [
        [daysAgo(1), 10],
        [daysAgo(3), 5],
        [daysAgo(5), 8],
      ],
    });
    const sections = makeGym({
      slug: "sections",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(4)] },
    });

    const r = rankGyms([sections, count], {});

    expect(r.hero?.gym.slug).toBe("count");
    expect(r.hero?.label).toEqual({ kind: "boulders", count: 23 });
  });

  it("count-mode labels sum new boulders since the user's last visit only", () => {
    const count = makeGym({
      slug: "count",
      mode: "count",
      countResets: [
        [daysAgo(1), 10],
        [daysAgo(5), 7],
        [daysAgo(8), 4],
      ],
    });

    // visited 6 days ago → only resets from days 1 and 5 count
    const r = rankGyms([count], { count: daysAgo(6) });

    expect(r.hero?.label).toEqual({ kind: "boulders", count: 17 });
  });
});

describe("rankGyms — edge cases", () => {
  it("empty gyms list returns hero=null", () => {
    const r = rankGyms([], {});
    expect(r.hero).toBeNull();
    expect(r.runnersUp).toEqual([]);
    expect(r.noDataExtras).toEqual([]);
  });

  it("a single gym with data becomes hero with no runners-up", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    const r = rankGyms([a], {});

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp).toEqual([]);
    expect(r.noDataExtras).toEqual([]);
  });
});

describe("scoreGym — narrative", () => {
  it("no reset data → check-yourself line", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    expect(scoreGym(a, null).narrative).toBe("No reset data - you have to check for yourself.");
  });

  it("never-visited + single section → singular sector copy", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - one sector is fresh, last reset 2 days ago.",
    );
  });

  it("never-visited + multiple sections → 'all N sectors fresh' copy", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(3)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - all 2 sectors fresh, last reset 2 days ago.",
    );
  });

  it("never-visited + count mode → 'N fresh boulders' copy", () => {
    const a = makeGym({
      slug: "a",
      mode: "count",
      countResets: [
        [daysAgo(1), 7],
        [daysAgo(3), 5],
      ],
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 12 fresh boulders, last reset 1 day ago.",
    );
  });

  it("visited today with no fresh resets → 'nothing new since you visited today'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    expect(scoreGym(a, daysAgo(0)).narrative).toBe("Nothing new since you visited today.");
  });

  it("visited days ago with no fresh resets → 'nothing new since your last visit Ndays ago'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe("Nothing new since your last visit 3 days ago.");
  });

  it("visited + sections mode + fresh resets → 'X of Y sectors fresh, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(5)] },
    });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe("1 of 2 sectors fresh, last reset 1 day ago.");
  });

  it("visited + count mode + fresh resets → 'N fresh boulders, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      mode: "count",
      countResets: [
        [daysAgo(1), 4],
        [daysAgo(2), 3],
        [daysAgo(8), 9],
      ],
    });
    expect(scoreGym(a, daysAgo(5)).narrative).toBe("7 fresh boulders, last reset 1 day ago.");
  });
});

describe("scoreGym — badgeText", () => {
  it("sections mode plural → 'fresh sectors'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });
    expect(scoreGym(a, null).badgeText).toBe("fresh sectors");
  });

  it("sections mode singular → 'fresh sector'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1)] } });
    expect(scoreGym(a, null).badgeText).toBe("fresh sector");
  });

  it("count mode plural → 'new boulders'", () => {
    const a = makeGym({
      slug: "a",
      mode: "count",
      countResets: [[daysAgo(1), 5]],
    });
    expect(scoreGym(a, null).badgeText).toBe("new boulders");
  });

  it("count mode singular → 'new boulder'", () => {
    const a = makeGym({
      slug: "a",
      mode: "count",
      countResets: [[daysAgo(1), 1]],
    });
    expect(scoreGym(a, null).badgeText).toBe("new boulder");
  });

  it("no reset data → empty badgeText (badge renders em-dash from label=null)", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    const s = scoreGym(a, null);
    expect(s.label).toBeNull();
    expect(s.badgeText).toBe("");
  });
});

describe("scoreGym — ordering invariants", () => {
  it("sectionsByDisplay is sorted by display_order ascending", () => {
    const gym: GymWithSections = {
      id: "g",
      slug: "g",
      name: "g",
      neighborhood: null,
      website_url: null,
      instagram_handle: null,
      city_id: null,
      freshness_mode: "sections",
      sections: [
        makeSection("B", [makeReset(daysAgo(1))], 2),
        makeSection("A", [makeReset(daysAgo(5))], 0),
        makeSection("C", [makeReset(daysAgo(3))], 1),
      ],
    };
    expect(scoreGym(gym, null).sectionsByDisplay.map((s) => s.name)).toEqual(["A", "C", "B"]);
  });

  it("sectionsByRecent is sorted by most recent reset descending, tiebreak display_order", () => {
    const gym: GymWithSections = {
      id: "g",
      slug: "g",
      name: "g",
      neighborhood: null,
      website_url: null,
      instagram_handle: null,
      city_id: null,
      freshness_mode: "sections",
      sections: [
        makeSection("Old", [makeReset(daysAgo(10))], 0),
        makeSection("Tie-2", [makeReset(daysAgo(1))], 2),
        makeSection("Tie-1", [makeReset(daysAgo(1))], 1),
      ],
    };
    expect(scoreGym(gym, null).sectionsByRecent.map((s) => s.name)).toEqual([
      "Tie-1",
      "Tie-2",
      "Old",
    ]);
  });

  it("allResetsByRecent is populated for count-mode gyms, sorted newest-first", () => {
    const a = makeGym({
      slug: "a",
      mode: "count",
      countResets: [
        [daysAgo(5), 3],
        [daysAgo(1), 7],
        [daysAgo(3), 5],
      ],
    });
    expect(scoreGym(a, null).allResetsByRecent.map((r) => r.reset_on)).toEqual([
      daysAgo(1),
      daysAgo(3),
      daysAgo(5),
    ]);
  });

  it("allResetsByRecent is empty for sections-mode gyms", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1), daysAgo(3)], Overhang: [daysAgo(2)] },
    });
    expect(scoreGym(a, null).allResetsByRecent).toEqual([]);
  });

  it("mostRecentResetISO reflects the newest reset even when no reset is fresh since visit", () => {
    // visited today; latest reset is yesterday → no fresh resets, but mostRecentResetISO still set
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1), daysAgo(3)] } });
    const s = scoreGym(a, daysAgo(0));
    expect(s.mostRecentFreshISO).toBeNull();
    expect(s.mostRecentResetISO).toBe(daysAgo(1));
  });
});
