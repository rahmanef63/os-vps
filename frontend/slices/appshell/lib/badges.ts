"use client";

import { useSyncExternalStore } from "react";

// App-icon badge store — count pill, attention dot, or progress ring on any
// app's icon, across every shell (dock, taskbar, launchpad, mobile home).
// Same external-store pattern as lib/activity.ts / lib/commands.ts. Producers
// call setBadge; the <AppBadge> overlay inside <AppIcon> renders it.

export type AppIconBadge = {
  /** Unread-style red pill (rendered "99+" past 99). Omit/0 = no pill. */
  count?: number;
  /** Plain attention dot (used when there is no meaningful count). */
  dot?: boolean;
  /** 0–100 → determinate progress ring; null → indeterminate spinner. */
  progress?: number | null;
};

let badges: Record<string, AppIconBadge> = {};
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}

/** Set (or clear, with null) the badge on an app's icon. */
export function setBadge(appId: string, badge: AppIconBadge | null): void {
  if (badge === null) {
    if (!(appId in badges)) return;
    const { [appId]: _gone, ...rest } = badges;
    badges = rest;
  } else {
    badges = { ...badges, [appId]: badge };
  }
  emit();
}

export function getBadge(appId: string): AppIconBadge | undefined {
  return badges[appId];
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};

/** One app's badge (undefined = none). Identity-stable while unchanged. */
export function useBadge(appId: string): AppIconBadge | undefined {
  return useSyncExternalStore(
    subscribe,
    () => badges[appId],
    () => badges[appId],
  );
}

/** The whole badge map (Settings/debug surfaces). */
export function useBadges(): Record<string, AppIconBadge> {
  return useSyncExternalStore(
    subscribe,
    () => badges,
    () => badges,
  );
}
