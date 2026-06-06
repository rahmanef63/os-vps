"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionStatus = "loading" | "out" | "in";

// Client-side session probe. Hits /api/auth/me (which verifies the signed
// cookie server-side) — no Convex, no token plumbing. `refresh` re-checks after
// login/logout.
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = (await r.json()) as { authenticated?: boolean };
      setStatus(d.authenticated ? "in" : "out");
    } catch {
      setStatus("out");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, refresh };
}
