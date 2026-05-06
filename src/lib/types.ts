export type FreshnessMode = "sections" | "count";

export type Reset = {
  id: string;
  reset_on: string;
  notes: string | null;
  boulders_reset: number | null;
};

export type Section = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  resets: Reset[];
};

export type Gym = {
  id: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  city_id: string | null;
  freshness_mode: FreshnessMode;
};

export type GymWithSections = Gym & {
  sections: Section[];
};
