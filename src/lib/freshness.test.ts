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
    iclub_slug: null,
    city_id: null,
    sections: sectionList,
  };
}

// ---------- scenarios ----------

describe("rankGyms — anon (no visits)", () => {
  it("turnover saturates on weekly gyms, so recency orders the page", () => {
    // Both have 4 unseen resets inside the 28-day anon window → turnover 1.0.
    // The only differentiator left is how recently each one dropped.
    const recent = makeGym({
      slug: "recent",
      sections: { Wall: [daysAgo(0), daysAgo(7), daysAgo(14), daysAgo(21)] },
    });
    const older = makeGym({
      slug: "older",
      sections: { Wall: [daysAgo(5), daysAgo(12), daysAgo(19), daysAgo(26)] },
    });

    const r = rankGyms([older, recent], {});

    expect(r.hero?.gym.slug).toBe("recent");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["older"]);
    expect(r.hero?.tier.key).toBe("hot"); // reset today: 1.0 × 1.0
    expect(r.runnersUp[0].tier.key).toBe("worth"); // reset 5d ago: 1.0 × 0.61
  });

  it("a gym with no reset inside the 28-day window reads as stale", () => {
    const active = makeGym({
      slug: "active",
      sections: { Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22)] },
    });
    const stalled = makeGym({ slug: "stalled", sections: { Wall: [daysAgo(40)] } });

    const r = rankGyms([stalled, active], {});

    expect(r.hero?.gym.slug).toBe("active");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["stalled"]);
    expect(r.runnersUp[0].noveltyScore).toBe(0); // 0 unseen resets in the window
    expect(r.runnersUp[0].tier.key).toBe("stale");
  });

  it("sections reset within the window are all counted as fresh", () => {
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

describe("rankGyms — returning visitor", () => {
  it("a gym you visited after its last reset drops below a gym with unseen resets", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(3), daysAgo(4), daysAgo(5)] },
    });
    const b = makeGym({ slug: "b", sections: { Slab: [daysAgo(3)] } });

    const r = rankGyms([a, b], { a: daysAgo(1) });

    expect(r.hero?.gym.slug).toBe("b"); // a: 0 unseen → 0; b: 1 unseen → 0.25
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

  it("visited yesterday but a reset landed today → there IS something new (not stale)", () => {
    // The old model force-marked any visit within 2 days as STALE. Now a reset
    // after your visit is simply unseen: 1 unseen (turnover 1/3) × recency 1.0 =
    // 0.33 → slim, not stale. There's a little something new, and it ranks > 0.
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(0)] } });
    const r = rankGyms([a], { a: daysAgo(1) });
    expect(r.hero?.noveltyScore).toBeGreaterThan(0);
    expect(r.hero?.tier.key).toBe("slim");
  });

  it("visited after the gym's most recent reset → nothing new → stale", () => {
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(3)] } });
    const r = rankGyms([a], { a: daysAgo(1) });
    expect(r.hero?.noveltyScore).toBe(0);
    expect(r.hero?.tier.key).toBe("stale");
  });

  it("a longer visit gap accumulates more unseen resets and outranks a shorter gap", () => {
    // Identical weekly gyms. The user avoided 'a' for 3 weeks (3 unseen) and 'b'
    // for 1 week (1 unseen), so 'a' has more piled up.
    const a = makeGym({
      slug: "a",
      sections: { Wall: [daysAgo(2), daysAgo(9), daysAgo(16), daysAgo(23)] },
    });
    const b = makeGym({
      slug: "b",
      sections: { Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22)] },
    });

    const r = rankGyms([a, b], { a: daysAgo(21), b: daysAgo(7) });

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });

  it("turnover saturates at SATURATION_RESETS so extra unseen resets don't keep climbing", () => {
    const four = makeGym({
      slug: "four",
      sections: { Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22)] },
    });
    const many = makeGym({
      slug: "many",
      sections: {
        Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22), daysAgo(29), daysAgo(36)],
      },
    });

    const r = rankGyms([four, many], { four: daysAgo(60), many: daysAgo(60) });

    // 4 unseen vs 6 unseen, same newest reset → both saturate at turnover 1.0.
    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
    expect(r.hero?.tier.key).toBe("hot");
  });
});

