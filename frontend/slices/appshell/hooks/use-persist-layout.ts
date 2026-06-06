"use client";

import { useEffect, useRef } from "react";
import { shellStore, hydrate, serialize } from "../lib/store";
import { useShellConfig } from "../registry/shell-config";
import type { PersistedWindow } from "../lib/types";

// Window layout persists to localStorage (per-browser, debounced). No backend —
// the layout is inherently per-device, so the browser IS the right home for it.
// The key comes from the manifest (`persistKey`) so the generic shell never
// hardcodes a consumer's namespace.
export function usePersistLayout() {
  const { persistKey } = useShellConfig();
  const ready = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) hydrate(JSON.parse(raw) as PersistedWindow[]);
    } catch {
      /* corrupt cache — start clean */
    }
    ready.current = true;
  }, [persistKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = shellStore.subscribe(() => {
      if (!ready.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(persistKey, JSON.stringify(serialize()));
        } catch {
          /* quota / private mode */
        }
      }, 600); // never persist per-frame
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [persistKey]);
}
