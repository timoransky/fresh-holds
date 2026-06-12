import { relativeDay } from "@/lib/date";
import type { GymWithSections, Section } from "@/lib/types";
import { StatusDot } from "@/components/gym/StatusDot";

type Props = {
  sections: GymWithSections["sections"];
  freshSectionIds: string[];
  // Anon users have no visit to anchor "fresh since your visit", so the dots
  // would mark an invisible internal window — misleading. Instead: show the
  // recently-reset sectors plainly, and fold the quiet ones into one muted row.
  isAnon: boolean;
};

export function GymResetTable({ sections, freshSectionIds, isAnon }: Props) {
  const recentSections = sections.filter((s) => freshSectionIds.includes(s.id));
  // If nothing is recent (a stale gym), the dates tell the story themselves.
  const visibleSections = isAnon && recentSections.length > 0 ? recentSections : sections;
  const hiddenCount = sections.length - visibleSections.length;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          <th className="text-left font-medium pb-1.5">Sector</th>
          <th className="text-left font-medium pb-1.5">Last reset</th>
          {!isAnon && <th className="w-4 pb-1.5" aria-label="status" />}
        </tr>
      </thead>
      <tbody>
        {visibleSections.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            isFresh={freshSectionIds.includes(section.id)}
            showDot={!isAnon}
          />
        ))}
        {hiddenCount > 0 && (
          <tr className="border-t border-foreground/10">
            <td colSpan={2} className="py-1.5 text-muted-foreground/70 italic">
              + {hiddenCount} more {hiddenCount === 1 ? "sector" : "sectors"} with older sets
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function SectionRow({
  section,
  isFresh,
  showDot,
}: {
  section: Section;
  isFresh: boolean;
  showDot: boolean;
}) {
  const mostRecent = section.resets[0];
  const state: "fresh" | "stale" | "none" = !mostRecent ? "none" : isFresh ? "fresh" : "stale";
  return (
    <tr className="border-t border-foreground/10">
      <td className="py-1.5 font-medium text-foreground/90">{section.name}</td>
      <td className="py-1.5 text-muted-foreground">
        {mostRecent ? relativeDay(mostRecent.reset_on) : "—"}
      </td>
      {showDot && (
        <td className="py-1.5 align-middle">
          <StatusDot state={state} />
        </td>
      )}
    </tr>
  );
}
