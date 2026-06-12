export type TierKey = "hot" | "fresh" | "worth" | "slim" | "stale" | "unknown";

export type TierTokens = {
  badge: { bg: string; fg: string; ring: string };
  card: { badgeWidth: string; tint: string; stroke: string; shadow: string };
};

// Badge idle animation, graded by tier: the hotter the tier, the livelier the
// badge. One shared keyframe (badge-float in globals.css) reads these as CSS
// vars. null = perfectly still (stale is asleep, unknown has nothing to say).
export type TierAnim = {
  y: string; // peak vertical lift
  rot: string; // extra rotation at peak, on top of the static rotateDeg
  scale: number; // peak scale
  dur: string; // full cycle duration (shorter = more energetic)
};

export type Tier = {
  key: TierKey;
  label: string;
  emoji: string;
  rotateDeg: number;
  anim: TierAnim | null;
  tokens: TierTokens;
};

export const HOT: Tier = {
  key: "hot",
  label: "sending hot",
  emoji: "🔥",
  rotateDeg: -2,
  anim: { y: "-4px", rot: "2.5deg", scale: 1.06, dur: "1.6s" },
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

// Amber tier sitting between HOT (hue 30) and WORTH (hue 92). Reachable without a
// visit gap — it's how a recent, substantial reset stands out on the first-open
// page. See ADR-0002 (never-visited recency model).
export const FRESH: Tier = {
  key: "fresh",
  label: "looking fresh",
  emoji: "👀",
  rotateDeg: 2.5,
  anim: { y: "-3px", rot: "1.2deg", scale: 1.02, dur: "3s" },
  tokens: {
    badge: { bg: "oklch(0.93 0.11 65)", fg: "oklch(0.37 0.13 55)", ring: "oklch(0.60 0.17 60)" },
    card: {
      badgeWidth: "150px",
      tint: "oklch(0.97 0.06 65 / 0.7)",
      stroke: "oklch(0.88 0.08 62)",
      shadow: "oklch(0.60 0.17 60 / 0.18)",
    },
  },
};

export const WORTH: Tier = {
  key: "worth",
  label: "worth a climb",
  emoji: "💪",
  rotateDeg: 1.5,
  anim: { y: "-2px", rot: "0.7deg", scale: 1, dur: "4.5s" },
  tokens: {
    badge: { bg: "oklch(0.94 0.13 92)", fg: "oklch(0.36 0.10 70)", ring: "oklch(0.62 0.16 80)" },
    card: {
      badgeWidth: "150px",
      tint: "oklch(0.97 0.07 92 / 0.7)",
      stroke: "oklch(0.88 0.09 85)",
      shadow: "oklch(0.62 0.16 80 / 0.18)",
    },
  },
};

export const SLIM: Tier = {
  key: "slim",
  label: "slim pickings",
  emoji: "🥱",
  rotateDeg: -1,
  anim: { y: "-1px", rot: "0.4deg", scale: 1, dur: "6.5s" },
  tokens: {
    badge: { bg: "oklch(0.93 0.07 165)", fg: "oklch(0.36 0.10 165)", ring: "oklch(0.58 0.13 165)" },
    card: {
      badgeWidth: "150px",
      tint: "oklch(0.97 0.04 165 / 0.7)",
      stroke: "oklch(0.87 0.06 165)",
      shadow: "oklch(0.58 0.13 165 / 0.16)",
    },
  },
};

export const STALE: Tier = {
  key: "stale",
  label: "all stale",
  emoji: "💤",
  rotateDeg: 2,
  anim: null,
  tokens: {
    badge: {
      bg: "oklch(0.93 0.025 285)",
      fg: "oklch(0.42 0.04 285)",
      ring: "oklch(0.65 0.05 285)",
    },
    card: {
      badgeWidth: "125px",
      tint: "oklch(0.96 0.015 285 / 0.7)",
      stroke: "oklch(0.86 0.03 285)",
      shadow: "oklch(0.65 0.05 285 / 0.14)",
    },
  },
};

export const UNKNOWN: Tier = {
  key: "unknown",
  label: "no data yet",
  emoji: "❓",
  rotateDeg: -1.5,
  anim: null,
  tokens: {
    badge: { bg: "transparent", fg: "oklch(0.5 0 0)", ring: "oklch(0.78 0 0)" },
    card: {
      badgeWidth: "135px",
      tint: "oklch(1 0 0 / 0.7)",
      stroke: "oklch(0.86 0 0)",
      shadow: "oklch(0.55 0 0 / 0.10)",
    },
  },
};
