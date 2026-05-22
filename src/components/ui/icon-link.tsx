import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconLinkProps = {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
} & React.ComponentProps<"a">;

export function IconLink({
  icon,
  label,
  target = "_blank",
  rel = "noreferrer",
  className,
  ...props
}: IconLinkProps) {
  return (
    <Button asChild variant="outline" size="icon-sm" className={cn("rounded-full", className)}>
      <a target={target} rel={rel} aria-label={label} {...props}>
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </a>
    </Button>
  );
}
