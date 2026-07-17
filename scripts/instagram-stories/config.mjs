// Gym → Instagram handle → sections mapping for the Instagram-stories reset
// pilot. This is reference data for the fetch + submit scripts and for the
// agent doing the extraction. Section names MUST match supabase/seed.sql
// exactly — the submit script resolves them to section_id by name.
//
// Only gyms with an `instagram` handle can be scraped. K2 and Vertigo have no
// handle in the seed, so they're listed here as `instagram: null` for
// completeness and are skipped by the fetch script until a handle is added.
//
// Block Dock runs BOTH its locations (Rača + Petržalka) from one handle
// (@blockdock), so a story from that account can't be attributed to a location
// by handle alone — the extractor must read the content and use `locationHints`
// to pick the right gym. When a story is ambiguous, prefer skipping over
// guessing (a wrong location is worse than a missed reset).

export const GYMS = [
  {
    slug: "spot",
    name: "Spot",
    instagram: "spotbouldering",
    locationHints: [],
    sections: ["Cave", "Slab", "Roof", "Top", "Comp", "Kids"],
  },
  {
    slug: "block-dock-raca",
    name: "Block Dock - Rača",
    instagram: "blockdock",
    locationHints: ["rača", "raca", "raca", "račianska"],
    sections: ["Yellow", "Cave", "Slab", "Wall", "Arête"],
  },
  {
    slug: "block-dock-petrzalka",
    name: "Block Dock - Petržalka",
    instagram: "blockdock",
    locationHints: ["petržalka", "petrzalka", "pétrzalka"],
    sections: ["Akira", "Výklenok", "Hueco", "Tattoine", "Sumo", "Duna", "Pandora", "Kaer Morhen"],
  },
  // No Instagram handle in the seed — not scrapeable until one is added.
  { slug: "k2", name: "K2", instagram: null, locationHints: [], sections: ["Boulder", "Overhang", "Slab", "Training"] },
  { slug: "vertigo", name: "Vertigo", instagram: null, locationHints: [], sections: ["Main", "Boulder", "Training"] },
];

// Handles we actually fetch, and the gym slugs each handle can resolve to.
export function scrapableHandles() {
  const byHandle = new Map();
  for (const gym of GYMS) {
    if (!gym.instagram) continue;
    const key = gym.instagram.toLowerCase().replace(/^@/, "");
    if (!byHandle.has(key)) byHandle.set(key, []);
    byHandle.get(key).push(gym.slug);
  }
  return byHandle; // Map<handle, gymSlug[]>
}
