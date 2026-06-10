import type { Gym } from "@/lib/types";

type LinkableGym = Pick<Gym, "name" | "neighborhood" | "instagram_handle"> &
  Partial<Pick<Gym, "iclub_slug">>;

export function mapsUrl(gym: LinkableGym): string {
  const query = [gym.name, gym.neighborhood, "Bratislava"].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function instagramUrl(gym: LinkableGym): string | null {
  if (!gym.instagram_handle) return null;
  return `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`;
}

// Deep-links to the gym's iclub login page, skipping the buried gym picker.
// The /klient/<slug>/ path is the same route iclub uses internally after
// auth — landing here means the user just signs in for that gym directly.
export function iclubUrl(gym: LinkableGym): string | null {
  if (!gym.iclub_slug) return null;
  return `https://online.iclub.sk/klient/${gym.iclub_slug}/#/ucet/prihlasenie`;
}
