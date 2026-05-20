"use client";

import { useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { WifiDisconnected01Icon } from "@hugeicons/core-free-icons";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

// Assume online during SSR / first paint so we never render an "Offline"
// chip in the HTML or flash one during hydration.
function getOnlineServerSnapshot(): boolean {
  return true;
}

export function OfflineIndicator() {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]"
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="You're offline. Tap for details."
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-md ring-1 ring-amber-900/5 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <HugeiconsIcon icon={WifiDisconnected01Icon} strokeWidth={2} size={14} />
            Offline
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-72">
          <PopoverHeader>
            <PopoverTitle>You&rsquo;re offline</PopoverTitle>
          </PopoverHeader>
          <PopoverDescription>
            You can still browse the gym list you saw last and log visits — they&rsquo;re saved on
            your device and will sync once you&rsquo;re back online.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  );
}
