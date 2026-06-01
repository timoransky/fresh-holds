"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RECENT_RESET_SORT_KEYS,
  type RecentResetSortKey,
} from "@/lib/db/admin-sort";

const LABELS: Record<RecentResetSortKey, string> = {
  reset_on: "Reset date",
  created_at: "Logged at",
  gym_name: "Gym name",
};

export function RecentResetsSort({ value }: { value: RecentResetSortKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next === "reset_on") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `?${query}` : "?", { scroll: false });
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-auto" aria-label="Sort recent resets">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RECENT_RESET_SORT_KEYS.map((key) => (
          <SelectItem key={key} value={key}>
            {LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
