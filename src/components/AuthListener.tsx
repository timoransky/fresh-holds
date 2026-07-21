"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  /** The user id the server just rendered from the auth cookie (`null` if signed out). */
  userId: string | null;
};

/**
 * Bridges browser-side auth changes to the server-rendered UI.
 *
 * Every logged-in/out surface (HeaderAuth, GymList `authed`, the narrative
 * voice) is server-rendered from the auth cookie, so a client sign-in/out
 * leaves them stale until a server re-render. This single listener calls
 * `router.refresh()` on any real auth transition — login, logout, cross-tab —
 * so the whole tree re-fetches without a manual reload.
 *
 * The baseline is seeded from the server-rendered `userId`, not from the
 * listener's own first callback: the client is created during render but only
 * subscribes in an effect, so the one-shot `INITIAL_SESSION` event can be
 * emitted in that gap and missed. Seeding from the server truth makes the very
 * first login/logout a detectable transition regardless of that race.
 */
export function AuthListener({ userId }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const lastUserId = useRef(userId);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;

      // Refresh only when the signed-in user actually changes, so routine
      // token refreshes and the initial session (same uid) don't churn the
      // server tree.
      if (uid !== lastUserId.current) {
        lastUserId.current = uid;
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return null;
}
