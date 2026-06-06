"use client";

import { useCallback, useState } from "react";
import { DEFAULT_LAYOUT, findLayout } from "./layout";

// Workspace layout preset id, persisted to localStorage. Read lazily on first
// client render — the reel app mounts client-side only (window bundles load
// post-hydration), so the initializer never runs during SSR markup.
export function useLayout(): [string, (id: string) => void] {
  const [layout, setLayoutState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYOUT;
    const v = localStorage.getItem("reel.layout");
    return v && findLayout(v).id === v ? v : DEFAULT_LAYOUT;
  });

  const setLayout = useCallback((id: string) => {
    setLayoutState(id);
    try {
      localStorage.setItem("reel.layout", id);
    } catch {
      /* private mode / quota — layout just won't persist */
    }
  }, []);

  return [layout, setLayout];
}
