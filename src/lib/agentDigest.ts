import { rankGyms, mostRecentReset, type ScoredGym } from "@/lib/freshness";
import { mapsUrl, instagramUrl } from "@/lib/gymLinks";
import { relativeDay, todayISO } from "@/lib/date";
import type { GymWithSections, Section } from "@/lib/types";

// Generates the Markdown twin of the home page straight from the gym data —
// not from the rendered HTML. The HTML emits each runner-up gym twice (a mobile
// column and a desktop grid, one hidden by CSS); generating from data instead
// means every gym appears exactly once here.
export function renderGymsMarkdown(gyms: GymWithSections[]): string {
  const intro = [
    "# Fresh Holds — fresh bouldering in Bratislava",
    "",
    `Which Bratislava bouldering gym has the freshest climbing right now, ranked by recent resets — freshest first. Updated ${todayISO()}. A reset means new boulder problems were set on a section of a gym. Per-visit history lives in the browser only, so this list uses the anonymous "what's new lately" view rather than a personal one.`,
  ].join("\n");

  if (gyms.length === 0) {
    return `${intro}\n\n_No gyms registered yet._\n`;
  }

  return `${intro}\n\n${rankForDigest(gyms).map(gymBlock).join("\n\n")}\n`;
}

// rankGyms is the home page's single source of ordering truth (same score, same
// tiers). Empty visits because a shared document has no personal visit history —
// every gym is read through the anonymous lens, exactly what a first-time
// visitor sees. Its hero/runnersUp/noDataExtras buckets overlap only when no gym
// has data (runnersUp === noDataExtras), so flatten and dedupe by id to keep the
// "each gym exactly once" guarantee.
function rankForDigest(gyms: GymWithSections[]): ScoredGym[] {
  const { hero, runnersUp, noDataExtras } = rankGyms(gyms, {});
  const ordered: ScoredGym[] = [];
  const seen = new Set<string>();
  for (const scored of [hero, ...runnersUp, ...noDataExtras]) {
    if (scored && !seen.has(scored.gym.id)) {
      seen.add(scored.gym.id);
      ordered.push(scored);
    }
  }
  return ordered;
}

function gymBlock(scored: ScoredGym): string {
  const { gym, tier } = scored;
  const heading = gym.neighborhood ? `## ${gym.name} — ${gym.neighborhood}` : `## ${gym.name}`;
  const lines = [heading, "", `**${tier.emoji} ${tier.label}** — ${scored.narrative}`, ""];

  if (scored.hasResetData) {
    const latest = mostRecentReset(gym.sections);
    if (latest) {
      lines.push(
        `- **Last reset:** ${latest.reset_on} — ${latest.section_name} (${relativeDay(latest.reset_on)})`,
        "",
      );
    }
    lines.push(...sectorTable(scored.sectionsByRecent), "");
  }

  lines.push(linksLine(gym));
  return lines.join("\n");
}

// One row per sector, newest reset first, mirroring the card's reset table.
function sectorTable(sections: Section[]): string[] {
  const rows = sections.map((section) => {
    const latest = section.resets[0];
    const cell = latest ? `${latest.reset_on} (${relativeDay(latest.reset_on)})` : "—";
    return `| ${section.name} | ${cell} |`;
  });
  return ["| Sector | Last reset |", "| --- | --- |", ...rows];
}

function linksLine(gym: GymWithSections): string {
  const links = [`[Map](${mapsUrl(gym)})`];
  if (gym.website_url) links.push(`[Website](${gym.website_url})`);
  const ig = instagramUrl(gym);
  if (ig) links.push(`[Instagram](${ig})`);
  return `**Links:** ${links.join(" · ")}`;
}