describe("rankGyms — tiebreakers", () => {
  it("equal scores: the gym whose newest reset is more recent wins", () => {
    // x: 1 unseen today → 1/3 × 1.0 = 0.33.  y: 2 unseen, newest a week old →
    // 2/3 × 0.5 = 0.33. Same score; tiebreak falls to the most recent fresh date.
    const x = makeGym({ slug: "x", sections: { Wall: [daysAgo(0)] } });
    const y = makeGym({ slug: "y", sections: { Wall: [daysAgo(7), daysAgo(14)] } });

    const r = rankGyms([y, x], {});

    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
    expect(r.hero?.gym.slug).toBe("x");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["y"]);
  });
});

describe("rankGyms — every reset row counts as one chunk", () => {
  it("more unseen reset rows ⇒ higher turnover ⇒ higher score (recency equal)", () => {
    const three = makeGym({
      slug: "three",
      sections: { Whole: [daysAgo(1), daysAgo(2), daysAgo(3)] },
    });
    const one = makeGym({ slug: "one", sections: { Whole: [daysAgo(1)] } });

    const r = rankGyms([one, three], {});

    expect(r.hero?.gym.slug).toBe("three"); // 3 unseen (turnover 1.0) vs 1 (0.33)
    expect(r.hero!.noveltyScore).toBeGreaterThan(r.runnersUp[0].noveltyScore);
  });

  it("a named-sector gym and an unnamed gym count each reset row the same", () => {
    // 3 named sectors reset once vs one "whole gym" section reset 3 times — both
    // 3 rows, same newest date → identical score. Sector naming is irrelevant.
    const named = makeGym({
      slug: "named",
      sections: { S1: [daysAgo(1)], S2: [daysAgo(1)], S3: [daysAgo(1)] },
    });
    const unnamed = makeGym({
      slug: "unnamed",
      sections: { Whole: [daysAgo(1), daysAgo(2), daysAgo(3)] },
    });

    const r = rankGyms([named, unnamed], {});

    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
  });

  it("boulder counts are display-only and never affect the score", () => {
    const counted = makeGym({ slug: "counted", sections: { Whole: [[daysAgo(1), 25]] } });
    const uncounted = makeGym({ slug: "uncounted", sections: { Whole: [daysAgo(1)] } });

    expect(scoreGym(counted, null).noveltyScore).toBeCloseTo(
      scoreGym(uncounted, null).noveltyScore,
      5,
    );
    expect(scoreGym(counted, null).label?.countedBoulders).toBe(25); // still shown to the user
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
  // Mirrors the real Bratislava rotation: user climbs ~1×/week across four gyms.
  // The gym they've avoided longest (and that keeps resetting) piles up unseen
  // resets and rises to HOT; the one they climbed yesterday has nothing new and
  // is STALE. Both deciding factors — visit gap and reset recency — are in play.
  it("longest-avoided active gym rises to HOT, just-climbed gym is STALE", () => {
    const raca = makeGym({
      slug: "raca",
      sections: { Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22), daysAgo(29)] },
    });
    const spot = makeGym({
      slug: "spot",
      sections: { Wall: [daysAgo(2), daysAgo(9)] },
    });
    const petrzalka = makeGym({
      slug: "petrzalka",
      sections: { Wall: [daysAgo(3)] },
    });
    const vertigo = makeGym({
      slug: "vertigo",
      sections: { Wall: [daysAgo(4)] },
    });

    // Visit history (today = NOW = 2026-05-11 in this file):
    //   raca: 35d ago → 5 unseen, newest 1d  → 1.0 × 0.91 = 0.91  HOT
    //   spot: 14d ago → 2 unseen, newest 2d  → 0.5 × 0.82 = 0.41  WORTH
    //   petrzalka: 10d → 1 unseen, newest 3d → 0.25 × 0.74 = 0.19 SLIM
    //   vertigo: 1d ago → reset (4d) predates visit → 0 unseen → 0  STALE
    const visits = {
      raca: daysAgo(35),
      spot: daysAgo(14),
      petrzalka: daysAgo(10),
      vertigo: daysAgo(1),
    };

    const r = rankGyms([vertigo, petrzalka, spot, raca], visits);

    expect(r.hero?.gym.slug).toBe("raca");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["spot", "petrzalka", "vertigo"]);

    expect(r.hero?.tier.key).toBe("hot");
    const vertigoScored = r.runnersUp.find((g) => g.gym.slug === "vertigo")!;
    expect(vertigoScored.noveltyScore).toBe(0);
    expect(vertigoScored.tier.key).toBe("stale");
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

describe("scoreGym — narrative (tier punchlines, two voices)", () => {
  it("no reset data → check-yourself line", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    expect(scoreGym(a, null).narrative).toBe("No reset data - you have to check for yourself.");
  });

  // ---- anon voice: describes the gym's activity, never "you" or "never visited" ----

  it("anon + hot → busy month punchline", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(8), daysAgo(15)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Reset yesterday after a busy month - go while the holds are fresh.",
    );
  });

  it("anon + fresh → drops-this-month with fresh-plastic punchline", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(2), daysAgo(9), daysAgo(16)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Reset 2 days ago, 3 drops this month - plenty of fresh plastic.",
    );
  });

  it("anon + worth → aging drop, solid pickings", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(5), daysAgo(12), daysAgo(19)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Last reset 5 days ago, 3 drops this month - solid pickings, not piping hot.",
    );
  });

  it("anon + slim → slow stretch, singular drop", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(2)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "A slow stretch - 1 drop this month, the latest 2 days ago.",
    );
  });

  it("anon + stale (nothing in the month window) → old plastic", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(40)] } });
    expect(scoreGym(a, null).narrative).toBe(
      "Quiet lately - no resets in the last month. Running on old plastic.",
    );
  });

  // ---- returning voice: anchored to "since your visit" ----

  it("visited today with no fresh resets → 'nothing new since you visited today'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(2)] } });
    expect(scoreGym(a, daysAgo(0)).narrative).toBe("Nothing new since you visited today.");
  });

  it("visited days ago with no fresh resets → 'nothing new since your last visit ...'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(5)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe("Nothing new since your last visit 3 days ago.");
  });

  it("returning + slim → thin-but-something, singular reset", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1)] } });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "1 reset since your visit, the latest yesterday - thin, but it's something.",
    );
  });

  it("returning + worth → decent pickings", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(8)] } });
    expect(scoreGym(a, daysAgo(14)).narrative).toBe(
      "2 resets since your visit, the latest yesterday - decent pickings.",
    );
  });

  it("returning + fresh → stacking up", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(3), daysAgo(10), daysAgo(17)] } });
    expect(scoreGym(a, daysAgo(21)).narrative).toBe(
      "3 resets since your visit, the latest 3 days ago - it's stacking up.",
    );
  });

  it("returning + hot → practically a new gym", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(8), daysAgo(15)] } });
    expect(scoreGym(a, daysAgo(21)).narrative).toBe(
      "3 resets piled up since your visit, the latest yesterday - practically a new gym.",
    );
  });

  it("counts reset events across sections, ignoring boulder totals", () => {
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
    expect(scoreGym(a, daysAgo(7)).narrative).toContain("3 resets");
  });
});

