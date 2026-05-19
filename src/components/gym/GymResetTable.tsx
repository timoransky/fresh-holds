import { relativeDay } from "@/lib/date";
import type { GymWithSections, Section } from "@/lib/types";
import { StatusDot } from "@/components/gym/StatusDot";

type Props = {
  sections: GymWithSections["sections"];
  freshSectionIds: string[];
};

export function GymResetTable({ sections, freshSectionIds }: Props) {
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
            isFresh={freshSectionIds.includes(section.id)}
          />
        ))}
      </tbody>
    </table>
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
