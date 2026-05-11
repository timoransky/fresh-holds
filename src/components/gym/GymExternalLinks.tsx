import { AtSignIcon, GlobeIcon, NavigationIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { instagramUrl, mapsUrl } from "@/lib/gymLinks";
import type { Gym } from "@/lib/types";

type Props = {
  gym: Pick<Gym, "name" | "neighborhood" | "website_url" | "instagram_handle">;
};

export function GymExternalLinks({ gym }: Props) {
  const ig = instagramUrl(gym);

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="icon-sm" className="rounded-full">
        <a
          href={mapsUrl(gym)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${gym.name} in Google Maps`}
        >
          <NavigationIcon />
        </a>
      </Button>
      {gym.website_url && (
        <Button asChild variant="outline" size="icon-sm" className="rounded-full">
          <a
            href={gym.website_url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${gym.name} website`}
          >
            <GlobeIcon />
          </a>
        </Button>
      )}
      {ig && (
        <Button asChild variant="outline" size="icon-sm" className="rounded-full">
          <a
            href={ig}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${gym.name} on Instagram`}
          >
            <AtSignIcon />
          </a>
        </Button>
      )}
    </div>
  );
}
