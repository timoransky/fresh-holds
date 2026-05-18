import { relativeDay } from "@/lib/date";
import type { TimelineReset } from "@/lib/freshness";
import type { Section } from "@/lib/types";
import { StatusDot } from "@/components/gym/StatusDot";

type Props = {
  sections: Section[];
  timelineResets: TimelineReset[];
  lastVisited: string | null;
  freshSectionIds: Set<string>;
};

// Renders whichever signals the gym carries. If the gym has named sectors
// it lists them with their most-recent reset; gym-wide resets get their own
// "Across the gym" row underneath. A gym with only gym-wide entries skips
// the sector list entirely.
export function GymResetTable({ sections, timelineResets, lastVisited, freshSectionIds }: Props) {
  const gymWide = timelineResets.filter((r) => r.section_name === null);

  if (sections.length === 0) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            <th className="text-left font-medium pb-1.5">Date</th>
            <th className="text-left font-medium pb-1.5">Detail</th>
            <th className="w-4 pb-1.5" aria-label="status" />
          </tr>
        </thead>
        <tbody>
          {gymWide.map((reset) => (
            <GymWideRow key={reset.id} reset={reset} lastVisited={lastVisited} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          <th className="text-left font-medium pb-1.5">Sector</th>
          <th className="text-left font-medium pb-1.5">Last reset</th>
          <th className="w-4 pb-1.5" aria-label="status" />
        </tr>
      </thead>
      <tbody>
        {sections.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            isFresh={freshSectionIds.has(section.id)}
          />
        ))}
        {gymWide.map((reset) => (
          <GymWideRow key={reset.id} reset={reset} lastVisited={lastVisited} />
        ))}
      </tbody>
    </table>
  );
}

function GymWideRow({ reset, lastVisited }: { reset: TimelineReset; lastVisited: string | null }) {
  const isFresh = lastVisited === null || reset.reset_on > lastVisited;
  const detail =
    reset.boulders_reset !== null
      ? `${reset.boulders_reset} new ${reset.boulders_reset === 1 ? "boulder" : "boulders"} across the gym`
      : "new boulders across the gym";
  return (
    <tr className="border-t border-foreground/10">
      <td className="py-1.5 font-medium text-foreground/90">{relativeDay(reset.reset_on)}</td>
      <td className="py-1.5 text-muted-foreground italic">{detail}</td>
      <td className="py-1.5 align-middle">
        <StatusDot state={isFresh ? "fresh" : "stale"} />
      </td>
    </tr>
  );
}

function SectionRow({ section, isFresh }: { section: Section; isFresh: boolean }) {
  const mostRecent = section.resets[0];
  const state: "fresh" | "stale" | "none" = !mostRecent ? "none" : isFresh ? "fresh" : "stale";
  return (
    <tr className="border-t border-foreground/10">
      <td className="py-1.5 font-medium text-foreground/90">{section.name}</td>
      <td className="py-1.5 text-muted-foreground">
        {mostRecent ? relativeDay(mostRecent.reset_on) : "—"}
      </td>
      <td className="py-1.5 align-middle">
        <StatusDot state={state} />
      </td>
    </tr>
  );
}
