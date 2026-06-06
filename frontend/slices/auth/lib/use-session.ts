"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionStatus = "loading" | "out" | "in";

// Client-side session probe. Hits /api/auth/me (which verifies the signed
// cookie server-side) — no Convex, no token plumbing. `refresh` re-checks after
// login/logout.
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("loading");

  // Pure probe (no setState) so the mount effect can use the .then form —
  // react-hooks/set-state-in-effect treats async callbacks that set state as
  // synchronous when invoked from an effect body.
  const probe = useCallback(async (): Promise<SessionStatus> => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = (await r.json()) as { authenticated?: boolean };
      return d.authenticated ? "in" : "out";
    } catch {
      return "out";
    }
  }, []);

  const refresh = useCallback(async () => {
    setStatus(await probe());
  }, [probe]);

  useEffect(() => {
    let alive = true;
    probe().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, [probe]);

  return { status, refresh };
}
