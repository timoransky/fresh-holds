export type Reset = {
  id: string;
  reset_on: string;
  notes: string | null;
  boulders_reset: number | null;
  section_id: string | null;
  section_name: string | null;
};

export type Section = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

export type Gym = {
  id: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  city_id: string | null;
};

// Resets are flat (newest first) and self-describe their sector attribution.
// The catalog of named sections lives elsewhere (admin form only needs it).
export type GymWithResets = Gym & {
  resets: Reset[];
};

export type VisitHistory = Record<string, string[]>;
