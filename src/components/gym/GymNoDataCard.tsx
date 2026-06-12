import type { CSSProperties } from "react";
import { GymExternalLinks } from "@/components/gym/GymExternalLinks";
import type { GymWithSections } from "@/lib/types";

type Props = {
  gym: GymWithSections;
};

const surfaceStyle = {
  "--surface-stroke": "oklch(0.85 0.015 270)",
  "--surface-shadow": "oklch(0.55 0.02 270 / 0.15)",
} as CSSProperties;

export function GymNoDataCard({ gym }: Props) {
  return (
    <li
      style={surfaceStyle}
      className="sticker-surface squircle-3xl flex items-center justify-between gap-3 rounded-2xl bg-background p-4 sm:px-5"
    >
      <div className="min-w-0">
        <h2 className="font-bold tracking-tight text-foreground truncate text-lg">{gym.name}</h2>
        <p className="text-xs text-muted-foreground">No reset data - check for yourself</p>
      </div>

      <div className="shrink-0">
        <GymExternalLinks gym={gym} />
      </div>
    </li>
  );
}
