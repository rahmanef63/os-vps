"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTHED_EVENT } from "@/lib/prefs/use-prefs-sync";
import { IS_DEMO } from "@/lib/demo";

export type SessionStatus = "loading" | "out" | "in";

type SessionValue = {
  status: SessionStatus;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

// ONE shared session probe for the whole app. The public shell, the OsApi
// mock↔live switch, and the Settings sign-in all read this single source of
// truth — so there's no double /api/auth/me and no mock→live flash on the
// owner's cold load. `refresh()` re-checks after login; `signOut()` clears it.
const SessionContext = createContext<SessionValue>({
  status: "out",
  refresh: async () => {},
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>(IS_DEMO ? "out" : "loading");

  const probe = useCallback(async (): Promise<SessionStatus> => {
    if (IS_DEMO) return "out"; // demo makes no /api calls
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = (await r.json()) as { authenticated?: boolean };
      return d.authenticated ? "in" : "out";
    } catch {
      return "out";
    }
  }, []);

  const refresh = useCallback(async () => {
    const s = await probe();
    setStatus(s);
    // Providers mounted above the shell (appearance/quicklinks) 401'd their
    // initial GET /api/prefs while signed out; announce the login so prefs-sync
    // re-pulls with the fresh cookie.
    if (s === "in") window.dispatchEvent(new Event(AUTHED_EVENT));
  }, [probe]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* best-effort — clear locally regardless */
    }
    setStatus("out");
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    probe().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, [probe]);

  const value = useMemo(() => ({ status, refresh, signOut }), [status, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
