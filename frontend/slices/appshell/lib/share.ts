"use client";

import { useSyncExternalStore } from "react";
import { copyClip } from "./clipboard";

// Share sheet — a TARGET REGISTRY: apps call share(payload); every registered
// target that claims the payload shows up in the sheet (bundled share feature).
// Consumers add targets (send to an app, publish, export…); two generic ones
// ship built-in: copy-as-text and download-as-file.

export type ShareTarget = {
  id: string;
  label: string;
  canShare: (payload: unknown) => boolean;
  run: (payload: unknown) => void | Promise<void>;
};

let targets: ShareTarget[] = [];

/** Register a share target (newest first). Returns an unregister fn. */
export function registerShareTarget(t: ShareTarget): () => void {
  targets = [t, ...targets.filter((x) => x.id !== t.id)];
  return () => {
    targets = targets.filter((x) => x !== t);
  };
}

export function targetsFor(payload: unknown): ShareTarget[] {
  return targets.filter((t) => {
    try {
      return t.canShare(payload);
    } catch {
      return false;
    }
  });
}

type ShareState = { open: boolean; payload: unknown };
let state: ShareState = { open: false, payload: null };
const subs = new Set<() => void>();

function set(next: ShareState) {
  state = next;
  subs.forEach((f) => f());
}

/** Open the share sheet for a payload (no-op when nothing can take it). */
export function share(payload: unknown): boolean {
  if (targetsFor(payload).length === 0) return false;
  set({ open: true, payload });
  return true;
}

export function closeShare(): void {
  if (state.open) set({ ...state, open: false });
}

export function useShareState(): ShareState {
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

// ── built-in generic targets ────────────────────────────────────────────────
function asText(payload: unknown): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

registerShareTarget({
  id: "download-file",
  label: "Download as file",
  canShare: (p) => p != null,
  run: (p) => {
    const blob = new Blob([asText(p)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shared.txt";
    a.click();
    URL.revokeObjectURL(url);
  },
});

registerShareTarget({
  id: "copy-text",
  label: "Copy as text",
  canShare: (p) => p != null,
  run: (p) => copyClip(asText(p)), // lands in clipboard + history, with its own toast
});
