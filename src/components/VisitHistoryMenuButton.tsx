"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useVisitHistory } from "@/components/user/VisitHistoryContext";

export function VisitHistoryMenuButton() {
  const { setOpen, closePopover } = useVisitHistory();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => {
        closePopover();
        setOpen(true);
      }}
    >
      <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
      Visit history
    </Button>
  );
}
