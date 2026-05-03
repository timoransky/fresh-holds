import type { CSSProperties } from "react";
import { percentToTier, type TierKey } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Props = {
  percent: number | null;
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

export function FreshnessBadge({ percent, size = "hero", bob = false, className }: Props) {
  const tier = percentToTier(percent);
  const isUnknown = tier.key === "unknown";

  const baseStyle: CSSProperties = {
    ...tierStyles[tier.key],
    ["--rot" as string]: `${tier.rotateDeg}deg`,
    transform: `rotate(${tier.rotateDeg}deg)`,
  };

  if (size === "compact") {
    return (
      <div
        data-tier={tier.key}
        style={baseStyle}
        className={cn(
          "inline-flex items-center gap-1.5 origin-center select-none rounded-2xl border-2 px-2.5 py-1.5",
          "shadow-[0_3px_0_0_var(--tier-ring)]",
          "bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)",
          "absolute -top-4 -right-4",
          isUnknown && "border-dashed shadow-none",
          className,
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {tier.emoji}
        </span>
        <span className="font-mono text-sm font-bold tabular-nums leading-none">
          {percent !== null ? `${percent}%` : "—"}
        </span>
      </div>
    );
  }

  return (
    <div
      data-tier={tier.key}
      style={baseStyle}
      className={cn(
        "inline-flex flex-col items-start gap-0.5 origin-center select-none rounded-2xl border-2 px-4 py-3 ",
        "shadow-[0_3px_0_0_var(--tier-ring)]",
        "absolute -top-8 -right-8",
        "bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)",
        isUnknown && "border-dashed shadow-none",
        bob && "motion-safe:animate-[badge-bob_3.6s_ease-in-out_infinite]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {tier.emoji}
        </span>
        <span className="text-base font-extrabold tracking-tight lowercase leading-none">
          {tier.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 self-stretch">
        <span className="font-mono text-2xl font-bold tabular-nums leading-none">
          {percent !== null ? (
            <>
              {percent}
              <span className="text-base font-bold opacity-60">%</span>
            </>
          ) : (
            <span className="text-base opacity-60">—</span>
          )}
        </span>
      </div>
    </div>
  );
}
