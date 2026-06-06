"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LAYOUT, findLayout } from "./layout";

// Workspace layout preset id, persisted to localStorage. Restored after mount
// (not in the initial state) to avoid an SSR/client hydration mismatch.
export function useLayout(): [string, (id: string) => void] {
  const [layout, setLayoutState] = useState<string>(DEFAULT_LAYOUT);

  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("reel.layout") : null;
    if (v && findLayout(v).id === v) setLayoutState(v);
  }, []);

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
