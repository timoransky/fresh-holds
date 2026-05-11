import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

function BrandBadge({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="brand-badge"
      className={cn(
        "inline-block rounded-full border-2 border-foreground/80 bg-background text-foreground",
        "px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
        className,
      )}
      {...props}
    />
  );
}

export { BrandBadge };
