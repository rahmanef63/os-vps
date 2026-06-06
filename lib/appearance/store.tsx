"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { TWEAK_DEFAULTS, type Tweaks, type ServerConfig } from "./types";

const KEY = "os-vps:tweaks";

type Ctx = {
  tweaks: Tweaks;
  setTweaks: (patch: Partial<Tweaks>) => void;
  setServer: (patch: Partial<ServerConfig>) => void;
};

const AppearanceContext = createContext<Ctx | null>(null);

// Applies the visual tweaks to <html> (data-theme + dir-* + accent) and
// persists them. Kept tiny; the actual palette lives in globals.css tokens.
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [tweaks, setState] = useState<Tweaks>(TWEAK_DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-hydration restore: this provider wraps SSR'd markup (login screen reads the wallpaper tweak), so a lazy initializer reading localStorage would hydration-mismatch
      if (raw) setState({ ...TWEAK_DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = tweaks.theme;
    el.classList.remove("dir-aqua", "dir-graphite", "dir-vivid");
    el.classList.add(`dir-${tweaks.dir}`);
    el.classList.toggle("reduce-glass", tweaks.reduceGlass);
    el.style.setProperty("--accent", tweaks.accent);
    try {
      localStorage.setItem(KEY, JSON.stringify(tweaks));
    } catch {
      /* quota / private mode */
    }
  }, [tweaks]);

  const setTweaks = useCallback(
    (patch: Partial<Tweaks>) => setState((t) => ({ ...t, ...patch })),
    [],
  );
  const setServer = useCallback(
    (patch: Partial<ServerConfig>) =>
      setState((t) => ({ ...t, server: { ...t.server, ...patch } })),
    [],
  );

  return (
    <AppearanceContext.Provider value={{ tweaks, setTweaks, setServer }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Ctx {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
