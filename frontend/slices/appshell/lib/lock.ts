"use client";

import { useSyncExternalStore } from "react";
import { registerCommands } from "./commands";

// Lock screen — overlay state + an optional consumer-injected unlock guard
// (auth check). No guard → click/key unlocks (kiosk-style privacy curtain).
// Idle auto-lock minutes persist to sv:autolock; the bundled lock-screen
// feature owns the idle timer.

let locked = false;
let guard: (() => boolean | Promise<boolean>) | null = null;
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}

export function lock(): void {
  if (!locked) {
    locked = true;
    emit();
  }
}

/** Runs the consumer guard (if any); unlocks when it passes. */
export async function requestUnlock(): Promise<boolean> {
  if (!locked) return true;
  const ok = guard ? await guard() : true;
  if (ok) {
    locked = false;
    emit();
  }
  return ok;
}

/** Consumer auth hook — return false to keep the screen locked. */
export function setUnlockGuard(fn: (() => boolean | Promise<boolean>) | null): void {
  guard = fn;
}

export function useLocked(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => locked,
    () => locked,
  );
}

// ── idle auto-lock preference (minutes; null = off) ─────────────────────────
const KEY = "sv:autolock";

export function autoLockMinutes(): number | null {
  if (typeof localStorage === "undefined") return null;
  const v = Number(localStorage.getItem(KEY));
  return Number.isFinite(v) && v > 0 ? v : null;
}

registerCommands("lock", [
  {
    id: "lock:now",
    label: "Lock screen",
    hint: "System",
    keywords: "privacy curtain idle away",
    run: lock,
  },
]);
