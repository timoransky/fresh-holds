import { relativeDay } from "@/lib/date";
import type { RecentReset } from "@/lib/freshness";

type Props = {
  resets: RecentReset[];
  // When true (≥2 sectors), show the sector column so the user knows where the
  // reset happened. For single-sector gyms it's redundant and we hide it.
  showSectorColumn: boolean;
  // Every listed row is already "new" relative to the user's cutoff (their last
  // visit, or the anon month window), so no per-row status marker is needed —
  // only the empty-state copy differs by audience.
  isAnon: boolean;
};

export function GymRecentResetsList({ resets, showSectorColumn, isAnon }: Props) {
  if (resets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {isAnon ? "No resets in the last month." : "Nothing new since your last visit."}
      </p>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {showSectorColumn && <th className="text-left font-medium pb-1.5">Sector</th>}
          <th className="text-left font-medium pb-1.5">Reset</th>
        </tr>
      </thead>
      <tbody>
        {resets.map((reset) => (
          <tr key={reset.id} className="border-t border-foreground/10">
            {showSectorColumn && (
              <td className="py-1.5 font-medium text-foreground/90">{reset.section_name}</td>
            )}
            <td className="py-1.5 text-muted-foreground">{relativeDay(reset.reset_on)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
