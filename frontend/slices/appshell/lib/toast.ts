"use client";

import { useSyncExternalStore } from "react";
import { setBadge } from "./badges";

// Module-level toast store — same external-store pattern as lib/store.ts.
// Other slices import `toast` from the barrel to fire transient notifications;
// <ToastHost> reads them via `useToasts` and renders the stack.

export type ToastTone = "default" | "success" | "error";

/** Optional inline action button (e.g. "Reload" on a new-version toast). */
export type ToastAction = { label: string; onClick: () => void };

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
};

export type ToastOptions = {
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. Default ~3.5s. Pass 0 to keep it sticky. */
  duration?: number;
  /** Inline action button. A toast with an action defaults to sticky. */
  action?: ToastAction;
  /** Owning app — its icon gets an unread-count badge until the center is read. */
  appId?: string;
};

type Listener = () => void;

/** A toast that has fallen off the transient stack but lives on in the
 *  Notification Center history (desktop tray / mobile center). */
export type NotificationItem = {
  id: number;
  message: string;
  tone: ToastTone;
  /** Epoch ms when fired — the center groups + relative-times off this. */
  ts: number;
  read: boolean;
  /** Owning app (drives the icon's unread badge). */
  appId?: string;
  /** Inline action, carried over from the toast (in-memory log only). */
  action?: ToastAction;
};

// ── Unread badges ────────────────────────────────────────────────────────────
// Notifications with an appId own that app's icon badge: unread count while
// any are unread, cleared when read/dismissed. Apps that setBadge() manually
// should not also send appId'd toasts (last writer wins).
let badgedApps = new Set<string>();
function syncNotificationBadges() {
  const counts = new Map<string, number>();
  for (const n of log) {
    if (n.appId && !n.read) counts.set(n.appId, (counts.get(n.appId) ?? 0) + 1);
  }
  for (const id of badgedApps) if (!counts.has(id)) setBadge(id, null);
  counts.forEach((count, id) => setBadge(id, { count }));
  badgedApps = new Set(counts.keys());
}

let toasts: Toast[] = [];
let log: NotificationItem[] = [];
const LOG_CAP = 60;
let seq = 0;
const listeners = new Set<Listener>();
const logListeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}
function emitLog() {
  logListeners.forEach((l) => l());
}

const toastStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get(): Toast[] {
    return toasts;
  },
};

const logStore = {
  subscribe(l: Listener) {
    logListeners.add(l);
    return () => logListeners.delete(l);
  },
  get(): NotificationItem[] {
    return log;
  },
};

// Focus mode: quiet toasts skip the transient stack but still log + badge.
let quiet = false;
export function setToastsQuiet(v: boolean) {
  quiet = v;
}

/** Push a transient toast. Auto-dismisses after `duration` (default 3.5s).
 *  Every toast is also appended to the persistent Notification Center log. */
export function toast(message: string, opts: ToastOptions = {}): number {
  const id = ++seq;
  const tone = opts.tone ?? "default";
  if (!quiet) toasts = [...toasts, { id, message, tone, action: opts.action }];
  const ts = typeof Date !== "undefined" ? Date.now() : 0;
  log = [{ id, message, tone, ts, read: false, appId: opts.appId, action: opts.action }, ...log].slice(0, LOG_CAP);
  emit();
  emitLog();
  syncNotificationBadges();
  // Toasts carrying an action stay until tapped/dismissed unless told otherwise.
  const duration = opts.duration ?? (opts.action ? 0 : 3500);
  if (typeof window !== "undefined" && duration > 0) {
    window.setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function dismissToast(id: number) {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

/** Read the live toast stack. Empty-array snapshot is stable across renders. */
export function useToasts(): Toast[] {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, () => toasts);
}

// ── Notification Center history ──────────────────────────────────────────────
/** Read the persistent notification log (newest first). */
export function useNotifications(): NotificationItem[] {
  return useSyncExternalStore(logStore.subscribe, logStore.get, () => log);
}
/** Drop one notification from the history. */
export function dismissNotification(id: number) {
  const next = log.filter((n) => n.id !== id);
  if (next.length === log.length) return;
  log = next;
  emitLog();
  syncNotificationBadges();
}
/** Empty the whole history. */
export function clearNotifications() {
  if (!log.length) return;
  log = [];
  emitLog();
  syncNotificationBadges();
}
/** Mark every notification read (clears the unread badges). */
export function markNotificationsRead() {
  if (!log.some((n) => !n.read)) return;
  log = log.map((n) => (n.read ? n : { ...n, read: true }));
  emitLog();
  syncNotificationBadges();
}
