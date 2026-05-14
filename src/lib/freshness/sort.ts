import type { GymWithSections, Reset, Section } from "@/lib/types";

export function sortSectionsByDisplay(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.display_order - b.display_order);
}

export function sortSectionsByRecent(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => {
    const aLatest = a.resets[0]?.reset_on ?? "";
    const bLatest = b.resets[0]?.reset_on ?? "";
    if (aLatest === bLatest) return a.display_order - b.display_order;
    return bLatest.localeCompare(aLatest);
  });
}

export function flattenResetsByRecent(gym: GymWithSections): Reset[] {
  return gym.sections.flatMap((s) => s.resets).sort((a, b) => b.reset_on.localeCompare(a.reset_on));
}

export function mostRecentReset(
  sections: GymWithSections["sections"],
): { reset_on: string; section_name: string } | null {
  let best: { reset_on: string; section_name: string } | null = null;
  for (const section of sections) {
    for (const reset of section.resets) {
      if (best === null || reset.reset_on > best.reset_on) {
        best = { reset_on: reset.reset_on, section_name: section.name };
      }
    }
  }
  return best;
}
