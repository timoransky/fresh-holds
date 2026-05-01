import { cn } from "@/lib/utils";

export const ledgeButtonClass = cn(
  "rounded-full cursor-pointer border-(--surface-stroke) bg-background",
  "shadow-[0_2px_0_0_var(--surface-stroke)]",
  "hover:-translate-y-0.5 hover:bg-background",
  "hover:shadow-[0_3px_0_0_var(--surface-stroke)]",
  "active:translate-y-0.5",
  "active:shadow-[0_1px_0_0_var(--surface-stroke)]",
);
