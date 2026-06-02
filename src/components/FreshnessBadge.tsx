import type { CSSProperties } from "react";
import type { FreshLabel } from "@/lib/freshness";
import type { Tier, TierKey } from "@/lib/tier";
import { tierBadgeStyle } from "@/lib/tier-style";
import { cn } from "@/lib/utils";

type Shape = { viewBox: string; path: string };

const HOT_SHAPE: Shape = {
  viewBox: "0 0 132 73",
  path: "M57.4729 2.71385C60.5423 1.22916 62.077 0.486815 63.6824 0.194332C65.1046 -0.0647686 66.5619 -0.0647685 67.9841 0.194332C69.5895 0.486815 71.1242 1.22916 74.1936 2.71385L79.7659 5.40914C81.4821 6.23927 82.3402 6.65433 83.2397 6.92688C84.0384 7.16887 84.8602 7.32687 85.6917 7.39834C86.6282 7.47882 87.579 7.41158 89.4807 7.27709L101.988 6.39255C106.67 6.06143 110.995 8.90353 112.549 13.3326C113.691 16.5876 116.37 19.0659 119.705 19.9504L127.187 21.9353C131.643 23.1175 133.17 28.6652 129.947 31.9618C127.66 34.3011 127.66 38.0387 129.947 40.3781C133.17 43.6747 131.643 49.2224 127.187 50.4045L119.705 52.3894C116.37 53.2739 113.691 55.7522 112.549 59.0072C110.995 63.4363 106.67 66.2784 101.988 65.9473L89.4807 65.0628C87.579 64.9283 86.6282 64.861 85.6917 64.9415C84.8602 65.013 84.0384 65.171 83.2397 65.413C82.3402 65.6855 81.4821 66.1006 79.7659 66.9307L74.1936 69.626C71.1242 71.1107 69.5895 71.853 67.9841 72.1455C66.5619 72.4046 65.1046 72.4046 63.6824 72.1455C62.077 71.853 60.5423 71.1107 57.4729 69.626L51.9006 66.9307C50.1844 66.1006 49.3263 65.6855 48.4268 65.413C47.6281 65.171 46.8063 65.013 45.9748 64.9415C45.0383 64.861 44.0875 64.9283 42.1858 65.0628L29.6786 65.9473C24.9965 66.2784 20.6717 63.4363 19.1179 59.0072C17.9759 55.7522 15.2961 53.2739 11.9619 52.3894L4.4799 50.4045C0.023704 49.2224 -1.50384 43.6747 1.71913 40.3781C4.00618 38.0387 4.00618 34.3011 1.71913 31.9618C-1.50384 28.6652 0.023705 23.1175 4.4799 21.9353L11.9619 19.9504C15.2961 19.0659 17.9759 16.5876 19.1179 13.3326C20.6717 8.90353 24.9966 6.06143 29.6786 6.39255L42.1858 7.27709C44.0875 7.41158 45.0383 7.47882 45.9748 7.39834C46.8063 7.32687 47.6281 7.16887 48.4268 6.92688C49.3263 6.65433 50.1844 6.23927 51.9006 5.40913L57.4729 2.71385Z",
};

const WORTH_SHAPE: Shape = {
  viewBox: "0 0 130 73",
  path: "M57.2988 2.16299C60.074 0.980453 61.4617 0.389183 62.9 0.155418C64.175 -0.0518099 65.4751 -0.0518099 66.7502 0.155418C68.1885 0.389183 69.5761 0.980453 72.3514 2.16299L84.5452 7.35875C85.7565 7.87487 86.3621 8.13292 86.988 8.32236C87.544 8.49066 88.1115 8.61837 88.686 8.70446C89.3327 8.80138 89.9905 8.82762 91.3061 8.88012L108.205 9.5544C113.819 9.77839 118.495 13.9314 119.381 19.4793L119.482 20.1173C119.973 23.1934 121.814 25.8888 124.501 27.4652C131.367 31.4932 131.367 41.4189 124.501 45.4469C121.814 47.0233 119.973 49.7187 119.482 52.7948L119.381 53.4328C118.495 58.9807 113.819 63.1337 108.205 63.3577L91.3061 64.032C89.9905 64.0845 89.3327 64.1107 88.686 64.2076C88.1115 64.2937 87.544 64.4214 86.988 64.5897C86.3621 64.7792 85.7565 65.0372 84.5452 65.5534L72.3514 70.7491C69.5761 71.9317 68.1885 72.5229 66.7502 72.7567C65.4751 72.9639 64.175 72.9639 62.9 72.7567C61.4617 72.5229 60.074 71.9317 57.2988 70.7491L45.1049 65.5534C43.8937 65.0372 43.288 64.7792 42.6622 64.5897C42.1062 64.4214 41.5387 64.2937 40.9641 64.2076C40.3175 64.1107 39.6597 64.0845 38.3441 64.032L21.4449 63.3577C15.8312 63.1337 11.155 58.9807 10.2695 53.4328L10.1677 52.7949C9.67673 49.7187 7.83575 47.0233 5.14897 45.4469C-1.71636 41.4189 -1.71637 31.4932 5.14897 27.4652C7.83575 25.8888 9.67673 23.1934 10.1677 20.1173L10.2695 19.4793C11.155 13.9314 15.8312 9.77839 21.4449 9.5544L38.3441 8.88012C39.6597 8.82762 40.3175 8.80138 40.9641 8.70446C41.5387 8.61837 42.1062 8.49066 42.6622 8.32236C43.288 8.13292 43.8937 7.87487 45.1049 7.35875L57.2988 2.16299Z",
};

