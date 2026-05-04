import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button squircle-xl inline-flex cursor-pointer shrink-0 items-center rounded-lg justify-center border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "!rounded-full bg-[oklch(0.45_0.18_260)] text-[oklch(0.99_0.004_90)] font-semibold border-[oklch(0.30_0.16_260)] hover:bg-[oklch(0.45_0.18_260)] shadow-[0_2px_0_0_oklch(0.30_0.16_260)] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_oklch(0.30_0.16_260)] active:shadow-[0_1px_0_0_oklch(0.30_0.16_260)]",
        outline:
          "border-[var(--surface-stroke,var(--foreground))] bg-background shadow-[0_2px_0_0_var(--surface-stroke,var(--foreground))] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--surface-stroke,var(--foreground))] active:shadow-[0_1px_0_0_var(--surface-stroke,var(--foreground))] aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-background/60 hover:text-foreground aria-expanded:bg-background/90 aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md in-data-[slot=button-group]:squircle-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] squircle-md px-2 text-xs in-data-[slot=button-group]:rounded-md in-data-[slot=button-group]:squircle-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] squircle-md px-2.5 in-data-[slot=button-group]:rounded-md in-data-[slot=button-group]:squircle-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] squircle-md in-data-[slot=button-group]:rounded-md in-data-[slot=button-group]:squircle-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] squircle-md in-data-[slot=button-group]:rounded-md in-data-[slot=button-group]:squircle-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
