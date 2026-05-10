import type { Gym } from "@/lib/types";

type LinkableGym = Pick<Gym, "name" | "neighborhood" | "instagram_handle">;

export function mapsUrl(gym: LinkableGym): string {
  const query = [gym.name, gym.neighborhood, "Bratislava"].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function instagramUrl(gym: LinkableGym): string | null {
  if (!gym.instagram_handle) return null;
  return `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`;
}
