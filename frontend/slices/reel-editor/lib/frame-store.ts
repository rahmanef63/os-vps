"use client";

import { useSyncExternalStore } from "react";

// Playhead frame lives OUTSIDE React so the rAF-driven playback loop can advance
// it at 60 fps without re-rendering the whole reel-editor slice. Components that
// need the current frame subscribe via useFrame(); the others (timeline lanes,
// files pane, layer panels) never re-render on a tick. Pattern mirrors the
// appshell pub/sub stores (focus-mode, badges, recents).

let frame = 30;
const subs = new Set<() => void>();

export function getFrame(): number {
  return frame;
}

export function setFrame(next: number): void {
  if (next === frame) return;
  frame = next;
  subs.forEach((cb) => cb());
}

export function subscribeFrame(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function useFrame(): number {
  return useSyncExternalStore(subscribeFrame, getFrame, getFrame);
}

// Reset to a known starting frame (used by "new project").
export function resetFrame(to = 30): void {
  setFrame(to);
}
