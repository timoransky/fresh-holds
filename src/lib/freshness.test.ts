import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rankGyms, scoreGym } from "@/lib/freshness";
import type { GymWithSections, Reset, Section } from "@/lib/types";

// All scenarios pin "now" to this date. Dates in the fixtures are relative to it
// (e.g. "today minus 3 days" = 2026-05-08).
const NOW = new Date("2026-05-11T12:00:00Z");

// Scoring model (ADR-0004): noveltyScore = Σ over relevant resets of
// 0.5 ^ (ageDays / 10). Single-reset contributions used throughout:
//   today 1.00 · 1d 0.933 · 2d 0.871 · 3d 0.812 · 5d 0.707 · 7d 0.616
//   8d 0.574 · 9d 0.536 · 10d 0.500 · 12d 0.435 · 15d 0.354 · 16d 0.330
//   19d 0.268 · 21d 0.233 · 22d 0.218 · 26d 0.165
// Tier cuts: anon HOT 2.2 / FRESH 1.4 / WORTH 0.7; returning HOT 3.0 / FRESH 2.0
// / WORTH 1.3; SLIM > 0; STALE = 0; UNKNOWN = no reset data.

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
  // mostRecentReset reads resets[0] - the server query returns them ordered
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

describe("rankGyms - anon (no visits)", () => {
  it("recent volume wins: a burst of resets outranks a single fresh one", () => {
    // Y had a 6-reset refresh ending yesterday; X reset once today. Pure
    // "latest date" would put X first by a day, but the weighted SUM rewards Y's
    // volume: Y ≈ 4.74, X = 1.00. (This is the design call the owner picked.)
    const y = makeGym({
      slug: "y",
      sections: { Wall: [daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4), daysAgo(5), daysAgo(6)] },
    });
    const x = makeGym({ slug: "x", sections: { Wall: [daysAgo(0)] } });

    const r = rankGyms([x, y], {});

    expect(r.hero?.gym.slug).toBe("y");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["x"]);
    expect(r.hero?.noveltyScore).toBeCloseTo(4.741, 2);
    expect(r.hero?.tier.key).toBe("hot"); // 4.74 ≥ 2.2
    expect(r.runnersUp[0].tier.key).toBe("worth"); // 1.00: ≥ 0.7, < 1.4
  });

  it("the wow: weekly gyms at different cycle phases spread across tiers", () => {
    // Three healthy gyms resetting ~weekly, caught at different points in their
    // cycle. Their accumulated sums land them on distinct tiers on first open -
    // exactly the variance the anon page exists to show.
    const fresh0 = makeGym({
      slug: "fresh0",
      sections: { Wall: [daysAgo(0), daysAgo(7), daysAgo(14), daysAgo(21)] }, // ≈2.23, reset today → HOT
    });
    const recent = makeGym({
      slug: "recent",
      sections: { Wall: [daysAgo(2), daysAgo(9), daysAgo(16), daysAgo(23)] }, // ≈1.94, reset 2d → FRESH
    });
    const cooling = makeGym({
      slug: "cooling",
      sections: { Wall: [daysAgo(5), daysAgo(12), daysAgo(19), daysAgo(26)] }, // ≈1.58, reset 5d → WORTH
    });

    const r = rankGyms([cooling, recent, fresh0], {});

    expect(r.hero?.gym.slug).toBe("fresh0");
    expect(r.hero?.tier.key).toBe("hot");
    expect(r.runnersUp.map((g) => [g.gym.slug, g.tier.key])).toEqual([
      ["recent", "fresh"],
      ["cooling", "worth"],
    ]);
  });

  it("a quiet spell cools the badge but the freshest gym stays #1", () => {
    // No gym has reset in ~3 weeks. The least-stale one is still the best option,
    // so it stays hero - but its badge tells the truth (cooled to slim), and
    // adding no new resets doesn't reshuffle the order.
    const leastStale = makeGym({ slug: "least-stale", sections: { Wall: [daysAgo(21)] } });
    const stalest = makeGym({ slug: "stalest", sections: { Wall: [daysAgo(25)] } });

    const r = rankGyms([stalest, leastStale], {});

    expect(r.hero?.gym.slug).toBe("least-stale");
    expect(r.hero?.tier.key).toBe("slim"); // 0.23: cooled, not hot
    expect(r.hero!.noveltyScore).toBeGreaterThan(r.runnersUp[0].noveltyScore);
  });

  it("a gym with no reset inside the window reads as stale", () => {
    const active = makeGym({
      slug: "active",
      sections: { Wall: [daysAgo(1), daysAgo(8), daysAgo(15), daysAgo(22)] },
    });
    const stalled = makeGym({ slug: "stalled", sections: { Wall: [daysAgo(40)] } });

    const r = rankGyms([stalled, active], {});

    expect(r.hero?.gym.slug).toBe("active");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["stalled"]);
    expect(r.runnersUp[0].noveltyScore).toBe(0); // nothing inside the 28-day window
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

describe("rankGyms - returning visitor", () => {
  it("the 1-vs-2 rule: one unseen reset is slim, two are worth a trip", () => {
    // One reset since your visit (1.00) doesn't cross the worth cut - "not a
    // special trip". Two recent unseen resets (≈1.63) do.
    const one = makeGym({ slug: "one", sections: { Wall: [daysAgo(0)] } });
    const two = makeGym({ slug: "two", sections: { Wall: [daysAgo(2), daysAgo(4)] } });

    expect(scoreGym(one, daysAgo(2)).tier.key).toBe("slim"); // 1.00 < 1.3
    expect(scoreGym(two, daysAgo(7)).tier.key).toBe("worth"); // 1.63 ≥ 1.3
  });

  it("caught up: nothing new since your visit → stale", () => {
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(3)] } });
    const r = rankGyms([a], { a: daysAgo(1) });
    expect(r.hero?.noveltyScore).toBe(0); // reset predates the visit
    expect(r.hero?.tier.key).toBe("stale");
  });

  it("the blend: a fresh single reset outranks two month-old ones", () => {
    // Visited 5 weeks ago. Gym A has MORE unseen resets (2) but they're ~4 weeks
    // old and faded (≈0.32); Gym B's lone reset is 2 days old (≈0.87). Recency
    // wins - the owner's "those old walls are probably already stripped" call.
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(25), daysAgo(28)] } });
    const b = makeGym({ slug: "b", sections: { Wall: [daysAgo(2)] } });

    const r = rankGyms([a, b], { a: daysAgo(35), b: daysAgo(35) });

    expect(r.hero?.gym.slug).toBe("b");
    expect(r.hero!.noveltyScore).toBeGreaterThan(r.runnersUp[0].noveltyScore);
    expect(r.hero?.tier.key).toBe("slim"); // best of two thin options
    expect(r.runnersUp[0].tier.key).toBe("slim");
  });

  it("count wins when it's recent: two fresh resets beat one", () => {
    // Same recency ballpark as the blend case, but now A's two resets are fresh
    // (≈1.63 → worth), so volume carries it above B's single reset (≈0.87).
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(2), daysAgo(4)] } });
    const b = makeGym({ slug: "b", sections: { Wall: [daysAgo(2)] } });

    const r = rankGyms([a, b], { a: daysAgo(10), b: daysAgo(10) });

    expect(r.hero?.gym.slug).toBe("a");
    expect(r.hero?.tier.key).toBe("worth");
    expect(r.runnersUp[0].tier.key).toBe("slim");
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

  it("visited yesterday but a reset landed today → there IS something new", () => {
    // A reset after your visit is unseen: 1 unseen, weight 1.0 → slim (not the
    // "worth a trip" bar yet, but honestly a little something new).
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(0)] } });
    const r = rankGyms([a], { a: daysAgo(1) });
    expect(r.hero?.noveltyScore).toBeGreaterThan(0);
    expect(r.hero?.tier.key).toBe("slim");
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

    expect(r.hero?.gym.slug).toBe("a"); // 3 unseen (≈1.74) vs 1 unseen (≈0.93)
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["b"]);
  });
});

