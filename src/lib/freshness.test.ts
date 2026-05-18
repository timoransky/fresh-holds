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

// A fixture entry is either a bare date string (no count) or [date, count].
type ResetSpec = string | [string, number | null];

function specToReset(spec: ResetSpec): Reset {
  if (typeof spec === "string") return makeReset(spec);
  return makeReset(spec[0], spec[1]);
}

type GymInput = {
  slug: string;
  sections?: Record<string, ResetSpec[]>;
  gymWideResets?: ResetSpec[];
};

function makeGym({ slug, sections, gymWideResets }: GymInput): GymWithSections {
  const sectionList: Section[] = Object.entries(sections ?? {}).map(([name, specs], i) =>
    makeSection(
      name,
      specs.map(specToReset),
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
    sections: sectionList,
    gymWideResets: (gymWideResets ?? []).map(specToReset),
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

  it("a never-visited gym labels all sectors fresh", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });

    const r = rankGyms([a], {});

    expect(r.hero?.label).toEqual({ sectors: { count: 2, total: 2 }, boulders: null });
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

    expect(r.hero?.label).toEqual({ sectors: { count: 1, total: 1 }, boulders: null });
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

describe("rankGyms — gym-wide resets", () => {
  it("gym-wide-only gym ranks alongside section-based ones by reset count", () => {
    const wide = makeGym({
      slug: "wide",
      gymWideResets: [
        [daysAgo(1), 10],
        [daysAgo(3), 5],
        [daysAgo(5), 8],
      ],
    });
    const sectioned = makeGym({
      slug: "sectioned",
      sections: { Slab: [daysAgo(2)], Overhang: [daysAgo(4)] },
    });

    const r = rankGyms([sectioned, wide], {});

    expect(r.hero?.gym.slug).toBe("wide");
    expect(r.hero?.label).toEqual({ sectors: null, boulders: 23 });
  });

  it("gym-wide counts sum only resets since the last visit", () => {
    const wide = makeGym({
      slug: "wide",
      gymWideResets: [
        [daysAgo(1), 10],
        [daysAgo(5), 7],
        [daysAgo(8), 4],
      ],
    });

    const r = rankGyms([wide], { wide: daysAgo(6) });

    expect(r.hero?.label).toEqual({ sectors: null, boulders: 17 });
  });

  it("gym-wide reset with no count contributes to recency but boulders stays null", () => {
    // Spot's "Nové bouldre 5B-7A" case: a drop happened, no count provided.
    const wide = makeGym({
      slug: "spot",
      gymWideResets: [daysAgo(0)],
    });

    const scored = scoreGym(wide, null);
    expect(scored.label).toEqual({ sectors: null, boulders: null });
    expect(scored.freshResetCount).toBe(1);
    expect(scored.hasResetData).toBe(true);
    expect(scored.mostRecentFreshISO).toBe(daysAgo(0));
  });

  it("mixed: named sectors + gym-wide counts both contribute to the label", () => {
    const mixed = makeGym({
      slug: "mixed",
      sections: { Slab: [daysAgo(1)], Overhang: [] },
      gymWideResets: [[daysAgo(2), 8]],
    });

    const scored = scoreGym(mixed, null);
    expect(scored.label).toEqual({ sectors: { count: 1, total: 2 }, boulders: 8 });
    expect(scored.freshResetCount).toBe(2);
  });

  it("section reset with a count contributes to boulders sum too", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [[daysAgo(1), 6]] },
    });

    const scored = scoreGym(a, null);
    expect(scored.label).toEqual({ sectors: { count: 1, total: 1 }, boulders: 6 });
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

  it("never-visited + gym-wide counts → 'N fresh boulders' copy", () => {
    const a = makeGym({
      slug: "a",
      gymWideResets: [
        [daysAgo(1), 7],
        [daysAgo(3), 5],
      ],
    });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - 12 fresh boulders, last reset 1 day ago.",
    );
  });

  it("never-visited + uncounted gym-wide drop → countless narrative", () => {
    const a = makeGym({ slug: "a", gymWideResets: [daysAgo(1)] });
    expect(scoreGym(a, null).narrative).toBe(
      "Never visited - new boulders set, last reset 1 day ago.",
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

  it("visited + sections + fresh resets → 'X of Y sectors fresh, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(5)] },
    });
    expect(scoreGym(a, daysAgo(3)).narrative).toBe("1 of 2 sectors fresh, last reset 1 day ago.");
  });

  it("visited + gym-wide counts → 'N fresh boulders, last reset ...'", () => {
    const a = makeGym({
      slug: "a",
      gymWideResets: [
        [daysAgo(1), 4],
        [daysAgo(2), 3],
        [daysAgo(8), 9],
      ],
    });
    expect(scoreGym(a, daysAgo(5)).narrative).toBe("7 fresh boulders, last reset 1 day ago.");
  });

  it("visited + mixed sectors and gym-wide counts → composes both signals", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [] },
      gymWideResets: [[daysAgo(2), 8]],
    });
    expect(scoreGym(a, daysAgo(5)).narrative).toBe(
      "1 of 2 sectors fresh + 8 new boulders elsewhere, last reset 1 day ago.",
    );
  });
});

