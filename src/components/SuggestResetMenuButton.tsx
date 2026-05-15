"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useSuggestReset } from "@/components/user/SuggestResetContext";

export function SuggestResetMenuButton() {
  const { setOpen, closePopover } = useSuggestReset();

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="w-full"
      onClick={() => {
        closePopover();
        setOpen(true);
      }}
    >
      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
      Suggest a reset
    </Button>
  );
}
