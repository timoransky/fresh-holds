import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rankGyms, scoreGym } from "@/lib/freshness";
import type { GymWithSections, Reset, Section } from "@/lib/types";

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

type SectionEntry = string[] | Array<[date: string, boulders: number | null]>;

type GymInput = {
  slug: string;
  // Each key is a section name; the value is either an array of dates (no
  // counts) or an array of [date, count] tuples. Mix freely within one gym.
  sections?: Record<string, SectionEntry>;
};

function makeGym({ slug, sections }: GymInput): GymWithSections {
  const sectionList: Section[] = Object.entries(sections ?? {}).map(([name, entries], i) => {
    const resets = entries.map((e) =>
      typeof e === "string" ? makeReset(e) : makeReset(e[0], e[1]),
    );
    return makeSection(name, resets, i);
  });

  return {
    id: `g-${slug}`,
    slug,
    name: slug,
    neighborhood: null,
    website_url: null,
    instagram_handle: null,
    city_id: null,
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

  it("a never-visited gym gets a label with all sections fresh", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });

    const r = rankGyms([a], {});

    expect(r.hero?.label).toEqual({
      freshSections: 2,
      totalSections: 2,
      countedBoulders: 0,
      hasUncountedResets: true,
    });
    expect(r.hero?.lastVisited).toBeNull();
  });
});

describe("rankGyms — with a recent visit", () => {
  it("a gym you visited AFTER its last reset drops below an unvisited gym with fresh resets", () => {
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
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2), daysAgo(5)] },
    });

    const r = rankGyms([a], { a: daysAgo(4) });

    expect(r.hero?.label?.freshSections).toBe(1);
    expect(r.hero?.label?.totalSections).toBe(1);
  });

  it("visit within JUST_VISITED_DAYS (≤2) forces tier STALE even if there are fresh resets", () => {
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

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });
});

describe("rankGyms — tiebreakers", () => {
  it("equal novelty scores: most recent fresh reset date wins", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(1)] } });

    const r = rankGyms([a, b], {});

    expect(r.hero?.gym.slug).toBe("b");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["a"]);
  });
});

describe("rankGyms — single-section vs multi-section parity", () => {
  it("a single-section gym with N resets scores the same as a multi-section gym with N reset sectors", () => {
    // Spot (1 section, "whole gym") was reset twice in the last two weeks —
    // one part last week, another part this week. Both uncounted.
    const spot = makeGym({
      slug: "spot",
      sections: { "Whole gym": [daysAgo(2), daysAgo(7)] },
    });

    // An 8-sector gym had one sector reset this week and another last week;
    // the other 6 sectors have nothing in window.
    const multi = makeGym({
      slug: "multi",
      sections: {
        S1: [daysAgo(2)],
        S2: [daysAgo(7)],
        S3: [],
        S4: [],
        S5: [],
        S6: [],
        S7: [],
        S8: [],
      },
    });

    // User hasn't visited either in two weeks → full visit weight.
    const visits = { spot: daysAgo(14), multi: daysAgo(14) };
    const r = rankGyms([spot, multi], visits);

    const spotScored = [r.hero, ...r.runnersUp].find((g) => g?.gym.slug === "spot")!;
    const multiScored = [r.hero, ...r.runnersUp].find((g) => g?.gym.slug === "multi")!;

    // Scoring is reset-row based, not section-based: 2 fresh resets either way.
    expect(spotScored.freshResetCount).toBe(2);
    expect(multiScored.freshResetCount).toBe(2);
    expect(spotScored.noveltyScore).toBe(multiScored.noveltyScore);
    expect(spotScored.tier.key).toBe(multiScored.tier.key);

    // Labels differ in shape (the single-section gym can't surface sector
    // coverage), but the ranking signal is identical.
    expect(spotScored.label).toEqual({
      freshSections: 1,
      totalSections: 1,
      countedBoulders: 0,
      hasUncountedResets: true,
    });
    expect(multiScored.label).toEqual({
      freshSections: 2,
      totalSections: 8,
      countedBoulders: 0,
      hasUncountedResets: true,
    });
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

describe("scoreGym — label aggregates per-reset counts", () => {
  it("sums boulders_reset across fresh resets and tracks uncounted ones", () => {
    // Vertigo-style: main area + small area, mixed counted/uncounted announcements.
    const vertigo = makeGym({
      slug: "vertigo",
      sections: {
        Main: [
          [daysAgo(1), 11], // counted reset
          [daysAgo(4), null], // uncounted reset
        ],
        Small: [[daysAgo(2), null]], // uncounted
      },
    });

    const s = scoreGym(vertigo, daysAgo(7));

    expect(s.label).toEqual({
      freshSections: 2,
      totalSections: 2,
      countedBoulders: 11,
      hasUncountedResets: true,
    });
  });

  it("ignores boulders from resets older than the last visit", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: [
          [daysAgo(1), 10],
          [daysAgo(5), 7],
          [daysAgo(8), 4],
        ],
      },
    });

    // visited 6 days ago → resets from day 1 and day 5 are fresh (17 boulders),
    // day 8 is stale
    const s = scoreGym(a, daysAgo(6));
    expect(s.label?.countedBoulders).toBe(17);
    expect(s.label?.hasUncountedResets).toBe(false);
  });
});