describe("rankGyms - mixed lenses (some gyms visited, some not)", () => {
  it("a never-visited gym (more new-to-you) can outrank a just-climbed one", () => {
    // P was climbed yesterday, so only today's lone reset is new to you (logged
    // lens, ≈1.0). Q has never been logged, so its whole weekly history is new
    // (anon lens, ≈2.23). Comparing raw scores, Q rises above P - intended: more
    // is genuinely new to you at Q.
    const p = makeGym({ slug: "p", sections: { Wall: [daysAgo(0)] } });
    const q = makeGym({
      slug: "q",
      sections: { Wall: [daysAgo(0), daysAgo(7), daysAgo(14), daysAgo(21)] },
    });

    const r = rankGyms([p, q], { p: daysAgo(1) });

    expect(r.hero?.gym.slug).toBe("q");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["p"]);
  });
});

describe("rankGyms - tiebreakers", () => {
  it("equal scores: the gym whose newest reset is more recent wins", () => {
    // x: one reset today → 1.00.  y: two sectors reset 10 days ago → 0.5 + 0.5 =
    // 1.00. Same score; the tiebreak falls to the most recent fresh date.
    const x = makeGym({ slug: "x", sections: { Wall: [daysAgo(0)] } });
    const y = makeGym({ slug: "y", sections: { A: [daysAgo(10)], B: [daysAgo(10)] } });

    const r = rankGyms([y, x], {});

    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
    expect(r.hero?.gym.slug).toBe("x");
    expect(r.runnersUp.map((g) => g.gym.slug)).toEqual(["y"]);
  });
});

