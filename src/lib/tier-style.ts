import type { CSSProperties } from "react";
import type { Tier } from "@/lib/tier";

export function tierBadgeStyle(tier: Tier): CSSProperties {
  return {
    "--tier-bg": tier.tokens.badge.bg,
    "--tier-fg": tier.tokens.badge.fg,
    "--tier-ring": tier.tokens.badge.ring,
    ...(tier.anim && {
      "--anim-y": tier.anim.y,
      "--anim-dur": tier.anim.dur,
    }),
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
