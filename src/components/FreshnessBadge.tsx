import type { CSSProperties } from "react";
import type { FreshLabel } from "@/lib/freshness";
import type { Tier } from "@/lib/tier";
import { tierBadgeStyle } from "@/lib/tier-style";
import { cn } from "@/lib/utils";

type Props = {
  tier: Tier;
  label: FreshLabel | null;
  badgeNumber: number;
  badgeText: string;
  size?: "hero" | "compact";
  bob?: boolean;
  className?: string;
};

export function FreshnessBadge({
  tier,
  label,
  badgeNumber,
  badgeText,
  size = "hero",
  bob = false,
  className,
}: Props) {
  const isUnknown = tier.key === "unknown";

  const baseStyle: CSSProperties = {
    ...tierBadgeStyle(tier),
    ["--rot" as string]: `${tier.rotateDeg}deg`,
    transform: `rotate(${tier.rotateDeg}deg)`,
  };

  const isCompact = size === "compact";
  const numberClass = isCompact
    ? "font-mono text-md font-semibold tabular-nums leading-none"
    : "font-mono text-xl font-semibold tabular-nums leading-none";
  const descriptorClass = isCompact ? "text-xs font-semibold" : "text-sm font-semibold";

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
      <div className={cn("flex flex-col", isCompact ? "gap-0.5" : "gap-1")}>
        <span
          className={cn(
            "font-extrabold tracking-tight lowercase leading-none",
            isCompact ? "text-sm" : "text-base",
          )}
        >
          {tier.label}
        </span>
        <div className="flex items-baseline gap-1">
          {label === null ? (
            <span className={numberClass}>—</span>
          ) : (
            <>
              <span className={numberClass}>{badgeNumber}</span>
              <span className={descriptorClass}>{badgeText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
