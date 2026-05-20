"use client";

import { useEffect } from "react";

// Production-only by design: dev mode + a stale-while-revalidate SW causes
// confusing stale-HTML behavior across HMR reloads. Test the PWA with
// `next build && next start` (and Lighthouse for the audit).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // SW is a progressive enhancement — swallow failures silently.
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