describe("scoreGym — narrative", () => {
  it("no reset data → check-yourself line", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    expect(scoreGym(a, null).narrative).toBe("No reset data - you have to check for yourself.");
  });

  it("never-visited + multi-section → 'all N sectors fresh'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(3)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - all 2 sectors fresh, last reset 2 days ago.",
    );
  });

  it("never-visited + single section + counted boulders → 'N new boulders'", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: [
          [daysAgo(1), 7],
          [daysAgo(3), 5],
        ],
      },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 12 new boulders, last reset 1 day ago.",
    );
  });

  it("never-visited + single section + uncounted only → 'some boulders are fresh'", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(2)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - some boulders are fresh, last reset 2 days ago.",
    );
  });

  it("visited today with no fresh resets → 'nothing new since you visited today'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    expect(scoreGym(a, daysAgo(0)).narrative).toBe("Nothing new since you visited today.");
  });

  it("visited days ago with no fresh resets → 'nothing new since your last visit ...'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "Nothing new since your last visit 3 days ago.",
    );
  });

  it("visited + multi-section + uncounted fresh resets → 'X of Y sectors fresh, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(5)] },
    });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "1 of 2 sectors fresh, last reset 1 day ago.",
    );
  });

  it("visited + multi-section + mixed counted/uncounted → appends 'N+ new boulders'", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        Main: [
          [daysAgo(1), 11],
          [daysAgo(4), null],
        ],
        Small: [[daysAgo(2), null]],
      },
    });
    expect(scoreGym(a, daysAgo(7)).narrative).toBe(
      "All 2 sectors fresh · 11+ new boulders, last reset 1 day ago.",
    );
  });

  it("visited + single section + counted only → 'N new boulders, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: [
          [daysAgo(1), 4],
          [daysAgo(2), 3],
          [daysAgo(8), 9],
        ],
      },
    });
    // visited 5 days ago → resets from days 1+2 are fresh (7 boulders),
    // day 8 is stale.
    expect(scoreGym(a, daysAgo(5)).narrative).toBe(
      "7 new boulders, last reset 1 day ago.",
    );
  });

  it("visited + single section + uncounted only → 'some boulders are fresh, last reset ...'", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "Some boulders are fresh, last reset 1 day ago.",
    );
  });
});

describe("scoreGym — badge", () => {
  it("multi-section gym → badge counts sectors", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(2);
    expect(s.badgeText).toBe("fresh sectors");
  });

  it("multi-section gym with one fresh sector → singular", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(8)] },
    });
    // Visited 5 days ago → only Slab is fresh.
    const s = scoreGym(a, daysAgo(5));
    expect(s.badgeNumber).toBe(1);
    expect(s.badgeText).toBe("fresh sector");
  });

  it("single-section gym + counted boulders → badge counts boulders", () => {
    const a = makeGym({ slug: "a", sections: { All: [[daysAgo(1), 5]] } });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(5);
    expect(s.badgeText).toBe("new boulders");
  });

  it("single-section gym + uncounted resets → falls back to sector count", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1)] } });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(1);
    expect(s.badgeText).toBe("fresh sector");
  });

  it("no reset data → badgeText empty (badge renders em-dash from label=null)", () => {
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

  it("mostRecentResetISO reflects the newest reset even when no reset is fresh since visit", () => {
    // visited today; latest reset is yesterday → no fresh resets, but mostRecentResetISO still set
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1), daysAgo(3)] } });
    const s = scoreGym(a, daysAgo(0));
    expect(s.mostRecentFreshISO).toBeNull();
    expect(s.mostRecentResetISO).toBe(daysAgo(1));
  });
});
