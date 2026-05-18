import type { GymWithResets, Reset } from "@/lib/types";

export function resetsByRecent(gym: GymWithResets): Reset[] {
  return [...gym.resets].sort((a, b) => b.reset_on.localeCompare(a.reset_on));
}

export function mostRecentReset(gym: GymWithResets): Reset | null {
  let best: Reset | null = null;
  for (const reset of gym.resets) {
    if (best === null || reset.reset_on > best.reset_on) best = reset;
  }
  return best;
}
