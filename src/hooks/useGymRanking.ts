"use client";

import { useMemo } from "react";
import { rankGyms, type GymRanking, type RankedGym } from "@/lib/ranking";
import type { GymWithSections } from "@/lib/types";
import type { Visits } from "@/hooks/useVisits";

export type { GymRanking, RankedGym };

export function useGymRanking(
  gyms: GymWithSections[],
  visits: Visits,
  now: number,
): GymRanking {
  return useMemo(() => rankGyms(gyms, visits, now), [gyms, visits, now]);
}
