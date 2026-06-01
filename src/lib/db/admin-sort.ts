export const RECENT_RESET_SORT_KEYS = ["reset_on", "created_at", "gym_name"] as const;
export type RecentResetSortKey = (typeof RECENT_RESET_SORT_KEYS)[number];

export function parseRecentResetSort(value: string | undefined): RecentResetSortKey {
  return RECENT_RESET_SORT_KEYS.includes(value as RecentResetSortKey)
    ? (value as RecentResetSortKey)
    : "reset_on";
}
