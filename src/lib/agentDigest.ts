import { mostRecentReset } from "@/lib/freshness";
import { relativeDay } from "@/lib/date";
import { todayISO } from "@/lib/date";
import type { GymWithSections } from "@/lib/types";

export function renderGymsMarkdown(gyms: GymWithSections[]): string {
  const intro = [
    "# Fresh Holds — Bratislava bouldering gym resets",
    "",
    `Updated ${todayISO()}. Lists every active bouldering gym in Bratislava, Slovakia along with the most recent climbing-route resets logged in the last ~240 days.`,
    "",
    "A reset means new boulder problems were set on a section of the gym (or across the gym, when the operator didn't specify). Gyms below are sorted newest-reset first, so the gym at the top usually has the freshest climbing. Per-user visit history is stored in the browser only and is not included here.",
  ].join("\n");

  if (gyms.length === 0) {
    return `${intro}\n\n_No gyms registered._\n`;
  }

  const sorted = [...gyms].sort((a, b) => {
    const ra = mostRecentReset(a)?.reset_on ?? "";
    const rb = mostRecentReset(b)?.reset_on ?? "";
    return rb.localeCompare(ra);
  });

  return `${intro}\n\n${sorted.map(gymBlock).join("\n")}`;
}

function gymBlock(gym: GymWithSections): string {
  const heading = gym.neighborhood ? `## ${gym.name} — ${gym.neighborhood}` : `## ${gym.name}`;
  const links: string[] = [];
  if (gym.website_url) links.push(`- Website: ${gym.website_url}`);
  if (gym.instagram_handle) links.push(`- Instagram: @${gym.instagram_handle}`);

  const recent = mostRecentReset(gym);
  if (!recent) {
    return [heading, "", ...links, "", "_No recent reset data logged._", ""].join("\n");
  }

  const recentSection = recent.section_name ?? "across the gym";
  const recentLine = `- Most recent reset: ${recent.reset_on} (${recentSection}, ${relativeDay(recent.reset_on)})`;
  const sectionRows = gym.sections.flatMap((s) =>
    s.resets.map((r) => ({
      date: r.reset_on,
      section: s.name as string | null,
      boulders: r.boulders_reset,
      notes: r.notes,
    })),
  );
  const gymWideRows = gym.gymWideResets.map((r) => ({
    date: r.reset_on,
    section: null as string | null,
    boulders: r.boulders_reset,
    notes: r.notes,
  }));
  const allResets = [...sectionRows, ...gymWideRows]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => {
      const label = r.section ?? "across the gym";
      const boulders = r.boulders
        ? ` (${r.boulders} ${r.boulders === 1 ? "boulder" : "boulders"})`
        : "";
      const notes = r.notes ? ` — ${r.notes}` : "";
      return `- ${r.date} — ${label}${boulders}${notes}`;
    });

  return [heading, "", recentLine, ...links, "", "Recent resets:", ...allResets, ""].join("\n");
}