const SLIM_SHAPE: Shape = {
  viewBox: "0 0 125 74",
  path: "M57.8168 0.797476C60.5859 -0.26579 63.6507 -0.265788 66.4198 0.797477L91.2054 10.3145C91.813 10.5478 92.4385 10.7313 93.0759 10.8632L114.664 15.3293C121.404 16.7237 125.593 23.4899 123.835 30.1446L122.928 33.5817C122.397 35.59 122.397 37.7016 122.928 39.71L123.835 43.147C125.593 49.8017 121.404 56.568 114.664 57.9623L93.0759 62.4285C92.4385 62.5603 91.813 62.7438 91.2054 62.9771L66.4198 72.4941C63.6507 73.5574 60.5859 73.5574 57.8168 72.4941L33.0312 62.9771C32.4236 62.7438 31.798 62.5603 31.1607 62.4285L9.57245 57.9623C2.83228 56.568 -1.35622 49.8017 0.401307 43.147L1.30904 39.71C1.83944 37.7016 1.83944 35.59 1.30904 33.5817L0.401307 30.1446C-1.35622 23.4899 2.83228 16.7237 9.57245 15.3293L31.1607 10.8632C31.798 10.7313 32.4236 10.5478 33.0312 10.3145L57.8168 0.797476Z",
};

const STALE_SHAPE: Shape = {
  viewBox: "0 0 130 63",
  path: "M61.0994 0.374522C63.6435 -0.124869 66.2603 -0.124871 68.8044 0.37452L120.215 10.4664C125.844 11.5714 129.904 16.5055 129.904 22.2417V39.9949C129.904 45.7311 125.844 50.6652 120.215 51.7701L68.8044 61.8621C66.2603 62.3614 63.6435 62.3614 61.0994 61.8621L9.68853 51.7701C4.05971 50.6652 0 45.7311 0 39.9949V22.2417C0 16.5055 4.05971 11.5714 9.68852 10.4664L61.0994 0.374522Z",
};

const SHAPES: Record<TierKey, Shape> = {
  hot: HOT_SHAPE,
  worth: WORTH_SHAPE,
  slim: SLIM_SHAPE,
  stale: STALE_SHAPE,
  unknown: STALE_SHAPE,
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

  const dropOffset = isCompact ? 3 : 4;

  return (
    <div
      data-tier={tier.key}
      style={baseStyle}
      className={cn(
        "relative inline-flex flex-col items-center justify-center origin-center select-none text-(--tier-fg)",
        isCompact
          ? "gap-0.5 px-5 pt-2 pb-3 absolute -top-7 -right-7 md:-top-8 md:-right-8"
          : "gap-1 px-7 py-3 md:px-8 md:pt-3 md:pb-4 absolute -top-8 -right-8",
        !isCompact && bob && "motion-safe:animate-[badge-bob_3.6s_ease-in-out_infinite]",

        className,
      )}
    >
      <svg
        viewBox={shape.viewBox}
        preserveAspectRatio="none"
        className={cn(
          "pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] overflow-visible",
        )}
        aria-hidden
      >
        {!isUnknown && (
          <path d={shape.path} fill="var(--tier-ring)" transform={`translate(0 ${dropOffset})`} />
        )}
        <path
          d={shape.path}
          fill={isUnknown ? "transparent" : "var(--tier-bg)"}
          stroke="var(--tier-ring)"
          strokeWidth={2}
          strokeDasharray={isUnknown ? "4 4" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={cn(
          "relative font-extrabold tracking-tight lowercase leading-none text-center",
          isCompact ? "text-sm" : "text-base",
        )}
      >
        {tier.label}
      </span>
      <div className="relative flex items-baseline gap-1">
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
  );
}
