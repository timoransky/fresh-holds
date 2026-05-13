import { relativeDay } from "@/lib/date";
import type { GymWithSections, Reset, Section } from "@/lib/types";
import { StatusDot } from "@/components/gym/StatusDot";

type CountModeProps = {
  mode: "count";
  resets: Reset[];
  lastVisited: string | null;
};

type SectionModeProps = {
  mode: "sections";
  sections: GymWithSections["sections"];
  freshSectionIds: Set<string>;
};

type Props = CountModeProps | SectionModeProps;

export function GymResetTable(props: Props) {
  const headers =
    props.mode === "count" ? ["Date", "Boulders"] : ["Sector", "Last reset"];

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          <th className="text-left font-medium pb-1.5">{headers[0]}</th>
          <th className="text-left font-medium pb-1.5">{headers[1]}</th>
          <th className="w-4 pb-1.5" aria-label="status" />
        </tr>
      </thead>
      <tbody>
        {props.mode === "count"
          ? props.resets.map((reset) => (
              <CountRow key={reset.id} reset={reset} lastVisited={props.lastVisited} />
            ))
          : props.sections.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                isFresh={props.freshSectionIds.has(section.id)}
              />
            ))}
      </tbody>
    </table>
  );
}

function CountRow({ reset, lastVisited }: { reset: Reset; lastVisited: string | null }) {
  const isFresh = lastVisited === null || reset.reset_on > lastVisited;
  return (
    <tr className="border-t border-foreground/10">
      <td className="py-1.5 font-medium text-foreground/90">{relativeDay(reset.reset_on)}</td>
      <td className="py-1.5 text-muted-foreground">{reset.boulders_reset ?? 0}</td>
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
