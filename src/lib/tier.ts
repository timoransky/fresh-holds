import { daysSince, type FreshnessResult } from "@/lib/freshness";

export type TierKey = "hot" | "worth" | "slim" | "stale" | "unknown";

export type Tier = {
  key: TierKey;
  label: string;
  emoji: string;
  rotateDeg: number;
};

const HOT_DAYS = 3;
const WORTH_DAYS = 14;

export function freshnessTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) {
    return { key: "unknown", label: "no data yet", emoji: "❓", rotateDeg: -1.5 };
  }
  if (result.freshResetCount === 0 || result.mostRecentFreshISO === null) {
    return { key: "stale", label: "all stale", emoji: "💤", rotateDeg: 2 };
  }

  const days = Math.max(0, daysSince(result.mostRecentFreshISO));
  if (days <= HOT_DAYS) {
    return { key: "hot", label: "sending hot", emoji: "🔥", rotateDeg: -2 };
  }
  if (days <= WORTH_DAYS) {
    return { key: "worth", label: "worth a climb", emoji: "⚡", rotateDeg: 1.5 };
  }
  return { key: "slim", label: "slim pickings", emoji: "🌱", rotateDeg: -1 };
}
