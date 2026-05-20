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

// Assume online during SSR / first paint so the indicator never appears
// in the HTML or flashes during hydration.
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

  // Fixed overlay that mirrors the home page's centered container so the
  // chip sits at the same coordinates as the rest of the header row, then
  // stays put while the page scrolls. pointer-events-none on the overlay
  // keeps the empty space click-through; the chip itself opts back in.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-40 sm:top-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="pointer-events-auto inline-block">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="You're offline. Tap for details."
                className="inline-flex items-center gap-1.5 rounded-full border border-orange-400 bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-900 ring-1 ring-orange-900/5 transition hover:bg-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <HugeiconsIcon icon={WifiDisconnected01Icon} strokeWidth={2} size={14} />
                Offline
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <PopoverHeader>
                <PopoverTitle>You&rsquo;re offline</PopoverTitle>
              </PopoverHeader>
              <PopoverDescription>
                You can still browse the gym list you saw last and log visits — they&rsquo;re saved
                on your device and will sync once you&rsquo;re back online.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
