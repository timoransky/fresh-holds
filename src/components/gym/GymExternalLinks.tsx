import { Globe02Icon, InstagramIcon, MapingIcon } from "@hugeicons/core-free-icons";
import { IconLink } from "@/components/ui/icon-link";
import { instagramUrl, mapsUrl } from "@/lib/gymLinks";
import type { Gym } from "@/lib/types";

type Props = {
  gym: Pick<Gym, "name" | "neighborhood" | "website_url" | "instagram_handle">;
};

export function GymExternalLinks({ gym }: Props) {
  const ig = instagramUrl(gym);

  return (
    <div className="flex gap-2">
      <IconLink
        href={mapsUrl(gym)}
        icon={MapingIcon}
        label={`Open ${gym.name} in Google Maps`}
      />
      {gym.website_url && (
        <IconLink
          href={gym.website_url}
          icon={Globe02Icon}
          label={`Open ${gym.name} website`}
        />
      )}
      {ig && (
        <IconLink
          href={ig}
          icon={InstagramIcon}
          label={`Open ${gym.name} on Instagram`}
        />
      )}
    </div>
  );
}