describe("scoreGym — badge", () => {
  it("sections plural → 'fresh sectors'", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(1)], Overhang: [daysAgo(2)] },
    });
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(2);
    expect(s.badgeText).toBe("fresh sectors");
  });

  it("sections singular → 'fresh sector'", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1)] } });
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(1);
    expect(s.badgeText).toBe("fresh sector");
  });

  it("gym-wide counts plural → 'new boulders'", () => {
    const a = makeGym({ slug: "a", gymWideResets: [[daysAgo(1), 5]] });
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(5);
    expect(s.badgeText).toBe("new boulders");
  });

  it("gym-wide counts singular → 'new boulder'", () => {
    const a = makeGym({ slug: "a", gymWideResets: [[daysAgo(1), 1]] });
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBe(1);
    expect(s.badgeText).toBe("new boulder");
  });

  it("uncounted gym-wide drop → count=null, text='fresh'", () => {
    const a = makeGym({ slug: "a", gymWideResets: [daysAgo(1)] });
    const s = scoreGym(a, null);
    expect(s.badgeCount).toBeNull();
    expect(s.badgeText).toBe("fresh");
  });

  it("no reset data → null count + empty text (badge renders em-dash)", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [] } });
    const s = scoreGym(a, null);
    expect(s.label).toBeNull();
    expect(s.badgeCount).toBeNull();
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
      gymWideResets: [],
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
      gymWideResets: [],
    };
    expect(scoreGym(gym, null).sectionsByRecent.map((s) => s.name)).toEqual([
      "Tie-1",
      "Tie-2",
      "Old",
    ]);
  });

  it("timelineResets includes both section and gym-wide resets, newest-first", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(3)] },
      gymWideResets: [[daysAgo(1), 5], [daysAgo(5), 2]],
    });
    const timeline = scoreGym(a, null).timelineResets;
    expect(timeline.map((r) => r.reset_on)).toEqual([daysAgo(1), daysAgo(3), daysAgo(5)]);
    expect(timeline[0].section_name).toBeNull();
    expect(timeline[1].section_name).toBe("Slab");
    expect(timeline[2].section_name).toBeNull();
  });

  it("mostRecentResetISO reflects the newest reset even when no reset is fresh since visit", () => {
    const a = makeGym({ slug: "a", sections: { Slab: [daysAgo(1), daysAgo(3)] } });
    const s = scoreGym(a, daysAgo(0));
    expect(s.mostRecentFreshISO).toBeNull();
    expect(s.mostRecentResetISO).toBe(daysAgo(1));
  });

  it("mostRecentResetISO considers gym-wide resets too", () => {
    const a = makeGym({
      slug: "a",
      sections: { Slab: [daysAgo(5)] },
      gymWideResets: [daysAgo(1)],
    });
    expect(scoreGym(a, null).mostRecentResetISO).toBe(daysAgo(1));
  });
});
