"use client";

import { useMemo } from "react";
import { rankGyms, type GymRanking, type RankedGym } from "@/lib/freshness";
import type { GymWithSections } from "@/lib/types";
import type { Visits } from "@/hooks/useVisits";

export type { GymRanking, RankedGym };

export function useGymRanking(gyms: GymWithSections[], visits: Visits): GymRanking {
  return useMemo(() => rankGyms(gyms, visits), [gyms, visits]);
}
