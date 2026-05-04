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
          "inline-flex items-center gap-2 origin-center select-none rounded-xl squircle-2xl border-2 px-3 py-2",
          "shadow-[0_2px_0_0_var(--tier-ring)]",
          "bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)",
          "absolute -top-6 -right-6 md:-top-7 md:-right-7",
          isUnknown && "border-dashed shadow-none",
          className,
        )}
      >
        <span className="text-md leading-none" aria-hidden>
          {tier.emoji}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-extrabold tracking-tight lowercase leading-none">
            {tier.label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-md font-semibold tabular-nums leading-none">
              {percent !== null ? (
                <>
                  {percent}
                  <span className="text-xs">%</span>
                </>
              ) : (
                "—"
              )}
            </span>
            {percent !== null && <span className="text-xs font-semibold">fresh</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-tier={tier.key}
      style={baseStyle}
      className={cn(
        "inline-flex items-center gap-2.5 origin-center select-none rounded-2xl squircle-3xl border-2 px-4 pl-3 py-3",
        "shadow-[0_3px_0_0_var(--tier-ring)]",
        "absolute -top-8 -right-8",
        "bg-(--tier-bg) text-(--tier-fg) border-(--tier-ring)",
        isUnknown && "border-dashed shadow-none",
        bob && "motion-safe:animate-[badge-bob_3.6s_ease-in-out_infinite]",
        className,
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {tier.emoji}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-base font-extrabold tracking-tight lowercase leading-none">
          {tier.label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums leading-none">
            {percent !== null ? (
              <>
                {percent}
                <span className="text-base">%</span>
              </>
            ) : (
              "—"
            )}
          </span>
          {percent !== null && <span className="text-sm font-semibold">fresh</span>}
        </div>
      </div>
    </div>
  );
}
