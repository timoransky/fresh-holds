import { relativeDay } from "@/lib/date";
import type { Reset } from "@/lib/types";
import { StatusDot } from "@/components/gym/StatusDot";

type Props = {
  resets: Reset[];
  lastVisited: string | null;
};

// Chronological list of every reset in the lookback window. Each row labels
// its sector when known and surfaces boulder count + notes if the operator
// shared them. No clever per-sector aggregation — the table is just the log.
export function GymResetTable({ resets, lastVisited }: Props) {
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
        {resets.map((reset) => (
          <ResetRow key={reset.id} reset={reset} lastVisited={lastVisited} />
        ))}
      </tbody>
    </table>
  );
}

function ResetRow({ reset, lastVisited }: { reset: Reset; lastVisited: string | null }) {
  const isFresh = lastVisited === null || reset.reset_on > lastVisited;
  const sectorLabel = reset.section_name ?? (
    <span className="italic">across the gym</span>
  );
  const count =
    reset.boulders_reset !== null ? (
      <span className="text-foreground/70">
        {" "}
        · {reset.boulders_reset} {reset.boulders_reset === 1 ? "boulder" : "boulders"}
      </span>
    ) : null;

  return (
    <tr className="border-t border-foreground/10">
      <td className="py-1.5 font-medium text-foreground/90">{relativeDay(reset.reset_on)}</td>
      <td className="py-1.5 text-muted-foreground">
        {sectorLabel}
        {count}
      </td>
      <td className="py-1.5 align-middle">
        <StatusDot state={isFresh ? "fresh" : "stale"} />
      </td>
    </tr>
  );
}
