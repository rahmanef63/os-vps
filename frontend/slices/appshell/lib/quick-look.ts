"use client";

import { useSyncExternalStore, type ComponentType } from "react";

// Quick Look — a lightweight preview overlay with a PREVIEWER REGISTRY.
// Apps publish a target (their current selection) via setQuickLookTarget;
// Space (or openQuickLook) shows the first registered previewer that claims
// it. Consumer-registered previewers outrank built-ins (searched newest-first).

export type QuickLookPreviewer = {
  id: string;
  canPreview: (target: unknown) => boolean;
  render: ComponentType<{ target: unknown }>;
};

let previewers: QuickLookPreviewer[] = [];

/** Register a previewer (newest wins on overlap). Returns an unregister fn. */
export function registerPreviewer(p: QuickLookPreviewer): () => void {
  previewers = [p, ...previewers.filter((x) => x.id !== p.id)];
  return () => {
    previewers = previewers.filter((x) => x !== p);
  };
}

export function previewerFor(target: unknown): QuickLookPreviewer | undefined {
  return previewers.find((p) => {
    try {
      return p.canPreview(target);
    } catch {
      return false;
    }
  });
}

type QuickLookState = { open: boolean; target: unknown };

let state: QuickLookState = { open: false, target: null };
const subs = new Set<() => void>();

function set(next: QuickLookState) {
  state = next;
  subs.forEach((f) => f());
}

/** Apps publish their current selection here (null when it goes away). */
export function setQuickLookTarget(target: unknown): void {
  set({ target, open: target == null ? false : state.open });
}

export function openQuickLook(target?: unknown): void {
  const t = target === undefined ? state.target : target;
  if (t == null) return;
  set({ open: true, target: t });
}

export function closeQuickLook(): void {
  if (state.open) set({ ...state, open: false });
}

export function toggleQuickLook(): void {
  if (state.open) closeQuickLook();
  else openQuickLook();
}

export function useQuickLook(): QuickLookState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => state,
    () => state,
  );
}
