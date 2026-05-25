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

  it("longer visit gap outranks shorter gap when substance is comparable", () => {
    // Two single-sector gyms with identical fresh content (1 uncounted reset).
    // The user has avoided 'a' for 3 weeks and 'b' for 1 week → 'a' should win.
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(1)] } });

    const r = rankGyms([a, b], { a: daysAgo(21), b: daysAgo(7) });

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });

  it("visit ramp caps at MAX_VISIT_FACTOR (~35d) so very long gaps don't blow out", () => {
    // 'a' visited 35d ago (at cap), 'b' visited 100d ago (still at cap).
    // Same substance → tied score → tiebreak by most recent fresh date.
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1)] } });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(5)] } });

    const r = rankGyms([a, b], { a: daysAgo(35), b: daysAgo(100) });

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
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

describe("rankGyms — substance per gym shape", () => {
  it("single-sector gym: more uncounted fresh rows ⇒ higher substance", () => {
    // Spot-style gym: one section ("whole gym"), uncounted resets. Each fresh
    // row roughly maps to one weekly reset event.
    const three = makeGym({
      slug: "three",
      sections: { "Whole gym": [daysAgo(2), daysAgo(7), daysAgo(12)] },
    });
    const one = makeGym({
      slug: "one",
      sections: { "Whole gym": [daysAgo(2)] },
    });

    const visits = { three: daysAgo(14), one: daysAgo(14) };
    const r = rankGyms([three, one], visits);

    expect(r.hero?.gym.slug).toBe("three");
    expect(r.hero!.noveltyScore).toBeGreaterThan(r.runnersUp[0].noveltyScore);
  });

  it("single-sector gym with counted boulders outranks one with only uncounted rows", () => {
    // Boulder count beats raw row count when we have it.
    const counted = makeGym({
      slug: "counted",
      sections: { "Whole gym": [[daysAgo(2), 25]] },
    });
    const uncounted = makeGym({
      slug: "uncounted",
      sections: { "Whole gym": [daysAgo(2)] },
    });

    const visits = { counted: daysAgo(14), uncounted: daysAgo(14) };
    const r = rankGyms([counted, uncounted], visits);

    expect(r.hero?.gym.slug).toBe("counted");
  });

  it("multi-sector gym: coverage drives substance (more sectors fresh ⇒ higher)", () => {
    const wide = makeGym({
      slug: "wide",
      sections: {
        S1: [daysAgo(2)],
        S2: [daysAgo(3)],
        S3: [daysAgo(4)],
        S4: [],
        S5: [],
        S6: [],
        S7: [],
        S8: [],
      },
    });
    const narrow = makeGym({
      slug: "narrow",
      sections: {
        S1: [daysAgo(2)],
        S2: [],
        S3: [],
        S4: [],
        S5: [],
        S6: [],
        S7: [],
        S8: [],
      },
    });

    const visits = { wide: daysAgo(14), narrow: daysAgo(14) };
    const r = rankGyms([wide, narrow], visits);

    expect(r.hero?.gym.slug).toBe("wide");
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

describe("rankGyms — weekly rotation scenario", () => {
  // Mirrors the real Bratislava rotation: user climbs ~1×/week, rotating
  // between four gyms. The one they've been avoiding longest (with content
  // waiting) should rise to the top and be tier HOT, while the one they
  // just climbed should be STALE.
  it("longest-avoided gym with fresh content rises to HOT, just-climbed gym is STALE", () => {
    const raca = makeGym({
      slug: "raca",
      sections: {
        S1: [daysAgo(3)],
        S2: [daysAgo(10)],
        S3: [daysAgo(17)],
        S4: [],
        S5: [],
        S6: [],
        S7: [],
        S8: [],
      },
    });
    const petrzalka = makeGym({
      slug: "petrzalka",
      sections: {
        S1: [daysAgo(2)],
        S2: [daysAgo(9)],
        S3: [],
        S4: [],
        S5: [],
        S6: [],
        S7: [],
        S8: [],
      },
    });
    const spot = makeGym({
      slug: "spot",
      sections: {
        "Whole gym": [
          [daysAgo(4), 15],
          [daysAgo(11), 20],
        ],
      },
    });
    const vertigo = makeGym({
      slug: "vertigo",
      sections: { Main: [daysAgo(2)], Small: [] },
    });

    // Visit history (today = NOW = 2026-05-11 in this file):
    //   raca: 39d ago      → longest gap, should be HOT
    //   spot: 24d ago      → medium gap
    //   petrzalka: 12d ago → recent
    //   vertigo: 3d ago    → just climbed
    const visits = {
      raca: daysAgo(39),
      spot: daysAgo(24),
      petrzalka: daysAgo(12),
      vertigo: daysAgo(3),
    };

    const r = rankGyms([vertigo, petrzalka, spot, raca], visits);

    // Ordering: Rača (longest gap + content) at the top, then Spot, then
    // Petržalka, then Vertigo.
    expect(r.hero?.gym.slug).toBe("raca");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["spot", "petrzalka", "vertigo"]);

    // Tier check: Rača HOT, the recently-climbed one not.
    expect(r.hero?.tier.key).toBe("hot");
    const vertigoScored = r.runnersUp.find((g) => g.gym.slug === "vertigo")!;
    expect(vertigoScored.tier.key).toBe("slim");
    const spotScored = r.runnersUp.find((g) => g.gym.slug === "spot")!;
    expect(["worth", "hot"]).toContain(spotScored.tier.key);
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

  it("never-visited + multi-section → 'N resets logged'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(3)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged, last reset 2 days ago.",
    );
  });

  it("never-visited + single section + multiple resets → counts resets, not boulders", () => {
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
      "Never visited - 2 resets logged, last reset 1 day ago.",
    );
  });

  it("never-visited + single reset → singular 'reset'", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(2)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 1 reset logged, last reset 2 days ago.",
    );
  });

  // TODO: revisit wording for never-visited span clause (see PR #75).
  it.skip("never-visited + span ~1 week → 'past week'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(3)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged in the past week, last reset 2 days ago.",
    );
  });

  it.skip("never-visited + span ~2 weeks → 'past 2 weeks'", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(1), daysAgo(13)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged in the past 2 weeks, last reset 1 day ago.",
    );
  });

  it.skip("never-visited + span ~1 month → 'past month'", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(1), daysAgo(28)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged in the past month, last reset 1 day ago.",
    );
  });

  it.skip("never-visited + span ~2 months → 'past 2 months'", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(1), daysAgo(55)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged in the past 2 months, last reset 1 day ago.",
    );
  });

  it.skip("never-visited + span ~6 months → 'past N months'", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(1), daysAgo(180)] },
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 2 resets logged in the past 6 months, last reset 1 day ago.",
    );
  });

  it("visited today with no fresh resets → 'nothing new since you visited today'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    expect(scoreGym(a, daysAgo(0)).narrative).toBe("Nothing new since you visited today.");
  });

  it("visited days ago with no fresh resets → 'nothing new since your last visit ...'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe("Nothing new since your last visit 3 days ago.");
  });

  it("visited + one fresh reset → singular 'new reset since your last visit'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(5)] },
    });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "1 new reset since your last visit, last reset 1 day ago.",
    );
  });

  it("visited + multi-section + multiple fresh resets → counts all resets across sections", () => {
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
      "3 new resets since your last visit, last reset 1 day ago.",
    );
  });

  it("visited + single section + counted only → counts reset events, ignores boulder totals", () => {
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
    // visited 5 days ago → resets from days 1+2 are fresh, day 8 is stale.
    expect(scoreGym(a, daysAgo(5)).narrative).toBe(
      "2 new resets since your last visit, last reset 1 day ago.",
    );
  });

  it("visited + single section + uncounted only → 'N new reset(s) since your last visit'", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "1 new reset since your last visit, last reset 1 day ago.",
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

describe("scoreGym — recentResets (compact-sector gym view)", () => {
  it("flags compact-sector gyms (1 or 2 sectors)", () => {
    const one = makeGym({ slug: "one", sections: { All: [daysAgo(1)] } });
    const two = makeGym({
      slug: "two",
      sections: { Main: [daysAgo(1)], Small: [daysAgo(2)] },
    });
    const three = makeGym({
      slug: "three",
      sections: { A: [daysAgo(1)], B: [daysAgo(2)], C: [daysAgo(3)] },
    });

    expect(scoreGym(one, null).isCompactSectors).toBe(true);
    expect(scoreGym(two, null).isCompactSectors).toBe(true);
    expect(scoreGym(three, null).isCompactSectors).toBe(false);
  });

  it("never-visited: returns resets within the 60-day fallback window, sorted newest-first", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: [daysAgo(1), daysAgo(30), daysAgo(59), daysAgo(70)],
      },
    });
    const s = scoreGym(a, null);
    expect(s.recentResets.map((r) => r.reset_on)).toEqual([daysAgo(1), daysAgo(30), daysAgo(59)]);
    // never visited → every reset in the window is fresh
    expect(s.recentResets.every((r) => r.isFresh)).toBe(true);
  });

  it("visited: returns resets after lastVisited only", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: [daysAgo(1), daysAgo(3), daysAgo(10), daysAgo(20)],
      },
    });
    const s = scoreGym(a, daysAgo(5));
    expect(s.recentResets.map((r) => r.reset_on)).toEqual([daysAgo(1), daysAgo(3)]);
    expect(s.recentResets.every((r) => r.isFresh)).toBe(true);
  });

  it("just-visited user with no fresh resets gets an empty list (option 2 fallback only on never-visited)", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(5), daysAgo(20)] } });
    const s = scoreGym(a, daysAgo(1));
    expect(s.recentResets).toEqual([]);
  });

  it("two-sector gym: interleaves resets from both sectors, newest-first, with section labels", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        Main: [daysAgo(1), daysAgo(8)],
        Small: [daysAgo(3), daysAgo(10)],
      },
    });
    const s = scoreGym(a, null);
    expect(s.recentResets.map((r) => [r.section_name, r.reset_on])).toEqual([
      ["Main", daysAgo(1)],
      ["Small", daysAgo(3)],
      ["Main", daysAgo(8)],
      ["Small", daysAgo(10)],
    ]);
  });

  it("caps the list at 10 rows", () => {
    const a = makeGym({
      slug: "a",
      sections: {
        All: Array.from({ length: 15 }, (_, i) => daysAgo(i + 1)),
      },
    });
    const s = scoreGym(a, null);
    expect(s.recentResets.length).toBe(10);
    expect(s.recentResets[0].reset_on).toBe(daysAgo(1));
  });
});
