import type { GymWithSections, Reset, Section } from "@/lib/types";

export type TimelineReset = Reset & { section_name: string | null };

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

export function flattenResetsByRecent(gym: GymWithSections): TimelineReset[] {
  const sectionRows: TimelineReset[] = gym.sections.flatMap((s) =>
    s.resets.map((r) => ({ ...r, section_name: s.name })),
  );
  const gymWideRows: TimelineReset[] = gym.gymWideResets.map((r) => ({
    ...r,
    section_name: null,
  }));
  return [...sectionRows, ...gymWideRows].sort((a, b) => b.reset_on.localeCompare(a.reset_on));
}

export function mostRecentReset(
  gym: GymWithSections,
): { reset_on: string; section_name: string | null } | null {
  let best: { reset_on: string; section_name: string | null } | null = null;
  for (const section of gym.sections) {
    for (const reset of section.resets) {
      if (best === null || reset.reset_on > best.reset_on) {
        best = { reset_on: reset.reset_on, section_name: section.name };
      }
    }
  }
  for (const reset of gym.gymWideResets) {
    if (best === null || reset.reset_on > best.reset_on) {
      best = { reset_on: reset.reset_on, section_name: null };
    }
  }
  return best;
}
