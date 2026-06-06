"use client";

import { useSyncExternalStore } from "react";

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
};

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

/** Push a transient toast. Auto-dismisses after `duration` (default 3.5s).
 *  Every toast is also appended to the persistent Notification Center log. */
export function toast(message: string, opts: ToastOptions = {}): number {
  const id = ++seq;
  const tone = opts.tone ?? "default";
  toasts = [...toasts, { id, message, tone, action: opts.action }];
  const ts = typeof Date !== "undefined" ? Date.now() : 0;
  log = [{ id, message, tone, ts, read: false }, ...log].slice(0, LOG_CAP);
  emit();
  emitLog();
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
}
/** Empty the whole history. */
export function clearNotifications() {
  if (!log.length) return;
  log = [];
  emitLog();
}
/** Mark every notification read (clears the unread badge). */
export function markNotificationsRead() {
  if (!log.some((n) => !n.read)) return;
  log = log.map((n) => (n.read ? n : { ...n, read: true }));
  emitLog();
}
