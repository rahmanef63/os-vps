"use client";

// localStorage-backed state, SSR-safe. Reads once on mount (so the server and
// first client render agree on the initial value), then mirrors writes back.
import { useEffect, useRef, useState } from "react";

export type HistoryEntry = { url: string; title: string; time: number };
export type Bookmark = { url: string; title: string };

export function usePersistent<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* corrupt / unavailable — keep initial */
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
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
