import type { CSSProperties } from "react";
import type { FreshnessResult } from "@/lib/freshness";

export type TierKey = "hot" | "worth" | "slim" | "stale" | "unknown";

export type TierTokens = {
  badge: { bg: string; fg: string; ring: string };
  card: { badgeWidth: string; tint: string; stroke: string; shadow: string };
};

export type Tier = {
  key: TierKey;
  label: string;
  emoji: string;
  rotateDeg: number;
  tokens: TierTokens;
};

// Novelty-score bins. Score is `freshResetCount * min(daysSinceVisit / 7, 1)` — a gym
// you haven't been to in a week with 2+ fresh resets clears HOT_SCORE; one fresh
// reset on a week-overdue gym sits at WORTH_SCORE.
const HOT_SCORE = 2;
const WORTH_SCORE = 1;
// Hard floor: even if there are fresh resets, a gym you visited within the last
// JUST_VISITED_DAYS days isn't worth recommending — you were just there.
const JUST_VISITED_DAYS = 2;

const HOT: Tier = {
  key: "hot",
  label: "sending hot",
  emoji: "🔥",
  rotateDeg: -2,
  tokens: {
    badge: { bg: "oklch(0.93 0.08 30)", fg: "oklch(0.38 0.18 30)", ring: "oklch(0.55 0.20 30)" },
    card: {
      badgeWidth: "140px",
      tint: "oklch(0.97 0.04 30 / 0.7)",
      stroke: "oklch(0.86 0.07 30)",
      shadow: "oklch(0.55 0.20 30 / 0.18)",
    },
  },
};

const WORTH: Tier = {
  key: "worth",
  label: "worth a climb",
  emoji: "💪",
  rotateDeg: 1.5,
  tokens: {
    badge: { bg: "oklch(0.94 0.13 92)", fg: "oklch(0.36 0.10 70)", ring: "oklch(0.62 0.16 80)" },
    card: {
      badgeWidth: "110px",
      tint: "oklch(0.97 0.07 92 / 0.7)",
      stroke: "oklch(0.88 0.09 85)",
      shadow: "oklch(0.62 0.16 80 / 0.18)",
    },
  },
};

const SLIM: Tier = {
  key: "slim",
  label: "slim pickings",
  emoji: "🥱",
  rotateDeg: -1,
  tokens: {
    badge: { bg: "oklch(0.93 0.07 165)", fg: "oklch(0.36 0.10 165)", ring: "oklch(0.58 0.13 165)" },
    card: {
      badgeWidth: "110px",
      tint: "oklch(0.97 0.04 165 / 0.7)",
      stroke: "oklch(0.87 0.06 165)",
      shadow: "oklch(0.58 0.13 165 / 0.16)",
    },
  },
};

const STALE: Tier = {
  key: "stale",
  label: "all stale",
  emoji: "💤",
  rotateDeg: 2,
  tokens: {
    badge: { bg: "oklch(0.93 0.025 285)", fg: "oklch(0.42 0.04 285)", ring: "oklch(0.65 0.05 285)" },
    card: {
      badgeWidth: "110px",
      tint: "oklch(0.96 0.015 285 / 0.7)",
      stroke: "oklch(0.86 0.03 285)",
      shadow: "oklch(0.65 0.05 285 / 0.14)",
    },
  },
};

const UNKNOWN: Tier = {
  key: "unknown",
  label: "no data yet",
  emoji: "❓",
  rotateDeg: -1.5,
  tokens: {
    badge: { bg: "transparent", fg: "oklch(0.5 0 0)", ring: "oklch(0.78 0 0)" },
    card: {
      badgeWidth: "110px",
      tint: "oklch(1 0 0 / 0.7)",
      stroke: "oklch(0.86 0 0)",
      shadow: "oklch(0.55 0 0 / 0.10)",
    },
  },
};

export function freshnessTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) return UNKNOWN;

  if (result.daysSinceVisit !== null && result.daysSinceVisit <= JUST_VISITED_DAYS) {
    return STALE;
  }

  if (result.noveltyScore >= HOT_SCORE) return HOT;
  if (result.noveltyScore >= WORTH_SCORE) return WORTH;
  if (result.noveltyScore > 0) return SLIM;
  return STALE;
}

export function tierBadgeStyle(tier: Tier): CSSProperties {
  return {
    "--tier-bg": tier.tokens.badge.bg,
    "--tier-fg": tier.tokens.badge.fg,
    "--tier-ring": tier.tokens.badge.ring,
  } as CSSProperties;
}

export function tierCardStyle(tier: Tier): CSSProperties {
  return {
    "--badge-width": tier.tokens.card.badgeWidth,
    "--surface-tint": tier.tokens.card.tint,
    "--surface-stroke": tier.tokens.card.stroke,
    "--surface-shadow": tier.tokens.card.shadow,
  } as CSSProperties;
}
