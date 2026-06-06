"use client";

import { useSyncExternalStore } from "react";

// Live-activity store — the SSOT behind the Dynamic Island pill. Any app can
// publish a running activity (render, copy, long task); the pill shows the most
// recent one and lets the user tap back into the owning app. Same external-store
// pattern as lib/toast.ts and lib/store.ts.

export type Activity = {
  /** Stable key per source so updates replace, not stack (e.g. "reel:render"). */
  id: string;
  /** App id to focus when the pill is tapped. */
  appId?: string;
  label: string;
  detail?: string;
  /** 0–100 for a determinate ring; null/undefined = indeterminate. */
  progress?: number | null;
  /** "active" pulses; "done" shows a check; "error" shows a cross. */
  tone?: "active" | "done" | "error";
};

type Listener = () => void;

let activities: Activity[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

const store = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get(): Activity[] {
    return activities;
  },
};

/** Publish or update an activity (keyed by `id`). */
export function setActivity(id: string, a: Omit<Activity, "id">) {
  activities = [...activities.filter((x) => x.id !== id), { id, ...a }];
  emit();
}

/** Remove an activity (no-op if absent). */
export function clearActivity(id: string) {
  const next = activities.filter((x) => x.id !== id);
  if (next.length === activities.length) return;
  activities = next;
  emit();
}

/** Live activity list (most-recent last). */
export function useActivities(): Activity[] {
  return useSyncExternalStore(store.subscribe, store.get, () => activities);
}
