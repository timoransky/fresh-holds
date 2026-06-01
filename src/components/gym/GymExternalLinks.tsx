import { Globe02Icon, InstagramIcon, MapingIcon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { IconLink } from "@/components/ui/icon-link";
import { iclubUrl, instagramUrl, mapsUrl } from "@/lib/gymLinks";
import type { Gym } from "@/lib/types";

type Props = {
  gym: Pick<Gym, "name" | "neighborhood" | "website_url" | "instagram_handle" | "iclub_slug">;
};

export function GymExternalLinks({ gym }: Props) {
  const ig = instagramUrl(gym);
  const iclub = iclubUrl(gym);

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
      {iclub && (
        <IconLink
          href={iclub}
          icon={QrCodeIcon}
          label={`Open ${gym.name} on iclub`}
        />
      )}
    </div>
  );
}
