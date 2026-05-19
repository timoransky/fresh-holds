"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex items-center gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
            {item.badgeCount && item.badgeCount > 0 ? (
              <Badge
                variant={active ? "secondary" : "default"}
                className="h-4 min-w-4 px-1 text-[10px] font-bold"
              >
                {item.badgeCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
