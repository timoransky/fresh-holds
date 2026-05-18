"use client";

import { cn } from "@/lib/utils";

function getInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

export function AvatarTrigger({
  email,
  className,
  open,
  ...props
}: React.ComponentProps<"button"> & { email: string; open: boolean }) {
  return (
    <button
      type="button"
      aria-label={`Account menu (${email})`}
      className={cn(
        "relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full",
        "bg-brand text-background font-heading text-base font-bold leading-none",
        "border border-brand-shadow shadow-[0_2px_0_0_var(--color-brand-shadow)]",
        "transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-brand-shadow)]",
        "focus-visible:-translate-y-0.5 focus-visible:shadow-[0_4px_0_0_var(--color-brand-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:translate-y-px active:shadow-[0_1px_0_0_var(--color-brand-shadow)]",
        "aria-expanded:-translate-y-0.5 aria-expanded:shadow-[0_4px_0_0_var(--color-brand-shadow)]",
        open && "translate-y-px! shadow-[0_1px_0_0_var(--color-brand-shadow)]!",
        className,
      )}
      {...props}
    >
      <span className="translate-y-px">{getInitial(email)}</span>
    </button>
  );
}
