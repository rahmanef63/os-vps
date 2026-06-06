"use client";

// localStorage-backed state. Reads lazily on first client render (the browser
// app mounts client-side only — window bundles load post-hydration, so the
// initializer never runs during SSR markup that could mismatch), then mirrors
// writes back. `key` must be stable for the hook's lifetime.
import { useEffect, useState } from "react";

export type HistoryEntry = { url: string; title: string; time: number };
export type Bookmark = { url: string; title: string };

export function usePersistent<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial; /* corrupt / unavailable */
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / private mode */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Compact relative timestamp for the history list. */
export function relTime(t: number): string {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
