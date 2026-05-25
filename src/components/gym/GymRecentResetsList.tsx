import { relativeDay } from "@/lib/date";
import type { RecentReset } from "@/lib/freshness";
import { StatusDot } from "@/components/gym/StatusDot";

type Props = {
  resets: RecentReset[];
  // When true (≥2 sectors), show the sector column so the user knows where the
  // reset happened. For single-sector gyms it's redundant and we hide it.
  showSectorColumn: boolean;
};

export function GymRecentResetsList({ resets, showSectorColumn }: Props) {
  if (resets.length === 0) {
    return <p className="text-xs text-muted-foreground">No resets in the recent window.</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {showSectorColumn && <th className="text-left font-medium pb-1.5">Sector</th>}
          <th className="text-left font-medium pb-1.5">Reset</th>
          <th className="w-4 pb-1.5" aria-label="status" />
        </tr>
      </thead>
      <tbody>
        {resets.map((reset) => (
          <tr key={reset.id} className="border-t border-foreground/10">
            {showSectorColumn && (
              <td className="py-1.5 font-medium text-foreground/90">{reset.section_name}</td>
            )}
            <td className="py-1.5 text-muted-foreground">{relativeDay(reset.reset_on)}</td>
            <td className="py-1.5 align-middle">
              <StatusDot state={reset.isFresh ? "fresh" : "stale"} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
