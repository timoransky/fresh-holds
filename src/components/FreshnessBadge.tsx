import type { CSSProperties } from "react";
import type { FreshLabel } from "@/lib/freshness";
import type { Tier, TierKey } from "@/lib/tier";
import { tierBadgeStyle } from "@/lib/tier-style";
import { cn } from "@/lib/utils";

// Shapes share viewBox "0 0 120 60". Bumps may extend past those bounds; the
// SVG renders with overflow: visible so they don't get clipped.
const STALE_PATH =
  "M 2,30 C 2,8 8,2 30,2 C 50,1 70,1 90,2 C 112,2 118,8 118,30 C 118,52 112,58 90,58 C 70,59 50,59 30,58 C 8,58 2,52 2,30 Z";

const SLIM_PATH =
  "M 2,30 C 2,10 6,2 18,2 C 22,2 24,-3 30,-3 C 38,-3 52,10 60,10 C 68,10 82,-3 90,-3 C 96,-3 98,2 102,2 C 114,2 118,10 118,30 C 118,50 114,58 102,58 C 98,58 96,63 90,63 C 82,63 68,50 60,50 C 52,50 38,63 30,63 C 24,63 22,58 18,58 C 6,58 2,50 2,30 Z";

const WORTH_PATH =
  "M 2,30 C 2,12 6,2 14,2 C 16,2 16,-2 20,-2 C 24,-2 26,10 30,10 C 34,10 36,-2 40,-2 C 44,-2 46,10 50,10 C 54,10 56,-2 60,-2 C 64,-2 66,10 70,10 C 74,10 76,-2 80,-2 C 84,-2 86,10 90,10 C 94,10 96,-2 100,-2 C 104,-2 104,2 106,2 C 114,2 118,12 118,30 C 118,48 114,58 106,58 C 104,58 104,62 100,62 C 96,62 94,50 90,50 C 86,50 84,62 80,62 C 76,62 74,50 70,50 C 66,50 64,62 60,62 C 56,62 54,50 50,50 C 46,50 44,62 40,62 C 36,62 34,50 30,50 C 26,50 24,62 20,62 C 16,62 16,58 14,58 C 6,58 2,48 2,30 Z";

const HOT_PATH = (() => {
  const cx = 60;
  const cy = 30;
  const rx = 42;
  const ry = 20;
  const petals = 12;
  const peakK = 1.3;
  const valleyK = 0.85;
  const tan = 6;
  const N = petals * 2;
  const pts = Array.from({ length: N }, (_, i) => {
    const theta = (i / N) * Math.PI * 2;
    const k = i % 2 === 0 ? peakK : valleyK;
    return {
      x: cx + rx * k * Math.cos(theta),
      y: cy + ry * k * Math.sin(theta),
      tx: -Math.sin(theta),
      ty: Math.cos(theta),
    };
  });
  const f = (n: number) => n.toFixed(2);
  let d = `M ${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < N; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % N];
    d += ` C ${f(a.x + a.tx * tan)},${f(a.y + a.ty * tan)} ${f(b.x - b.tx * tan)},${f(b.y - b.ty * tan)} ${f(b.x)},${f(b.y)}`;
  }
  return d + " Z";
})();

const SHAPES: Record<TierKey, string> = {
  hot: HOT_PATH,
  worth: WORTH_PATH,
  slim: SLIM_PATH,
  stale: STALE_PATH,
  unknown: STALE_PATH,
};

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
  const shape = SHAPES[tier.key];

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

  const shadowOffset = isCompact ? 2 : 3;

  return (
    <div
      data-tier={tier.key}
      style={baseStyle}
      className={cn(
        "relative inline-flex items-center origin-center select-none text-(--tier-fg)",
        isCompact
          ? "gap-2 px-2.5 py-1.5 absolute -top-7 -right-7 md:-top-8 md:-right-8"
          : "gap-2 sm:gap-2.5 px-3 pl-2.5 py-2.5 md:px-4 md:pl-3 md:py-3 absolute -top-8 -right-8",
        !isCompact && bob && "motion-safe:animate-[badge-bob_3.6s_ease-in-out_infinite]",
        className,
      )}
    >
      <svg
        viewBox="0 0 120 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        {!isUnknown && (
          <path
            d={shape}
            fill="var(--tier-ring)"
            transform={`translate(0 ${shadowOffset})`}
          />
        )}
        <path
          d={shape}
          fill={isUnknown ? "transparent" : "var(--tier-bg)"}
          stroke="var(--tier-ring)"
          strokeWidth="2"
          strokeDasharray={isUnknown ? "4 4" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={cn("relative", isCompact ? "text-md leading-none" : "text-2xl leading-none")}
        aria-hidden
      >
        {tier.emoji}
      </span>
      <div className={cn("relative flex flex-col", isCompact ? "gap-0.5" : "gap-1")}>
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
