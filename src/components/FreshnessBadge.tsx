import type { CSSProperties } from "react";
import { badgeCountLabel, type FreshLabel } from "@/lib/freshness";
import type { Tier, TierKey } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Props = {
  tier: Tier;
  label: FreshLabel | null;
  size?: "hero" | "compact";
  bob?: boolean;
  className?: string;
};

const tierStyles: Record<TierKey, CSSProperties> = {
  hot: {
    "--tier-bg": "oklch(0.93 0.08 30)",
    "--tier-fg": "oklch(0.38 0.18 30)",
    "--tier-ring": "oklch(0.55 0.20 30)",
  } as CSSProperties,
  worth: {
    "--tier-bg": "oklch(0.94 0.13 92)",
    "--tier-fg": "oklch(0.36 0.10 70)",
    "--tier-ring": "oklch(0.62 0.16 80)",
  } as CSSProperties,
  slim: {
    "--tier-bg": "oklch(0.93 0.07 165)",
    "--tier-fg": "oklch(0.36 0.10 165)",
    "--tier-ring": "oklch(0.58 0.13 165)",
  } as CSSProperties,
  stale: {
    "--tier-bg": "oklch(0.93 0.025 285)",
    "--tier-fg": "oklch(0.42 0.04 285)",
    "--tier-ring": "oklch(0.65 0.05 285)",
  } as CSSProperties,
  unknown: {
    "--tier-bg": "transparent",
    "--tier-fg": "oklch(0.5 0 0)",
    "--tier-ring": "oklch(0.78 0 0)",
  } as CSSProperties,
};

export function FreshnessBadge({ tier, label, size = "hero", bob = false, className }: Props) {
  const isUnknown = tier.key === "unknown";

  const baseStyle: CSSProperties = {
    ...tierStyles[tier.key],
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
          ? "inline-flex items-center gap-2 origin-center select-none rounded-xl squircle-2xl border-2 px-3 py-2 shadow-[0_2px_0_0_var(--tier-ring)] absolute -top-7 -right-7 md:-top-8 md:-right-8"
          : "inline-flex items-center gap-2.5 origin-center select-none rounded-2xl squircle-3xl border-2 px-4 pl-3 py-3 shadow-[0_3px_0_0_var(--tier-ring)] absolute -top-8 -right-8",
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
              <span className={numberClass}>{label.count}</span>
              <span className={descriptorClass}>{badgeCountLabel(label)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
