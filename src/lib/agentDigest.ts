import { mostRecentReset, resetsByRecent } from "@/lib/freshness";
import { relativeDay, todayISO } from "@/lib/date";
import type { GymWithResets } from "@/lib/types";

export function renderGymsMarkdown(gyms: GymWithResets[]): string {
  const intro = [
    "# Fresh Holds — Bratislava bouldering gym resets",
    "",
    `Updated ${todayISO()}. Lists every active bouldering gym in Bratislava, Slovakia along with the most recent climbing-route resets logged in the last ~240 days.`,
    "",
    "A reset means new boulder problems were set somewhere in the gym. Each row notes the sector when known, the boulder count when shared, and free-form notes from the operator. Gyms below are sorted newest-reset first, so the gym at the top usually has the freshest climbing. Per-user visit history is stored in the browser only and is not included here.",
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

function gymBlock(gym: GymWithResets): string {
  const heading = gym.neighborhood ? `## ${gym.name} — ${gym.neighborhood}` : `## ${gym.name}`;
  const links: string[] = [];
  if (gym.website_url) links.push(`- Website: ${gym.website_url}`);
  if (gym.instagram_handle) links.push(`- Instagram: @${gym.instagram_handle}`);

  const recent = mostRecentReset(gym);
  if (!recent) {
    return [heading, "", ...links, "", "_No recent reset data logged._", ""].join("\n");
  }

  const recentLabel = recent.section_name ?? "across the gym";
  const recentLine = `- Most recent reset: ${recent.reset_on} (${recentLabel}, ${relativeDay(recent.reset_on)})`;

  const allResets = resetsByRecent(gym).map((r) => {
    const label = r.section_name ?? "across the gym";
    const boulders = r.boulders_reset
      ? ` (${r.boulders_reset} ${r.boulders_reset === 1 ? "boulder" : "boulders"})`
      : "";
    const notes = r.notes ? ` — ${r.notes}` : "";
    return `- ${r.reset_on} — ${label}${boulders}${notes}`;
  });

  return [heading, "", recentLine, ...links, "", "Recent resets:", ...allResets, ""].join("\n");
}
