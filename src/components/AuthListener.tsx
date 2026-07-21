"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Bridges browser-side auth changes to the server-rendered UI.
 *
 * Every logged-in/out surface (HeaderAuth, GymList `authed`, the narrative
 * voice) is server-rendered from the auth cookie, so a client sign-in/out
 * leaves them stale until a server re-render. This single listener calls
 * `router.refresh()` on any real auth transition — login, logout, cross-tab —
 * so the whole tree re-fetches without a manual reload.
 */
export function AuthListener() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;

      // The first callback (INITIAL_SESSION) just reports what the server
      // already rendered — record it without refreshing.
      if (lastUserId.current === undefined) {
        lastUserId.current = uid;
        return;
      }

      // Refresh only when the signed-in user actually changes, so routine
      // token refreshes (same uid) don't churn the server tree.
      if (uid !== lastUserId.current) {
        lastUserId.current = uid;
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return null;
}
