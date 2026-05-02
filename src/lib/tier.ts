export type TierKey = "hot" | "worth" | "slim" | "stale" | "unknown";

export type Tier = {
  key: TierKey;
  label: string;
  sub: string;
  emoji: string;
  rotateDeg: number;
};

export function percentToTier(percent: number | null): Tier {
  if (percent === null) {
    return {
      key: "unknown",
      label: "no data yet",
      sub: "no resets logged",
      emoji: "❓",
      rotateDeg: -1.5,
    };
  }
  if (percent >= 80) {
    return {
      key: "hot",
      label: "sending hot",
      sub: "freshest pick",
      emoji: "🔥",
      rotateDeg: -2,
    };
  }
  if (percent >= 40) {
    return {
      key: "worth",
      label: "worth a climb",
      sub: "decent options",
      emoji: "⚡",
      rotateDeg: 1.5,
    };
  }
  if (percent >= 1) {
    return {
      key: "slim",
      label: "slim pickings",
      sub: "a few new sectors",
      emoji: "🌱",
      rotateDeg: -1,
    };
  }
  return {
    key: "stale",
    label: "all stale",
    sub: "you've climbed it all",
    emoji: "💤",
    rotateDeg: 2,
  };
}