describe("rankGyms - every reset row counts as one chunk", () => {
  it("more unseen reset rows ⇒ higher score (recency comparable)", () => {
    const three = makeGym({
      slug: "three",
      sections: { Whole: [daysAgo(1), daysAgo(2), daysAgo(3)] },
    });
    const one = makeGym({ slug: "one", sections: { Whole: [daysAgo(1)] } });

    const r = rankGyms([one, three], {});

    expect(r.hero?.gym.slug).toBe("three"); // ≈2.62 vs 0.93
    expect(r.hero!.noveltyScore).toBeGreaterThan(r.runnersUp[0].noveltyScore);
  });

  it("a named-sector gym and an unnamed gym with the same reset dates score the same", () => {
    // 3 named sectors reset on days 1/2/3 vs one "whole gym" section reset on the
    // same days 1/2/3 - identical date multiset → identical score. Sector naming
    // is irrelevant; each reset row's date is what counts.
    const named = makeGym({
      slug: "named",
      sections: { S1: [daysAgo(1)], S2: [daysAgo(2)], S3: [daysAgo(3)] },
    });
    const unnamed = makeGym({
      slug: "unnamed",
      sections: { Whole: [daysAgo(1), daysAgo(2), daysAgo(3)] },
    });

    const r = rankGyms([named, unnamed], {});

    expect(r.hero?.noveltyScore).toBeCloseTo(r.runnersUp[0].noveltyScore, 5);
  });

  it("two resets logged for the SAME sector both count (no dedupe)", () => {
    // We can't tell whether a later reset re-did the same wall, so we count both
    // rows. The 2-row gym scores strictly higher than the 1-row gym.
    const twice = makeGym({ slug: "twice", sections: { Wall: [daysAgo(1), daysAgo(2)] } });
    const once = makeGym({ slug: "once", sections: { Wall: [daysAgo(1)] } });

    const s2 = scoreGym(twice, daysAgo(5));
    const s1 = scoreGym(once, daysAgo(5));

    expect(s2.freshResetCount).toBe(2);
    expect(s2.noveltyScore).toBeGreaterThan(s1.noveltyScore);
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

  it("a single reset exactly a half-life old contributes 0.5", () => {
    const a = makeGym({ slug: "a", sections: { Wall: [daysAgo(10)] } });
    expect(scoreGym(a, null).noveltyScore).toBeCloseTo(0.5, 5);
  });
});

describe("rankGyms - mixed reset data", () => {
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

describe("rankGyms - weekly rotation scenario", () => {
  // Mirrors the real Bratislava rotation: user climbs ~1×/week across four gyms.
  // The gym they've avoided longest (and that keeps resetting) piles up unseen
  // resets and rises to the top; the one they climbed yesterday has nothing new
  // and is STALE. Both deciding factors - visit gap and reset recency - are in
  // play.
  it("longest-avoided active gym rises to the top, just-climbed gym is STALE", () => {
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
    //   raca: 35d ago → 5 unseen (1/8/15/22/29) → ≈2.21  HOT (most of the gym new)
    //   spot: 14d ago → 2 unseen (2/9)           → ≈1.41  WORTH
    //   petrzalka: 10d → 1 unseen (3)            → ≈0.81  SLIM
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

describe("scoreGym - label aggregates per-reset counts", () => {
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

describe("scoreGym - narrative (tier punchlines, two voices)", () => {
  it("no reset data → check-yourself line", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    expect(scoreGym(a, null).narrative).toBe("No reset data - you have to check for yourself.");
  });

  // ---- anon voice: describes the gym's activity, never "you" or "never visited" ----

  it("anon + hot → last-reset + chalk punchline", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(0), daysAgo(7), daysAgo(14), daysAgo(21)] }, // ≈2.23 → hot
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Last reset today - get on it before the chalk builds up.",
    );
  });

  it("anon + fresh → fresh-plastic punchline", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(2), daysAgo(9), daysAgo(16), daysAgo(23)] }, // ≈1.94 → fresh
    });
    expect(scoreGym(a, null).narrative).toBe("Last reset 2 days ago - plenty of fresh plastic.");
  });

  it("anon + worth → worth a session", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(5), daysAgo(12)] }, // ≈1.14 → worth
    });
    expect(scoreGym(a, null).narrative).toBe("Last reset 5 days ago - worth a session.");
  });

  it("anon + slim → slim pickings right now", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(6)] } }); // 0.66 → slim
    expect(scoreGym(a, null).narrative).toBe("Last reset 6 days ago - slim pickings right now.");
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
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1)] } }); // 1 unseen ≈0.93 → slim
    expect(scoreGym(a, daysAgo(3)).narrative).toBe(
      "1 reset since your visit, the latest yesterday - thin, but it's something.",
    );
  });

  it("returning + worth → decent pickings", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(1), daysAgo(8)] } }); // ≈1.51 → worth
    expect(scoreGym(a, daysAgo(14)).narrative).toBe(
      "2 resets since your visit, the latest yesterday - decent pickings.",
    );
  });

  it("returning + fresh → stacking up", () => {
    const a = makeGym({ slug: "a", sections: { All: [daysAgo(2), daysAgo(9), daysAgo(16)] } }); // ≈1.74 → fresh
    expect(scoreGym(a, daysAgo(20)).narrative).toBe(
      "3 resets since your visit, the latest 2 days ago - it's stacking up.",
    );
  });

  it("returning + hot → practically a new gym", () => {
    const a = makeGym({
      slug: "a",
      sections: { All: [daysAgo(0), daysAgo(2), daysAgo(4), daysAgo(6)] }, // ≈3.29 → hot
    });
    expect(scoreGym(a, daysAgo(10)).narrative).toBe(
      "4 resets piled up since your visit, the latest today - practically a new gym.",
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

describe("scoreGym - ordering invariants", () => {
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

describe("scoreGym - recentResets (compact-sector gym view)", () => {
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
