import type { CSSProperties } from "react";
import type { Tier } from "@/lib/tier";
import { tierBadgeStyle } from "@/lib/tier-style";
import { cn } from "@/lib/utils";

type Props = {
  tier: Tier;
  size?: "hero" | "compact";
  bob?: boolean;
  className?: string;
};

// Emoji + tier title only. The exact "how much / how recent" lives in the card's
// narrative line right below — see ADR-0003 "Display language".
export function FreshnessBadge({ tier, size = "hero", bob = false, className }: Props) {
  const isUnknown = tier.key === "unknown";

  const baseStyle: CSSProperties = {
    ...tierBadgeStyle(tier),
    ["--rot" as string]: `${tier.rotateDeg}deg`,
    transform: `rotate(${tier.rotateDeg}deg)`,
  };

  const isCompact = size === "compact";

  return (
    <div
      data-tier={tier.key}
      style={baseStyle}
      className={cn(
        isCompact
          ? "inline-flex items-center gap-2 origin-center select-none rounded-xl squircle-2xl border-2 px-2.5 py-1.5 shadow-[0_2px_0_0_var(--tier-ring)] absolute -top-7 -right-7 md:-top-8 md:-right-8"
          : "inline-flex items-center gap-2 sm:gap-2.5 origin-center select-none rounded-2xl squircle-3xl border-2 px-3 pl-2.5 py-2.5 md:px-4 md:pl-3 md:py-3 shadow-[0_3px_0_0_var(--tier-ring)] absolute -top-8 -right-8",
        "bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)",
        isUnknown && "border-dashed shadow-none",
        !isCompact && bob && "motion-safe:animate-[badge-bob_3.6s_ease-in-out_infinite]",
        className,
      )}
    >
      <span className={isCompact ? "text-md leading-none" : "text-2xl leading-none"} aria-hidden>
        {tier.emoji}
      </span>
      <span
        className={cn(
          "font-extrabold tracking-tight lowercase leading-none",
          isCompact ? "text-sm" : "text-base",
        )}
      >
        {tier.label}
      </span>
    </div>
  );
}