describe("scoreGym — badge (two voices)", () => {
  it("anon multi-section gym → 'recent sectors'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(2);
    expect(s.badgeText).toBe("recent sectors");
  });

  it("returning multi-section gym → 'fresh sector(s)', counted since the visit", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(8)] },
    });
    // Visited 5 days ago → only Slab is fresh.
    const s = scoreGym(a, daysAgo(5));
    expect(s.badgeNumber).toBe(1);
    expect(s.badgeText).toBe("fresh sector");
  });

  it("single-section gym + counted boulders → 'new boulders' for both voices", () => {
    const a = makeGym({ slug: "a", sections: { All: [[daysAgo(1), 5]] } });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(5);
    expect(s.badgeText).toBe("new boulders");
  });

  it("anon single-section gym + uncounted resets → counts reset events, not sectors", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(8)] } });
    const s = scoreGym(a, null);
    expect(s.badgeNumber).toBe(2);
    expect(s.badgeText).toBe("recent resets");
  });

  it("returning single-section gym + uncounted resets → 'new reset(s)' since the visit", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(3), daysAgo(8)] } });
    const s = scoreGym(a, daysAgo(5));
    expect(s.badgeNumber).toBe(2);
    expect(s.badgeText).toBe("new resets");
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
      iclub_slug: null,
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
      iclub_slug: null,
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

  it("anon: returns resets within the 28-day window the scorer uses, sorted newest-first", () => {
    // List window == scoring window, so the expanded list shows exactly what
    // the badge and narrative count.
    const a = makeGym({
      slug: "a",
      sections: {
        All: [daysAgo(1), daysAgo(20), daysAgo(27), daysAgo(40)],
      },
    });
    const s = scoreGym(a, null);
    expect(s.recentResets.map((r) => r.reset_on)).toEqual([daysAgo(1), daysAgo(20), daysAgo(27)]);
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
