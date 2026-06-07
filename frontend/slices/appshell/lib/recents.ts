"use client";

import { useSyncExternalStore } from "react";
import { shellStore } from "./store-state";

// Recently-used apps — "continue where you left off". Self-contained: instead
// of patching every launch path (dock, palette, launcher, URL sync…), this
// module subscribes to the window store and records each NEW window's app.
// Persisted to localStorage `sv:recents`, newest first, deduped per app.

export type RecentApp = { app: string; ts: number };

const KEY = "sv:recents";
const CAP = 12;

function load(): RecentApp[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as RecentApp[];
    return Array.isArray(v) ? v.slice(0, CAP) : [];
  } catch {
    return [];
  }
}

let recents: RecentApp[] = load();
const subs = new Set<() => void>();

function record(app: string) {
  const ts = typeof Date !== "undefined" ? Date.now() : 0;
  recents = [{ app, ts }, ...recents.filter((r) => r.app !== app)].slice(0, CAP);
  try {
    localStorage.setItem(KEY, JSON.stringify(recents));
  } catch {
    /* ignore quota */
  }
  subs.forEach((f) => f());
}

// Watch for window ids we haven't seen — each one is an app launch (or a boot
// restore, which harmlessly refreshes the same entries).
let seen = new Set<string>(shellStore.getOrder());
shellStore.subscribe(() => {
  const order = shellStore.getOrder();
  for (const id of order) {
    if (!seen.has(id)) record(shellStore.getWindow(id)!.app);
  }
  seen = new Set(order);
});

/** Recent apps, newest first. */
export function listRecents(): RecentApp[] {
  return recents;
}

export function useRecents(): RecentApp[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => recents,
    () => recents,
  );
}
